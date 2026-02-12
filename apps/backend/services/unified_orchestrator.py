"""Unified Team Orchestrator — CLI Agent Teams only.

Uses Claude Code CLI with --teammate-mode in-process to create real Agent Teams.
Each agent is a separate CLI instance managed by the lead session.

Monitors:
- CLI stdout (streaming JSON) for real-time output
- ~/.claude/teams/{name}/ files for team config and inbox changes
- ~/.claude/tasks/ for shared task list changes
"""

import asyncio
import json
import logging
import os
import signal
import shutil
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from config import settings
from database import engine as db_engine
from models.agent import Agent, AgentRole, AgentStatus
from models.session import AgentSession, SessionStatus
from models.task import Task, TaskStatus
from services.git_workspace import GitWorkspaceManager
from services.task_dispatcher import TaskDispatcher
from services.team_presets import (
    TEAM_PRESETS, get_preset_summary,
    build_team_creation_prompt, build_custom_team_prompt,
)
from services.team_file_watcher import TeamFileWatcher
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
    EVENT_TEAM_INBOX_MESSAGE,
    EVENT_TEAM_CONFIG_CHANGED,
    EVENT_CLAUDE_TASK_CREATED,
    EVENT_CLAUDE_TASK_UPDATED,
)

logger = logging.getLogger(__name__)


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
        self.output_lines: dict[int, list[dict]] = {}
        self.stop_event: asyncio.Event = asyncio.Event()
        # CLI Agent Teams
        self.cli_team_name: Optional[str] = None  # Name in ~/.claude/teams/
        self.file_watcher: Optional[TeamFileWatcher] = None
        self.watcher_task: Optional[asyncio.Task] = None


# ─── Unified Team Orchestrator ───────────────────────────────────────

class UnifiedTeamOrchestrator:
    """Central coordinator for CLI Agent Teams."""

    def __init__(self, ws_manager: ConnectionManager):
        self.ws = ws_manager
        self.git = GitWorkspaceManager(settings.WORKTREE_BASE)
        self.dispatcher = TaskDispatcher()
        self._engine = db_engine
        self._teams: dict[int, TeamState] = {}
        self._cli_processes: dict[int, asyncio.subprocess.Process] = {}
        self._monitors: dict[int, asyncio.Task] = {}

    def _get_db(self) -> Session:
        """Create a fresh DB session for async callbacks (not tied to request lifecycle)."""
        return Session(self._engine)

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
        """Create a team using Claude Code CLI Agent Teams from a preset.

        1. Create lead Agent DB record only (teammates created dynamically by file watcher)
        2. Create git worktree for lead
        3. Build NL prompt from preset
        4. Start CLI with --teammate-mode in-process
        5. Start file watcher for ~/.claude/teams/
        """
        preset = TEAM_PRESETS.get(preset_id)
        if not preset:
            return {"error": f"Unknown preset: {preset_id}"}

        await self.cleanup_team(db, project_id)

        lead_model = model or settings.CLAUDE_MODEL
        team_name = f"{project_name}-{preset_id}"

        # 1. Create only lead agent record
        lead_def = next(a for a in preset["db_agents"] if a["is_lead"])
        lead = Agent(
            project_id=project_id,
            name=lead_def["name"],
            role=AgentRole(lead_def["role"]),
            avatar_key=lead_def["avatar_key"],
            is_lead=True,
            team_name=team_name,
            model=lead_model,
            orchestration_mode="cli",
            status=AgentStatus.IDLE,
        )
        db.add(lead)
        db.commit()
        db.refresh(lead)

        # 2. Create worktree for lead
        try:
            wt = self.git.create_worktree(repo_path, lead.id, project_name)
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

        # 3. Build NL prompt from preset
        prompt = build_team_creation_prompt(preset_id, f"Working directory: {repo_path}", team_name=team_name)

        # 4. Track team state
        state = TeamState(project_id, team_name, preset_id)
        state.lead_agent_id = lead.id
        state.agent_ids = [lead.id]
        self._teams[project_id] = state

        # 5. Start CLI session + file watcher (no db — uses fresh sessions)
        await self._start_cli_team_session(project_id, lead.id, prompt, repo_path, lead.model)

        # 6. Broadcast team created
        await self.ws.broadcast(
            project_id,
            WSEvent(type=EVENT_TEAM_CREATED, data={
                "team_name": team_name,
                "preset_id": preset_id,
                "agents": [_agent_dict(lead)],
            }),
        )

        logger.info(f"Team '{team_name}' created: lead={lead.id} (preset={preset_id})")
        return {
            "team_name": team_name,
            "preset_id": preset_id,
            "lead_id": lead.id,
            "agents": [_agent_dict(lead)],
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
        """Create a team from a natural language prompt via CLI Agent Teams."""
        await self.cleanup_team(db, project_id)

        lead_model = model or settings.CLAUDE_MODEL

        lead = Agent(
            project_id=project_id,
            name="Lead Agent",
            role=AgentRole.LEAD,
            avatar_key="lead",
            is_lead=True,
            team_name=team_name,
            model=lead_model,
            orchestration_mode="cli",
            status=AgentStatus.IDLE,
        )
        db.add(lead)
        db.commit()
        db.refresh(lead)

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
            return {"error": str(e)}

        # Wrap user prompt with team creation instructions
        cli_prompt = build_custom_team_prompt(prompt, team_name)

        state = TeamState(project_id, team_name)
        state.lead_agent_id = lead.id
        state.agent_ids = [lead.id]
        self._teams[project_id] = state

        await self._start_cli_team_session(project_id, lead.id, cli_prompt, repo_path, lead.model)

        await self.ws.broadcast(
            project_id,
            WSEvent(type=EVENT_TEAM_CREATED, data={
                "team_name": team_name,
                "agents": [_agent_dict(lead)],
            }),
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
        """Dispatch tasks by telling the lead agent to assign them."""
        # Get pending tasks
        tasks = db.exec(
            select(Task).where(
                Task.project_id == project_id,
                Task.status == TaskStatus.TODO,
            )
        ).all()

        if not tasks:
            return []

        # Tell the lead to dispatch tasks
        task_list = "\n".join(f"- {t.title}" for t in tasks)
        message = (
            f"Please assign and dispatch these tasks to your teammates:\n{task_list}\n\n"
            f"Match tasks to the most appropriate teammate based on their role."
        )
        result = await self.send_command_to_lead(project_id, message)

        if "error" in result:
            # Fallback: use TaskDispatcher for local assignment
            assignments = self.dispatcher.auto_assign(db, project_id)
            return assignments

        return [{"dispatched": True, "task_count": len(tasks)}]

    async def start_agent_on_task(
        self,
        db: Session,
        agent: Agent,
        task: Task,
        project_name: str,
        repo_path: str,
    ) -> AgentSession:
        """Start a single agent on a task by messaging the lead."""
        task.status = TaskStatus.IN_PROGRESS
        task.assigned_agent_id = agent.id
        db.add(task)
        agent.status = AgentStatus.WORKING
        db.add(agent)
        db.commit()

        await self._emit_agent_status(agent.project_id, agent.id, "working", f"Working on: {task.title}")
        await self._emit_task_update(agent.project_id, task)

        # Tell lead to assign this task to the specific agent
        message = f"Assign task '{task.title}' to teammate {agent.name}. Description: {task.description or task.title}"
        await self.send_command_to_lead(agent.project_id, message)

        session = db.exec(
            select(AgentSession).where(AgentSession.agent_id == agent.id)
        ).first()
        return session

    # ═══════════════════════════════════════════════════════════════
    # CLI SESSION MANAGEMENT
    # ═══════════════════════════════════════════════════════════════

    async def _start_cli_team_session(
        self,
        project_id: int,
        lead_id: int,
        prompt: str,
        repo_path: str,
        model: str = "",
    ):
        """Start Claude CLI with Agent Teams + file watcher.

        NOTE: Does NOT accept a `db` session parameter — all DB access uses
        fresh sessions via `self._get_db()` to avoid stale session issues
        in long-running async callbacks and monitor tasks.
        """
        resolved_cli = shutil.which(settings.CLAUDE_CLI)
        if not resolved_cli:
            logger.error(f"Claude CLI not found at '{settings.CLAUDE_CLI}'")
            return

        cmd = [
            resolved_cli,
            "--print", "--verbose", "--output-format", "stream-json",
        ]
        if model:
            cmd.extend(["--model", model])
        cmd.extend(["-p", prompt])

        env = {**os.environ, "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"}

        proc = await asyncio.create_subprocess_exec(
            *cmd, cwd=repo_path, env=env,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            stdin=asyncio.subprocess.DEVNULL,
        )
        self._cli_processes[project_id] = proc

        # Update lead status with fresh session
        with self._get_db() as db:
            lead = db.get(Agent, lead_id)
            if lead:
                lead.status = AgentStatus.WORKING
                db.add(lead)
            lead_session = db.exec(
                select(AgentSession).where(AgentSession.agent_id == lead_id)
            ).first()
            if lead_session:
                lead_session.status = SessionStatus.RUNNING
                lead_session.pid = proc.pid
                db.add(lead_session)
            db.commit()

        await self._emit_agent_status(project_id, lead_id, "working", "CLI session started")

        # Start CLI output monitor (no db param — uses fresh sessions internally)
        cli_monitor = asyncio.create_task(
            self._monitor_cli_session(project_id, lead_id, proc)
        )
        self._monitors[project_id] = cli_monitor

        # Start file watcher (delayed to give Claude time to create team dir)
        state = self._teams[project_id]
        team_name = state.team_name

        watcher = TeamFileWatcher(team_name, poll_interval=settings.FILE_WATCHER_POLL_INTERVAL)
        state.file_watcher = watcher

        # Wire callbacks — NO db parameter (callbacks use self._get_db())
        watcher.on_member_joined(
            lambda member: self._on_file_member_joined(project_id, member)
        )
        watcher.on_member_left(
            lambda agent_id: self._on_file_member_left(project_id, agent_id)
        )
        watcher.on_inbox_message(
            lambda inbox, msg: self._on_file_inbox_message(project_id, inbox, msg)
        )
        watcher.on_task_update(
            lambda task_data, is_new: self._on_file_task_update(project_id, task_data, is_new)
        )

        async def _delayed_watcher():
            await asyncio.sleep(3)
            await watcher.start()

        state.watcher_task = asyncio.create_task(_delayed_watcher())

    # ═══════════════════════════════════════════════════════════════
    # CLI MONITORING
    # ═══════════════════════════════════════════════════════════════

    async def _monitor_cli_session(
        self,
        project_id: int,
        lead_id: int,
        proc: asyncio.subprocess.Process,
    ):
        """Monitor CLI lead session — parse streaming JSON for output.

        Uses lead_id (int) instead of Agent object to avoid stale ORM references.
        """

        async def _read_stream(stream, source: str):
            try:
                async for raw_line in stream:
                    line = raw_line.decode("utf-8", errors="replace").strip()
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                        event_type = data.get("type", "")

                        if event_type == "system":
                            continue

                        elif event_type == "assistant":
                            msg = data.get("message", {})
                            for block in msg.get("content", []):
                                if block.get("type") == "text" and block.get("text"):
                                    await self._emit_log(project_id, lead_id, block["text"])
                                elif block.get("type") == "tool_use":
                                    tool_name = block.get("name", "tool")
                                    tool_input = block.get("input", {})
                                    desc = tool_input.get("description", tool_input.get("name", ""))
                                    await self._emit_log(project_id, lead_id, f"[{tool_name}] {desc}", "tool")

                        elif event_type == "user":
                            tool_result = data.get("tool_use_result", {})
                            if tool_result.get("status") == "teammate_spawned":
                                name = tool_result.get("name", "")
                                color = tool_result.get("color", "")
                                await self._emit_log(
                                    project_id, lead_id,
                                    f"Teammate spawned: {name} (color: {color})",
                                    "success",
                                )

                        elif event_type == "result":
                            result_text = data.get("result", "")
                            cost = data.get("total_cost_usd", 0)
                            turns = data.get("num_turns", 0)
                            duration = data.get("duration_ms", 0)
                            await self._emit_log(
                                project_id, lead_id,
                                f"Session done: {turns} turns, {duration}ms, ${cost:.4f}",
                                "success",
                            )
                        else:
                            await self._emit_log(project_id, lead_id, line, source)

                    except json.JSONDecodeError:
                        await self._emit_log(project_id, lead_id, line, source)

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

        # Session ended — use fresh DB session
        with self._get_db() as db:
            lead = db.get(Agent, lead_id)
            if lead:
                lead.status = AgentStatus.IDLE
                db.add(lead)
            lead_session = db.exec(
                select(AgentSession).where(AgentSession.agent_id == lead_id)
            ).first()
            if lead_session:
                lead_session.status = SessionStatus.IDLE
                db.add(lead_session)
            db.commit()

        await self.ws.broadcast(
            project_id,
            WSEvent(type="team.stopped", data={
                "exit_code": proc.returncode,
                "project_id": project_id,
            }),
        )

    # ═══════════════════════════════════════════════════════════════
    # FILE WATCHER CALLBACKS
    # ═══════════════════════════════════════════════════════════════

    async def _on_file_member_joined(self, project_id: int, member_data: dict):
        """File watcher detected a new member in config.json."""
        state = self._teams.get(project_id)
        if not state:
            return

        agent_id_str = member_data.get("agentId", "")
        name = member_data.get("name", "Teammate")

        # Skip lead
        if "team-lead" in agent_id_str or name == "team-lead":
            return

        with self._get_db() as db:
            # Skip if already exists
            existing = db.exec(
                select(Agent).where(
                    Agent.project_id == project_id,
                    Agent.team_name == state.team_name,
                    Agent.cli_agent_id == agent_id_str,
                )
            ).first()
            if existing:
                return

            role = _map_agent_type_to_role(member_data.get("agentType", ""))
            color = member_data.get("color", "")

            agent = Agent(
                project_id=project_id,
                name=name,
                role=role,
                avatar_key=role.value,
                is_lead=False,
                team_name=state.team_name,
                parent_agent_id=state.lead_agent_id,
                orchestration_mode="cli",
                status=AgentStatus.WORKING,
                cli_agent_id=agent_id_str,
                agent_color=color,
            )
            db.add(agent)
            try:
                db.commit()
            except IntegrityError:
                db.rollback()
                return
            db.refresh(agent)
            state.agent_ids.append(agent.id)

        await self.ws.broadcast(
            project_id,
            WSEvent(type=EVENT_TEAM_AGENT_SPAWNED, data=_agent_dict(agent)),
        )
        logger.info(f"File watcher: member joined '{name}' -> agent-{agent.id}")

    async def _on_file_member_left(self, project_id: int, agent_id_str: str):
        """File watcher detected a member removed from config.json."""
        name = agent_id_str.split("@")[0] if "@" in agent_id_str else agent_id_str
        with self._get_db() as db:
            agent = db.exec(
                select(Agent).where(
                    Agent.project_id == project_id,
                    Agent.cli_agent_id == agent_id_str,
                )
            ).first()
            if not agent:
                agent = db.exec(
                    select(Agent).where(
                        Agent.project_id == project_id,
                        Agent.name == name,
                    )
                ).first()
            if agent:
                agent.status = AgentStatus.STOPPED
                db.add(agent)
                db.commit()
                await self.ws.broadcast(
                    project_id,
                    WSEvent(type=EVENT_TEAM_AGENT_COMPLETED, data={
                        "agent_id": agent.id, "name": agent.name,
                    }),
                )

    async def _on_file_inbox_message(
        self, project_id: int, inbox_name: str, msg: dict,
    ):
        """File watcher detected a new inbox message."""
        text = msg.get("text", "")
        from_agent = msg.get("from", inbox_name)

        # Try parse structured messages
        parsed = None
        if text.startswith("{"):
            try:
                parsed = json.loads(text)
            except (json.JSONDecodeError, ValueError):
                pass

        if parsed:
            msg_type = parsed.get("type", "")

            if msg_type == "idle_notification":
                with self._get_db() as db:
                    agent = self._find_agent_by_name(db, project_id, parsed.get("from", from_agent))
                    if agent:
                        agent.status = AgentStatus.IDLE
                        db.add(agent)
                        db.commit()
                        await self._emit_agent_status(project_id, agent.id, "idle", "Available")
                return

            if msg_type == "task_assignment":
                subject = parsed.get("subject", "")
                to_name = inbox_name  # Task is assigned TO the inbox owner
                with self._get_db() as db:
                    agent = self._find_agent_by_name(db, project_id, to_name)
                    if agent:
                        agent.status = AgentStatus.WORKING
                        db.add(agent)
                        db.commit()
                        await self.ws.broadcast(
                            project_id,
                            WSEvent(type=EVENT_TEAM_TASK_DELEGATED, data={
                                "to_agent_id": agent.id,
                                "to_agent_name": agent.name,
                                "description": subject,
                            }),
                        )
                return

            if msg_type in ("shutdown_approved", "shutdown_request"):
                with self._get_db() as db:
                    agent = self._find_agent_by_name(db, project_id, parsed.get("from", from_agent))
                    if agent:
                        agent.status = AgentStatus.STOPPED
                        db.add(agent)
                        db.commit()
                        await self.ws.broadcast(
                            project_id,
                            WSEvent(type=EVENT_TEAM_AGENT_COMPLETED, data={
                                "agent_id": agent.id, "name": agent.name,
                            }),
                        )
                return

        # Regular text message
        summary = msg.get("summary", "")
        display = summary if summary else (text[:300] if text else "")
        with self._get_db() as db:
            agent = self._find_agent_by_name(db, project_id, from_agent)
            agent_id = agent.id if agent else None

        await self.ws.broadcast(
            project_id,
            WSEvent(type=EVENT_TEAM_MESSAGE, data={
                "agent_id": agent_id,
                "from": from_agent,
                "inbox": inbox_name,
                "message": display,
                "color": msg.get("color", ""),
            }),
        )

    async def _on_file_task_update(self, project_id: int, task_data: dict, is_new: bool):
        """File watcher detected a task change in ~/.claude/tasks/."""
        event_type = EVENT_CLAUDE_TASK_CREATED if is_new else EVENT_CLAUDE_TASK_UPDATED
        await self.ws.broadcast(
            project_id,
            WSEvent(type=event_type, data={
                "claude_task_id": task_data.get("id"),
                "subject": task_data.get("subject", ""),
                "status": task_data.get("status", "pending"),
                "owner": task_data.get("owner", ""),
                "blocks": task_data.get("blocks", []),
                "blocked_by": task_data.get("blockedBy", []),
            }),
        )

    # ═══════════════════════════════════════════════════════════════
    # COMMUNICATION
    # ═══════════════════════════════════════════════════════════════

    async def send_command_to_lead(self, project_id: int, message: str) -> dict:
        """Send command to lead agent via team inbox file."""
        state = self._teams.get(project_id)
        if not state:
            return {"error": "No active team"}

        proc = self._cli_processes.get(project_id)
        if not proc or proc.returncode is not None:
            return {"error": "No active lead session"}

        # Write to lead's inbox file if file watcher knows the team dir
        if state.file_watcher and state.file_watcher.team_dir:
            import time
            inbox_path = state.file_watcher.team_dir / "inboxes" / "lead.json"
            inbox_path.parent.mkdir(parents=True, exist_ok=True)
            try:
                existing = json.loads(inbox_path.read_text()) if inbox_path.exists() else []
            except (json.JSONDecodeError, OSError):
                existing = []
            existing.append({
                "from": "chibi-office",
                "text": message,
                "timestamp": time.time(),
                "read": False,
            })
            inbox_path.write_text(json.dumps(existing, indent=2))
            return {"sent": True, "via": "inbox"}

        return {"error": "Lead session is running but inbox not available yet"}

    async def broadcast_message(self, project_id: int, message: str) -> dict:
        """Broadcast message to all agents via lead."""
        return await self.send_command_to_lead(
            project_id, f"Broadcast to all teammates: {message}"
        )

    async def send_message(self, project_id: int, to_agent_name: str, message: str) -> dict:
        """Send message to specific agent via lead."""
        return await self.send_command_to_lead(
            project_id, f"Send a message to {to_agent_name}: {message}"
        )

    # ═══════════════════════════════════════════════════════════════
    # CLEANUP
    # ═══════════════════════════════════════════════════════════════

    async def cleanup_team(self, db: Session, project_id: int) -> dict:
        """Stop all agents, clean worktrees, remove DB records."""
        state = self._teams.pop(project_id, None)

        # Stop file watcher
        if state and state.file_watcher:
            state.file_watcher.stop()
        if state and state.watcher_task:
            state.watcher_task.cancel()
            try:
                await state.watcher_task
            except asyncio.CancelledError:
                pass

        # Signal stop
        if state:
            state.stop_event.set()

        # Cancel CLI monitor
        monitor = self._monitors.pop(project_id, None)
        if monitor and not monitor.done():
            monitor.cancel()
            try:
                await monitor
            except asyncio.CancelledError:
                pass

        # Kill CLI process
        proc = self._cli_processes.pop(project_id, None)
        if proc and proc.returncode is None:
            try:
                proc.terminate()
                await asyncio.wait_for(proc.wait(), timeout=5.0)
            except (ProcessLookupError, asyncio.TimeoutError):
                try:
                    proc.kill()
                except ProcessLookupError:
                    pass

        # Clean worktrees
        from models.project import Project
        project = db.get(Project, project_id)
        if project:
            self.git.cleanup_all(project.repo_path)

        # Remove agents and sessions from DB
        agents = db.exec(select(Agent).where(Agent.project_id == project_id)).all()
        for agent in agents:
            sessions = db.exec(
                select(AgentSession).where(AgentSession.agent_id == agent.id)
            ).all()
            for s in sessions:
                db.delete(s)
            db.delete(agent)
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
                    if state.file_watcher:
                        state.file_watcher.stop()
                    if state.watcher_task:
                        state.watcher_task.cancel()

                monitor = self._monitors.pop(project_id, None)
                if monitor and not monitor.done():
                    monitor.cancel()

                proc = self._cli_processes.pop(project_id, None)
                if proc and proc.returncode is None:
                    proc.terminate()
            except Exception:
                pass

        self._teams.clear()
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
        cli_ok = shutil.which(settings.CLAUDE_CLI) is not None
        return {
            "claude_cli": cli_ok,
            "recommended_mode": "cli" if cli_ok else "none",
        }

    # ═══════════════════════════════════════════════════════════════
    # HELPERS
    # ═══════════════════════════════════════════════════════════════

    def _find_agent_by_name(self, db: Session, project_id: int, name: str) -> Optional[Agent]:
        """Find agent by name or cli_agent_id."""
        agent = db.exec(
            select(Agent).where(
                Agent.project_id == project_id,
                Agent.name == name,
            )
        ).first()
        if not agent:
            agent = db.exec(
                select(Agent).where(
                    Agent.project_id == project_id,
                    Agent.cli_agent_id.contains(name),
                )
            ).first()
        return agent

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
        "cli_agent_id": agent.cli_agent_id,
        "agent_color": agent.agent_color,
    }


def _map_agent_type_to_role(agent_type: str) -> AgentRole:
    """Map Claude Code agent type strings to our AgentRole enum."""
    t = agent_type.lower()
    if "lead" in t:
        return AgentRole.LEAD
    if "backend" in t:
        return AgentRole.BACKEND
    if "frontend" in t:
        return AgentRole.FRONTEND
    if "qa" in t or "test" in t:
        return AgentRole.QA
    if "security" in t:
        return AgentRole.SECURITY
    if "doc" in t:
        return AgentRole.DOCS
    return AgentRole.CUSTOM
