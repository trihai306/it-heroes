"""Unified Team Orchestrator — single service for all agent team management.

Replaces both TeamManager (CLI Agent Teams) and AgentOrchestrator (SDK subagents)
with a unified approach:

1. SDK mode (preferred): Uses claude_agent_sdk.query() with AgentDefinition subagents
2. CLI mode (fallback): Uses Claude CLI with AGENT_TEAMS env var

All agents (lead + teammates) are fully tracked in the database,
visible in the 3D office, and streamed via WebSocket.
"""

import asyncio
import json
import logging
import os
import signal
import shutil
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Session, select

from config import settings
from models.agent import Agent, AgentRole, AgentStatus
from models.session import AgentSession, SessionStatus
from models.task import Task, TaskStatus
from services.git_workspace import GitWorkspaceManager
from services.task_dispatcher import TaskDispatcher
from services.team_presets import TEAM_PRESETS, get_preset_summary
from websocket.manager import ConnectionManager
from websocket.events import (
    WSEvent,
    EVENT_AGENT_STATUS,
    EVENT_TASK_UPDATED,
    EVENT_LOG_APPEND,
    EVENT_TOOL_EXECUTION,
    EVENT_SESSION_RESULT,
    EVENT_TEAM_CREATED,
    EVENT_TEAM_AGENT_SPAWNED,
    EVENT_TEAM_AGENT_COMPLETED,
    EVENT_TEAM_TASK_DELEGATED,
    EVENT_TEAM_MESSAGE,
)

logger = logging.getLogger(__name__)


# ─── Bash security hook ──────────────────────────────────────────────

BLOCKED_COMMANDS = {
    "rm -rf /", "rm -rf /*", "mkfs", "dd if=",
    ":(){:|:&};:", "chmod -R 777 /",
    "curl | sh", "wget | sh", "curl | bash", "wget | bash",
}


async def _bash_security_hook(input_data, tool_use_id, context):
    """PreToolUse hook: validate bash commands before execution."""
    tool_input = input_data.get("tool_input", {})
    command = tool_input.get("command", "")
    cmd_lower = command.strip().lower()
    for blocked in BLOCKED_COMMANDS:
        if blocked in cmd_lower:
            logger.warning(f"Blocked dangerous command: {command[:100]}")
            return {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": f"Command blocked: {blocked}",
                }
            }
    return {}


# ─── Team State Tracker ──────────────────────────────────────────────

class TeamState:
    """Tracks runtime state for one team."""

    def __init__(self, project_id: int, team_name: str, preset_id: Optional[str] = None):
        self.project_id = project_id
        self.team_name = team_name
        self.preset_id = preset_id
        self.lead_agent_id: Optional[int] = None
        self.agent_ids: list[int] = []
        self.started_at = datetime.now(timezone.utc)
        self.output_lines: dict[int, list[dict]] = {}  # agent_id -> lines
        # SDK session management
        self.command_queue: asyncio.Queue = asyncio.Queue()
        self.stop_event: asyncio.Event = asyncio.Event()


# ─── Unified Team Orchestrator ───────────────────────────────────────

class UnifiedTeamOrchestrator:
    """
    Central coordinator for agent teams.

    Supports two modes:
    - SDK: Uses query() with AgentDefinition subagents
    - CLI: Uses Claude CLI with AGENT_TEAMS env var (fallback)
    """

    def __init__(self, ws_manager: ConnectionManager):
        self.ws = ws_manager
        self.git = GitWorkspaceManager(settings.WORKTREE_BASE)
        self.dispatcher = TaskDispatcher()
        self._teams: dict[int, TeamState] = {}  # project_id -> TeamState
        self._session_ids: dict[int, Optional[str]] = {}  # project_id -> SDK session_id
        self._cli_processes: dict[int, asyncio.subprocess.Process] = {}  # project_id -> Process
        self._monitors: dict[int, asyncio.Task] = {}  # project_id -> monitor task
        self._agent_monitors: dict[int, asyncio.Task] = {}  # agent_id -> monitor task

    # ─── SDK availability check ───────────────────────────────────

    @staticmethod
    def _sdk_available() -> bool:
        try:
            import claude_agent_sdk  # noqa: F401
            return True
        except ImportError:
            return False

    # ═══════════════════════════════════════════════════════════════
    # TEAM LIFECYCLE
    # ═══════════════════════════════════════════════════════════════

    async def create_team_from_preset(
        self,
        db: Session,
        project_id: int,
        preset_id: str,
        repo_path: str,
        project_name: str,
        model: str = "",
    ) -> dict:
        """
        Create a team from a predefined preset.

        1. Create all Agent DB records (lead + teammates)
        2. Create git worktrees for each agent
        3. Return agent list
        4. Start SDK query with subagent definitions
        5. Broadcast team.created event
        """
        preset = TEAM_PRESETS.get(preset_id)
        if not preset:
            return {"error": f"Unknown preset: {preset_id}"}

        # Clean up any existing team
        await self.cleanup_team(db, project_id)

        lead_model = model or settings.CLAUDE_MODEL
        team_name = f"{project_name}-{preset_id}"

        # 1. Create all Agent DB records
        agents = []
        for agent_def in preset["db_agents"]:
            agent = Agent(
                project_id=project_id,
                name=agent_def["name"],
                role=AgentRole(agent_def["role"]),
                avatar_key=agent_def["avatar_key"],
                is_lead=agent_def["is_lead"],
                team_name=team_name,
                model=lead_model if agent_def["is_lead"] else settings.SUBAGENT_MODEL,
                sdk_agent_key=agent_def["sdk_agent_key"],
                orchestration_mode="sdk" if self._sdk_available() else "cli",
                status=AgentStatus.IDLE,
            )
            db.add(agent)
            agents.append(agent)
        db.commit()
        for a in agents:
            db.refresh(a)

        # Set parent_agent_id for non-lead agents
        lead = next(a for a in agents if a.is_lead)
        for a in agents:
            if not a.is_lead:
                a.parent_agent_id = lead.id
                db.add(a)
        db.commit()

        # 2. Create worktrees + sessions
        for agent in agents:
            try:
                wt = self.git.create_worktree(repo_path, agent.id, project_name)
                session = AgentSession(
                    agent_id=agent.id,
                    status=SessionStatus.IDLE,
                    worktree_path=wt["worktree_path"],
                    branch_name=wt["branch_name"],
                )
                db.add(session)
            except RuntimeError as e:
                logger.error(f"Worktree creation failed for agent-{agent.id}: {e}")
        db.commit()

        # 3. Init simulation
        # 4. Track team state
        state = TeamState(project_id, team_name, preset_id)
        state.lead_agent_id = lead.id
        state.agent_ids = [a.id for a in agents]
        self._teams[project_id] = state

        # 5. Start SDK or CLI session
        initial_prompt = (
            f"You are leading a {preset['name']}. "
            f"Coordinate with your subagents to accomplish the team's goals. "
            f"Delegate tasks as appropriate."
        )
        if self._sdk_available():
            await self._start_sdk_preset_session(
                db, project_id, lead, preset, agents, initial_prompt,
            )
        else:
            await self._start_cli_session(db, project_id, lead, initial_prompt, repo_path)

        # 6. Broadcast team created
        await self.ws.broadcast(
            project_id,
            WSEvent(
                type=EVENT_TEAM_CREATED,
                data={
                    "team_name": team_name,
                    "preset_id": preset_id,
                    "agents": [_agent_dict(a) for a in agents],
                },
            ),
        )

        logger.info(
            f"Team '{team_name}' created: {len(agents)} agents "
            f"(preset={preset_id}, mode={'sdk' if self._sdk_available() else 'cli'})"
        )

        return {
            "team_name": team_name,
            "preset_id": preset_id,
            "lead_id": lead.id,
            "agents": [_agent_dict(a) for a in agents],
        }

    async def create_team_from_prompt(
        self,
        db: Session,
        project_id: int,
        prompt: str,
        team_name: str,
        repo_path: str,
        model: str = "",
    ) -> dict:
        """
        Create a team from a natural language prompt.

        Creates a lead agent, starts an SDK session, and lets Claude
        decide the team structure based on the prompt.
        """
        await self.cleanup_team(db, project_id)

        lead_model = model or settings.CLAUDE_MODEL

        # Create lead agent
        lead = Agent(
            project_id=project_id,
            name="Lead Agent",
            role=AgentRole.LEAD,
            avatar_key="lead",
            is_lead=True,
            team_name=team_name,
            model=lead_model,
            orchestration_mode="sdk" if self._sdk_available() else "cli",
            status=AgentStatus.IDLE,
        )
        db.add(lead)
        db.commit()
        db.refresh(lead)

        # Create worktree for lead
        try:
            wt = self.git.create_worktree(repo_path, lead.id, "project")
            session = AgentSession(
                agent_id=lead.id,
                status=SessionStatus.STARTING,
                worktree_path=wt["worktree_path"],
                branch_name=wt["branch_name"],
            )
            db.add(session)
            db.commit()
        except RuntimeError as e:
            logger.error(f"Worktree creation failed for lead: {e}")
            return {"error": str(e)}

        # Init simulation
        # Track state
        state = TeamState(project_id, team_name)
        state.lead_agent_id = lead.id
        state.agent_ids = [lead.id]
        self._teams[project_id] = state

        # Start SDK/CLI session with the prompt
        if self._sdk_available():
            await self._start_sdk_prompt_session(db, project_id, lead, prompt, wt["worktree_path"])
        else:
            await self._start_cli_session(db, project_id, lead, prompt, repo_path)

        await self.ws.broadcast(
            project_id,
            WSEvent(
                type=EVENT_TEAM_CREATED,
                data={
                    "team_name": team_name,
                    "agents": [_agent_dict(lead)],
                },
            ),
        )

        return {
            "team_name": team_name,
            "lead_id": lead.id,
            "agents": [_agent_dict(lead)],
        }

    # ═══════════════════════════════════════════════════════════════
    # TASK DISPATCH
    # ═══════════════════════════════════════════════════════════════

    async def dispatch_tasks(
        self,
        db: Session,
        project_id: int,
        repo_path: str,
        project_name: str,
    ) -> list[dict]:
        """Auto-assign tasks to agents and start them."""
        assignments = self.dispatcher.auto_assign(db, project_id)
        started = []

        for assignment in assignments:
            agent = db.get(Agent, assignment["agent_id"])
            task = db.get(Task, assignment["task_id"])
            if agent and task:
                try:
                    await self.start_agent_on_task(db, agent, task, project_name, repo_path)
                    started.append(assignment)
                except Exception as e:
                    logger.error(f"Failed to start agent-{agent.id}: {e}")

        return started

    async def start_agent_on_task(
        self,
        db: Session,
        agent: Agent,
        task: Task,
        project_name: str,
        repo_path: str,
    ) -> AgentSession:
        """Start a single agent on a specific task."""
        # Get or create session
        session = db.exec(
            select(AgentSession).where(AgentSession.agent_id == agent.id)
        ).first()

        if not session:
            wt = self.git.create_worktree(repo_path, agent.id, project_name)
            session = AgentSession(
                agent_id=agent.id,
                status=SessionStatus.STARTING,
                worktree_path=wt["worktree_path"],
                branch_name=wt["branch_name"],
            )
            db.add(session)
            db.commit()
            db.refresh(session)

        # Update task
        task.status = TaskStatus.IN_PROGRESS
        task.assigned_agent_id = agent.id
        db.add(task)

        # Update agent status
        agent.status = AgentStatus.WORKING
        db.add(agent)
        db.commit()

        await self._emit_agent_status(agent.project_id, agent.id, "working", f"Working on: {task.title}")
        await self._emit_task_update(agent.project_id, task)

        # Build prompt
        prompt = self.dispatcher.build_prompt(task)

        # Start SDK session for this agent
        if self._sdk_available() and session.worktree_path:
            await self._start_sdk_agent_session(db, agent, session, prompt)
        else:
            await self._start_cli_agent_session(db, agent, session, prompt, repo_path)

        return session

    # ═══════════════════════════════════════════════════════════════
    # SDK MODE
    # ═══════════════════════════════════════════════════════════════

    async def _start_sdk_preset_session(
        self,
        db: Session,
        project_id: int,
        lead: Agent,
        preset: dict,
        agents: list[Agent],
        initial_prompt: str,
    ):
        """Build SDK options from preset and start monitoring query."""
        from claude_agent_sdk import ClaudeAgentOptions, AgentDefinition, HookMatcher

        # Build AgentDefinition dict from preset
        agent_definitions = {}
        for key, agent_cfg in preset["agents"].items():
            matching_agent = next((a for a in agents if a.sdk_agent_key == key), None)
            if not matching_agent:
                continue
            matching_session = db.exec(
                select(AgentSession).where(AgentSession.agent_id == matching_agent.id)
            ).first()

            wt_path = matching_session.worktree_path if matching_session else ""
            enhanced_prompt = (
                f"{agent_cfg['prompt']}\n\n"
                f"Your working directory is: {wt_path}\n"
                f"All file operations must be within this directory."
            )
            agent_definitions[key] = AgentDefinition(
                description=agent_cfg["description"],
                prompt=enhanced_prompt,
                tools=agent_cfg.get("tools"),
                model=agent_cfg.get("model", "sonnet"),
            )

        # Get lead worktree
        lead_session = db.exec(
            select(AgentSession).where(AgentSession.agent_id == lead.id)
        ).first()

        options = ClaudeAgentOptions(
            model=lead.model,
            system_prompt=preset["lead_prompt"],
            allowed_tools=settings.AGENT_SDK_ALLOWED_TOOLS + ["Task"],
            permission_mode="acceptEdits",
            cwd=lead_session.worktree_path if lead_session else ".",
            max_turns=settings.AGENT_SDK_MAX_TURNS,
            agents=agent_definitions,
            hooks={
                "PreToolUse": [HookMatcher(matcher="Bash", hooks=[_bash_security_hook])],
                "SubagentStop": [HookMatcher(hooks=[
                    self._make_subagent_stop_hook(project_id, agents),
                ])],
                "PostToolUse": [HookMatcher(matcher="Task", hooks=[
                    self._make_task_delegation_hook(project_id, agents),
                ])],
            },
        )

        # Update lead status
        lead.status = AgentStatus.WORKING
        db.add(lead)
        if lead_session:
            lead_session.status = SessionStatus.RUNNING
            db.add(lead_session)
        db.commit()

        # Start monitoring query
        monitor = asyncio.create_task(
            self._monitor_sdk_session(db, project_id, lead, options, initial_prompt)
        )
        self._monitors[project_id] = monitor

    async def _start_sdk_prompt_session(
        self,
        db: Session,
        project_id: int,
        lead: Agent,
        prompt: str,
        working_dir: str,
    ):
        """Build SDK options from prompt and start monitoring query."""
        from claude_agent_sdk import ClaudeAgentOptions, HookMatcher

        options = ClaudeAgentOptions(
            model=lead.model,
            system_prompt=(
                "You are a lead developer. Analyze the task and coordinate work. "
                "Use the Task tool to delegate subtasks to subagents when needed."
            ),
            allowed_tools=settings.AGENT_SDK_ALLOWED_TOOLS + ["Task"],
            permission_mode="acceptEdits",
            cwd=working_dir,
            max_turns=settings.AGENT_SDK_MAX_TURNS,
            hooks={
                "PreToolUse": [HookMatcher(matcher="Bash", hooks=[_bash_security_hook])],
            },
        )

        lead.status = AgentStatus.WORKING
        db.add(lead)
        lead_session = db.exec(
            select(AgentSession).where(AgentSession.agent_id == lead.id)
        ).first()
        if lead_session:
            lead_session.status = SessionStatus.RUNNING
            db.add(lead_session)
        db.commit()

        monitor = asyncio.create_task(
            self._monitor_sdk_session(db, project_id, lead, options, prompt)
        )
        self._monitors[project_id] = monitor

    async def _start_sdk_agent_session(
        self,
        db: Session,
        agent: Agent,
        session: AgentSession,
        prompt: str,
    ):
        """Build SDK options and start monitoring query for a single agent."""
        from claude_agent_sdk import ClaudeAgentOptions, HookMatcher
        from services.agent_sdk_adapter import ROLE_PROMPTS

        role_desc = ROLE_PROMPTS.get(agent.role.value, ROLE_PROMPTS.get("backend", ""))
        system_prompt = (
            f"{role_desc}\n\n"
            f"Your working directory is: {session.worktree_path}\n"
            f"After completing work, summarize what you did."
        )

        options = ClaudeAgentOptions(
            model=agent.model,
            system_prompt=system_prompt,
            allowed_tools=settings.AGENT_SDK_ALLOWED_TOOLS,
            permission_mode="acceptEdits",
            cwd=session.worktree_path,
            max_turns=settings.AGENT_SDK_MAX_TURNS,
            hooks={
                "PreToolUse": [HookMatcher(matcher="Bash", hooks=[_bash_security_hook])],
            },
        )

        session.status = SessionStatus.RUNNING
        db.add(session)
        db.commit()

        monitor = asyncio.create_task(
            self._monitor_sdk_agent(db, agent, session, prompt, options)
        )
        self._agent_monitors[agent.id] = monitor

    # ═══════════════════════════════════════════════════════════════
    # CLI FALLBACK
    # ═══════════════════════════════════════════════════════════════

    async def _start_cli_session(
        self,
        db: Session,
        project_id: int,
        lead: Agent,
        prompt: str,
        repo_path: str,
    ):
        """Start CLI Agent Teams session as fallback."""
        resolved_cli = shutil.which(settings.CLAUDE_CLI)
        if not resolved_cli:
            logger.error(f"Claude CLI not found at '{settings.CLAUDE_CLI}'")
            return

        env = {**os.environ, "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"}
        cmd = [
            resolved_cli,
            "--print", "--output-format", "stream-json",
            "--teammate-mode", "in-process",
        ]
        if lead.model:
            cmd.extend(["--model", lead.model])
        cmd.extend(["-p", prompt])

        proc = await asyncio.create_subprocess_exec(
            *cmd, cwd=repo_path, env=env,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            stdin=asyncio.subprocess.PIPE,
            preexec_fn=os.setsid if os.name != "nt" else None,
        )
        self._cli_processes[project_id] = proc

        lead.status = AgentStatus.WORKING
        db.add(lead)
        lead_session = db.exec(
            select(AgentSession).where(AgentSession.agent_id == lead.id)
        ).first()
        if lead_session:
            lead_session.status = SessionStatus.RUNNING
            lead_session.pid = proc.pid
            db.add(lead_session)
        db.commit()

        monitor = asyncio.create_task(
            self._monitor_cli_session(db, project_id, lead, proc)
        )
        self._monitors[project_id] = monitor

    async def _start_cli_agent_session(
        self,
        db: Session,
        agent: Agent,
        session: AgentSession,
        prompt: str,
        repo_path: str,
    ):
        """Start a CLI subprocess for a single agent (non-teams mode)."""
        resolved_cli = shutil.which(settings.CLAUDE_CLI)
        if not resolved_cli:
            return

        cmd = [
            resolved_cli,
            "--print", "--output-format", "stream-json",
            "-p", prompt,
        ]
        if agent.model:
            cmd.extend(["--model", agent.model])

        proc = await asyncio.create_subprocess_exec(
            *cmd, cwd=session.worktree_path or repo_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            preexec_fn=os.setsid if os.name != "nt" else None,
        )

        session.status = SessionStatus.RUNNING
        session.pid = proc.pid
        db.add(session)
        db.commit()

        monitor = asyncio.create_task(
            self._monitor_cli_agent(db, agent, proc)
        )
        self._agent_monitors[agent.id] = monitor

    # ═══════════════════════════════════════════════════════════════
    # MONITORING — SDK
    # ═══════════════════════════════════════════════════════════════

    async def _monitor_sdk_session(
        self,
        db: Session,
        project_id: int,
        lead: Agent,
        options,
        initial_prompt: str,
    ):
        """Monitor an SDK lead session. Runs initial query, then waits for commands."""
        from claude_agent_sdk import (
            query, ClaudeAgentOptions,
            AssistantMessage, ResultMessage, SystemMessage,
            TextBlock, ToolUseBlock, ToolResultBlock,
        )

        state = self._teams.get(project_id)
        current_prompt = initial_prompt
        current_options = options

        try:
            while state and not state.stop_event.is_set():
                # ── Run a single SDK query ──────────────────────────
                async for message in query(prompt=current_prompt, options=current_options):
                    # Extract session_id from init message
                    if isinstance(message, SystemMessage):
                        sid = getattr(message, "session_id", None)
                        if sid:
                            self._session_ids[project_id] = sid
                        subtype = getattr(message, "subtype", "")
                        if subtype != "init":
                            await self._emit_log(project_id, lead.id, f"[{subtype}]", "system")

                    elif isinstance(message, AssistantMessage):
                        for block in message.content:
                            if isinstance(block, TextBlock):
                                await self._emit_log(project_id, lead.id, block.text, "text")
                            elif isinstance(block, ToolUseBlock):
                                await self._emit_log(
                                    project_id, lead.id,
                                    f"[{block.name}] {_summarize_tool(block.name, block.input)}",
                                    "tool_use",
                                )
                                await self._emit_tool_event(project_id, lead.id, {
                                    "type": "tool_use",
                                    "content": f"[{block.name}]",
                                    "raw": {"tool": block.name, "input": block.input},
                                })
                            elif isinstance(block, ToolResultBlock):
                                content = block.content
                                if isinstance(content, list):
                                    content = " ".join(
                                        b.get("text", "") for b in content if isinstance(b, dict)
                                    )
                                await self._emit_log(
                                    project_id, lead.id,
                                    str(content)[:300] if content else "",
                                    "tool_result",
                                )

                    elif isinstance(message, ResultMessage):
                        # Store session_id for resume
                        sid = getattr(message, "session_id", None)
                        if sid:
                            self._session_ids[project_id] = sid

                        # Update lead session with result metadata
                        lead_session = db.exec(
                            select(AgentSession).where(AgentSession.agent_id == lead.id)
                        ).first()
                        if lead_session:
                            lead_session.sdk_session_id = sid
                            lead_session.total_cost_usd = getattr(message, "total_cost_usd", None)
                            lead_session.num_turns = getattr(message, "num_turns", None)
                            lead_session.status = SessionStatus.IDLE
                            db.add(lead_session)

                        lead.status = AgentStatus.IDLE
                        db.add(lead)
                        db.commit()

                        await self.ws.broadcast(
                            project_id,
                            WSEvent(type=EVENT_SESSION_RESULT, data={
                                "agent_id": lead.id,
                                "num_turns": getattr(message, "num_turns", None),
                                "duration_ms": getattr(message, "duration_ms", None),
                                "total_cost_usd": getattr(message, "total_cost_usd", None),
                                "is_error": getattr(message, "is_error", False),
                            }),
                        )

                # ── Query finished — wait for follow-up commands ───
                await self._emit_agent_status(project_id, lead.id, "idle", "Ready for commands")

                # Wait for a command from the queue, checking stop_event periodically
                next_cmd = None
                while state and not state.stop_event.is_set():
                    try:
                        next_cmd = await asyncio.wait_for(
                            state.command_queue.get(), timeout=5.0,
                        )
                        break
                    except asyncio.TimeoutError:
                        continue

                if next_cmd is None or state.stop_event.is_set():
                    break

                # Resume session with new command
                session_id = self._session_ids.get(project_id)
                if session_id:
                    current_prompt = next_cmd
                    current_options = ClaudeAgentOptions(resume=session_id)
                    lead.status = AgentStatus.WORKING
                    db.add(lead)
                    db.commit()
                    await self._emit_agent_status(
                        project_id, lead.id, "working", "Processing command",
                    )
                else:
                    logger.warning(f"No session_id to resume for project-{project_id}")
                    break

        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"SDK session error for project-{project_id}: {e}", exc_info=True)
            await self._emit_agent_status(project_id, lead.id, "failed", str(e))
        finally:
            self._session_ids.pop(project_id, None)

            # Commit any worktree changes
            for agent_id in (state.agent_ids if state else []):
                session = db.exec(
                    select(AgentSession).where(AgentSession.agent_id == agent_id)
                ).first()
                if session and session.worktree_path:
                    agent = db.get(Agent, agent_id)
                    self.git.commit_changes(
                        session.worktree_path,
                        f"[chibi] {agent.name if agent else 'agent'} changes",
                        agent.name if agent else "Chibi Agent",
                    )

    async def _monitor_sdk_agent(
        self,
        db: Session,
        agent: Agent,
        session: AgentSession,
        prompt: str,
        options,
    ):
        """Monitor an individual SDK agent session (single query)."""
        from claude_agent_sdk import (
            query, AssistantMessage, ResultMessage, TextBlock, ToolUseBlock,
        )

        try:
            async for message in query(prompt=prompt, options=options):
                if isinstance(message, AssistantMessage):
                    for block in message.content:
                        if isinstance(block, TextBlock):
                            await self._emit_log(agent.project_id, agent.id, block.text, "text")
                        elif isinstance(block, ToolUseBlock):
                            await self._emit_log(
                                agent.project_id, agent.id,
                                f"[{block.name}] {_summarize_tool(block.name, block.input)}",
                                "tool_use",
                            )

                elif isinstance(message, ResultMessage):
                    session.sdk_session_id = getattr(message, "session_id", None)
                    session.total_cost_usd = getattr(message, "total_cost_usd", None)
                    session.num_turns = getattr(message, "num_turns", None)
                    session.status = SessionStatus.IDLE
                    db.add(session)

                    agent.status = AgentStatus.IDLE
                    db.add(agent)
                    db.commit()

                    # Commit changes
                    if session.worktree_path:
                        self.git.commit_changes(
                            session.worktree_path,
                            f"[chibi] {agent.name} work",
                            agent.name,
                        )

                    await self._emit_agent_status(
                        agent.project_id, agent.id, "idle", "Task completed"
                    )

        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"SDK agent-{agent.id} error: {e}", exc_info=True)
            await self._emit_agent_status(agent.project_id, agent.id, "failed", str(e))

    # ═══════════════════════════════════════════════════════════════
    # MONITORING — CLI
    # ═══════════════════════════════════════════════════════════════

    async def _monitor_cli_session(
        self,
        db: Session,
        project_id: int,
        lead: Agent,
        proc: asyncio.subprocess.Process,
    ):
        """Monitor CLI lead session, parse teammate events."""
        state = self._teams.get(project_id)

        async def _read_stream(stream, source: str):
            try:
                async for raw_line in stream:
                    line = raw_line.decode("utf-8", errors="replace").strip()
                    if not line:
                        continue

                    try:
                        data = json.loads(line)
                        event_type = data.get("type", "text")
                        content = data.get("content", data.get("text", line))

                        # Detect teammate lifecycle events
                        if event_type == "teammate_spawned" and state:
                            await self._handle_cli_teammate_spawned(db, project_id, data, state)
                        elif event_type == "teammate_stopped" and state:
                            await self._handle_cli_teammate_stopped(db, project_id, data)

                        await self._emit_log(project_id, lead.id, content, event_type)

                    except json.JSONDecodeError:
                        await self._emit_log(project_id, lead.id, line, source)

            except asyncio.CancelledError:
                pass
            except Exception as e:
                logger.error(f"CLI monitor {source} error: {e}")

        try:
            await asyncio.gather(
                _read_stream(proc.stdout, "stdout"),
                _read_stream(proc.stderr, "stderr"),
            )
        except asyncio.CancelledError:
            pass

        # Session ended
        lead.status = AgentStatus.IDLE
        db.add(lead)
        db.commit()

        await self.ws.broadcast(
            project_id,
            WSEvent(type="team.stopped", data={
                "exit_code": proc.returncode,
                "project_id": project_id,
            }),
        )

    async def _monitor_cli_agent(self, db: Session, agent: Agent, proc: asyncio.subprocess.Process):
        """Monitor a single CLI agent subprocess."""
        try:
            async for raw_line in proc.stdout:
                line = raw_line.decode("utf-8", errors="replace").strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                    content = data.get("content", data.get("text", line))
                    await self._emit_log(agent.project_id, agent.id, content, data.get("type", "text"))
                except json.JSONDecodeError:
                    await self._emit_log(agent.project_id, agent.id, line, "text")
        except asyncio.CancelledError:
            pass

        # Commit changes
        session = db.exec(select(AgentSession).where(AgentSession.agent_id == agent.id)).first()
        if session and session.worktree_path:
            self.git.commit_changes(session.worktree_path, f"[chibi] {agent.name}", agent.name)
            session.status = SessionStatus.IDLE
            db.add(session)

        agent.status = AgentStatus.IDLE
        db.add(agent)
        db.commit()
        await self._emit_agent_status(agent.project_id, agent.id, "idle", "Completed")

    async def _handle_cli_teammate_spawned(self, db, project_id, data, state):
        """When CLI detects a new teammate, create Agent DB record."""
        name = data.get("name", "Teammate")
        role_str = data.get("role", "custom")
        try:
            role = AgentRole(role_str)
        except ValueError:
            role = AgentRole.CUSTOM

        agent = Agent(
            project_id=project_id,
            name=name,
            role=role,
            avatar_key=role_str,
            is_lead=False,
            team_name=state.team_name,
            parent_agent_id=state.lead_agent_id,
            orchestration_mode="cli",
            status=AgentStatus.WORKING,
        )
        db.add(agent)
        db.commit()
        db.refresh(agent)
        state.agent_ids.append(agent.id)


        await self.ws.broadcast(
            project_id,
            WSEvent(type=EVENT_TEAM_AGENT_SPAWNED, data=_agent_dict(agent)),
        )

    async def _handle_cli_teammate_stopped(self, db, project_id, data):
        """When CLI detects teammate stopped, update DB."""
        name = data.get("name", "")
        agent = db.exec(
            select(Agent).where(Agent.project_id == project_id, Agent.name == name)
        ).first()
        if agent:
            agent.status = AgentStatus.IDLE
            db.add(agent)
            db.commit()
            await self.ws.broadcast(
                project_id,
                WSEvent(type=EVENT_TEAM_AGENT_COMPLETED, data={"agent_id": agent.id}),
            )

    # ═══════════════════════════════════════════════════════════════
    # HOOKS
    # ═══════════════════════════════════════════════════════════════

    def _make_subagent_stop_hook(self, project_id: int, agents: list[Agent]):
        """Create a SubagentStop hook that updates agent status."""
        async def hook(input_data, tool_use_id, context):
            # Try to identify which subagent stopped
            for agent in agents:
                if not agent.is_lead and agent.status == AgentStatus.WORKING:
                    agent.status = AgentStatus.IDLE
                    # Note: DB commit happens in main monitor
                    await self.ws.broadcast(
                        project_id,
                        WSEvent(type=EVENT_TEAM_AGENT_COMPLETED, data={
                            "agent_id": agent.id,
                            "name": agent.name,
                        }),
                    )
                    break
            return {}
        return hook

    def _make_task_delegation_hook(self, project_id: int, agents: list[Agent]):
        """Create a PostToolUse hook for Task tool delegation tracking."""
        async def hook(input_data, tool_use_id, context):
            tool_input = input_data.get("tool_input", {})
            subagent_type = tool_input.get("subagent_type", "")
            description = tool_input.get("description", "")

            # Find matching agent by sdk_agent_key
            for agent in agents:
                if agent.sdk_agent_key == subagent_type:
                    agent.status = AgentStatus.WORKING
                    await self.ws.broadcast(
                        project_id,
                        WSEvent(type=EVENT_TEAM_TASK_DELEGATED, data={
                            "from_agent_id": self._teams[project_id].lead_agent_id,
                            "to_agent_id": agent.id,
                            "to_agent_name": agent.name,
                            "description": description,
                        }),
                    )
                    await self._emit_agent_status(
                        project_id, agent.id, "working", f"Delegated: {description}"
                    )
                    break
            return {}
        return hook

    # ═══════════════════════════════════════════════════════════════
    # COMMUNICATION
    # ═══════════════════════════════════════════════════════════════

    async def send_command_to_lead(self, project_id: int, message: str) -> dict:
        """Send command to lead agent.

        SDK mode: queue the command for the monitor loop to pick up and
        resume the session with it.
        CLI mode: write to stdin of the running process.
        """
        state = self._teams.get(project_id)
        if not state:
            return {"error": "No active team"}

        # SDK mode: put command in the team's queue
        if state.command_queue is not None:
            await state.command_queue.put(message)
            return {"sent": True}

        # CLI mode: write to stdin
        proc = self._cli_processes.get(project_id)
        if proc and proc.returncode is None:
            try:
                proc.stdin.write(f"{message}\n".encode())
                await proc.stdin.drain()
                return {"sent": True}
            except Exception as e:
                return {"error": str(e)}

        return {"error": "No active session"}

    async def broadcast_message(self, project_id: int, message: str) -> dict:
        """Broadcast message to all agents."""
        return await self.send_command_to_lead(project_id, f"Broadcast to all teammates: {message}")

    async def send_message(self, project_id: int, to_agent_name: str, message: str) -> dict:
        """Send message to specific agent."""
        return await self.send_command_to_lead(
            project_id, f"Send a message to {to_agent_name}: {message}"
        )

    # ═══════════════════════════════════════════════════════════════
    # CLEANUP
    # ═══════════════════════════════════════════════════════════════

    async def cleanup_team(self, db: Session, project_id: int) -> dict:
        """Stop all agents, clean worktrees, remove DB records."""
        state = self._teams.pop(project_id, None)

        # Signal SDK monitor to stop
        if state:
            state.stop_event.set()

        # Cancel SDK monitors (gracefully stops the running query)
        monitor = self._monitors.pop(project_id, None)
        if monitor and not monitor.done():
            monitor.cancel()
            try:
                await monitor
            except asyncio.CancelledError:
                pass

        # Cancel agent monitors
        agents = db.exec(select(Agent).where(Agent.project_id == project_id)).all()
        for agent in agents:
            m = self._agent_monitors.pop(agent.id, None)
            if m and not m.done():
                m.cancel()
                try:
                    await m
                except asyncio.CancelledError:
                    pass

        # Clean session IDs
        self._session_ids.pop(project_id, None)

        # Stop CLI processes
        proc = self._cli_processes.pop(project_id, None)
        if proc and proc.returncode is None:
            try:
                if os.name != "nt":
                    os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
                else:
                    proc.terminate()
                await asyncio.wait_for(proc.wait(), timeout=5.0)
            except (ProcessLookupError, asyncio.TimeoutError):
                try:
                    if os.name != "nt":
                        os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
                    else:
                        proc.kill()
                except ProcessLookupError:
                    pass

        # Clean worktrees
        from models.project import Project
        project = db.get(Project, project_id)
        if project:
            self.git.cleanup_all(project.repo_path)

        # Remove agents from DB
        for agent in agents:
            db.delete(agent)

        # Remove sessions
        for agent in agents:
            sessions = db.exec(
                select(AgentSession).where(AgentSession.agent_id == agent.id)
            ).all()
            for s in sessions:
                db.delete(s)
        db.commit()


        logger.info(f"Team cleaned up for project-{project_id}")
        return {"cleaned": True, "project_id": project_id}

    async def shutdown_all(self):
        """Shutdown all teams (called on app exit)."""
        for project_id in list(self._teams.keys()):
            try:
                state = self._teams.get(project_id)
                if state:
                    state.stop_event.set()

                # Cancel monitors
                monitor = self._monitors.pop(project_id, None)
                if monitor and not monitor.done():
                    monitor.cancel()

                # Cancel agent monitors
                for agent_id in list(self._agent_monitors.keys()):
                    m = self._agent_monitors.pop(agent_id, None)
                    if m and not m.done():
                        m.cancel()

                # Stop CLI processes
                proc = self._cli_processes.pop(project_id, None)
                if proc and proc.returncode is None:
                    proc.terminate()
            except Exception:
                pass

        self._teams.clear()
        self._session_ids.clear()
        logger.info("All teams shut down")

    # ═══════════════════════════════════════════════════════════════
    # STATUS
    # ═══════════════════════════════════════════════════════════════

    def get_team_status(self, db: Session, project_id: int) -> dict:
        """Get full team status including all agents."""
        state = self._teams.get(project_id)
        agents = db.exec(select(Agent).where(Agent.project_id == project_id)).all()

        agent_list = []
        for agent in agents:
            session = db.exec(
                select(AgentSession).where(AgentSession.agent_id == agent.id)
                .order_by(AgentSession.started_at.desc())
            ).first()

            agent_list.append({
                **_agent_dict(agent),
                "session_status": session.status.value if session else "none",
                "worktree": session.worktree_path if session else None,
                "branch": session.branch_name if session else None,
                "sdk_session_id": session.sdk_session_id if session else None,
                "total_cost_usd": session.total_cost_usd if session else None,
                "num_turns": session.num_turns if session else None,
            })

        return {
            "active": state is not None,
            "team_name": state.team_name if state else None,
            "preset_id": state.preset_id if state else None,
            "agents": agent_list,
            "agent_count": len(agents),
        }

    def get_presets(self) -> list[dict]:
        """Return available team presets."""
        return get_preset_summary()

    async def check_prerequisites(self) -> dict:
        """Check required tools."""
        sdk_ok = self._sdk_available()
        cli_ok = shutil.which(settings.CLAUDE_CLI) is not None
        return {
            "agent_sdk": sdk_ok,
            "claude_cli": cli_ok,
            "recommended_mode": "sdk" if sdk_ok else ("cli" if cli_ok else "none"),
        }

    # ═══════════════════════════════════════════════════════════════
    # HELPERS
    # ═══════════════════════════════════════════════════════════════


    async def _emit_agent_status(self, project_id, agent_id, status, message=""):
        await self.ws.broadcast(
            project_id,
            WSEvent(type=EVENT_AGENT_STATUS, data={
                "agent_id": agent_id, "status": status, "message": message,
            }),
        )

    async def _emit_task_update(self, project_id, task):
        await self.ws.broadcast(
            project_id,
            WSEvent(type=EVENT_TASK_UPDATED, data={
                "task_id": task.id, "title": task.title,
                "status": task.status.value if isinstance(task.status, TaskStatus) else task.status,
                "assigned_agent_id": task.assigned_agent_id,
            }),
        )

    async def _emit_log(self, project_id, agent_id, message, level="info"):
        await self.ws.broadcast(
            project_id,
            WSEvent(type=EVENT_LOG_APPEND, data={
                "agent_id": agent_id, "message": message, "level": level,
            }),
        )

    async def _emit_tool_event(self, project_id, agent_id, event):
        await self.ws.broadcast(
            project_id,
            WSEvent(type=EVENT_TOOL_EXECUTION, data={
                "agent_id": agent_id,
                "event_type": event.get("type"),
                "content": event.get("content", ""),
                "raw": event.get("raw"),
            }),
        )


# ─── Utility ─────────────────────────────────────────────────────────

def _agent_dict(agent: Agent) -> dict:
    return {
        "id": agent.id,
        "project_id": agent.project_id,
        "name": agent.name,
        "role": agent.role.value,
        "avatar_key": agent.avatar_key,
        "status": agent.status.value,
        "is_lead": agent.is_lead,
        "team_name": agent.team_name,
        "model": agent.model,
        "parent_agent_id": agent.parent_agent_id,
        "sdk_agent_key": agent.sdk_agent_key,
    }


def _summarize_tool(tool_name: str, tool_input: dict) -> str:
    if tool_name == "Bash":
        return tool_input.get("command", "")[:100]
    elif tool_name in ("Read", "Write", "Edit"):
        return tool_input.get("file_path", "")[:100]
    elif tool_name == "Task":
        return tool_input.get("description", "")[:100]
    else:
        return json.dumps(tool_input)[:100]
