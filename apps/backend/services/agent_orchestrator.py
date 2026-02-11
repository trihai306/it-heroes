"""Agent Orchestrator — coordinates agents, worktrees, and Claude sessions."""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Session, select

from config import settings
from models.agent import Agent, AgentRole
from models.session import AgentSession, SessionStatus
from models.task import Task, TaskStatus

from models.event_log import EventLog
from services.adapter_factory import create_adapter
from services.git_workspace import GitWorkspaceManager
from services.task_dispatcher import TaskDispatcher
from websocket.manager import ConnectionManager
from websocket.events import (
    WSEvent,
    EVENT_AGENT_STATUS,
    EVENT_TASK_UPDATED,
    EVENT_LOG_APPEND,
)

logger = logging.getLogger(__name__)


class AgentOrchestrator:
    """
    Central coordinator for the agent team lifecycle:
    1. Summon team → create agents + worktrees
    2. Dispatch tasks → assign + start Claude sessions
    3. Monitor → stream output + update statuses
    4. Complete → commit changes + cleanup
    """

    def __init__(self, ws_manager: ConnectionManager):
        self.ws = ws_manager
        self.claude = create_adapter(settings.CLAUDE_ADAPTER_MODE)
        self.git = GitWorkspaceManager(settings.WORKTREE_BASE)
        self.dispatcher = TaskDispatcher()
        self._monitoring_tasks: dict[int, asyncio.Task] = {}

    async def check_prerequisites(self) -> dict:
        """Check that required tools are available."""
        cli_ok = await self.claude.check_cli_available()
        return {
            "claude_cli": cli_ok,
            "agent_teams": settings.AGENT_TEAMS_ENABLED,
        }

    # ─── Team Lifecycle ───────────────────────────────────────────────

    async def start_agent(
        self,
        db: Session,
        agent: Agent,
        task: Task,
        project_name: str,
        repo_path: str,
    ) -> AgentSession:
        """
        Start a single agent on a task:
        1. Create worktree
        2. Spawn Claude session
        3. Monitor output stream
        4. Update statuses via WebSocket
        """
        # 1. Create worktree
        try:
            wt = self.git.create_worktree(repo_path, agent.id, project_name)
        except RuntimeError as e:
            logger.error(f"Worktree creation failed for agent-{agent.id}: {e}")
            await self._emit_agent_status(
                agent.project_id, agent.id, "failed", str(e)
            )
            raise

        # 2. Create session record
        session = AgentSession(
            agent_id=agent.id,
            status=SessionStatus.STARTING,
            worktree_path=wt["worktree_path"],
            branch_name=wt["branch_name"],
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        # 3. Build prompt from task
        prompt = self.dispatcher.build_prompt(task)

        # 4. Update task status
        task.status = TaskStatus.IN_PROGRESS
        task.assigned_agent_id = agent.id
        db.add(task)
        db.commit()

        await self._emit_task_update(agent.project_id, task)
        await self._emit_agent_status(
            agent.project_id, agent.id, "in_progress", f"Working on: {task.title}"
        )

        # 5. Spawn Claude session
        try:
            result = await self.claude.start_session(
                agent_id=agent.id,
                working_dir=wt["worktree_path"],
                prompt=prompt,
                role=agent.role.value,
                team_name=project_name if settings.AGENT_TEAMS_ENABLED else None,
            )

            # Update session with PID (CLI adapter returns Process, SDK returns None)
            if result and hasattr(result, "pid"):
                session.pid = result.pid
            session.status = SessionStatus.RUNNING
            db.add(session)
            db.commit()

            # 6. Start monitoring in background
            monitor = asyncio.create_task(
                self._monitor_agent(db, agent, task, session)
            )
            self._monitoring_tasks[agent.id] = monitor

        except Exception as e:
            logger.error(f"Failed to start Claude for agent-{agent.id}: {e}")
            session.status = SessionStatus.FAILED
            task.status = TaskStatus.FAILED
            db.add(session)
            db.add(task)
            db.commit()

            await self._emit_agent_status(
                agent.project_id, agent.id, "failed", str(e)
            )
            await self._emit_task_update(agent.project_id, task)

        return session

    async def dispatch_tasks(
        self,
        db: Session,
        project_id: int,
        repo_path: str,
        project_name: str,
    ) -> list[dict]:
        """
        Auto-assign unassigned tasks and start agents on them.
        Returns list of {task_id, agent_id, reason}.
        """
        # Auto-assign
        assignments = self.dispatcher.auto_assign(db, project_id)

        # Start agents in parallel
        tasks_started = []
        for assignment in assignments:
            agent = db.get(Agent, assignment["agent_id"])
            task = db.get(Task, assignment["task_id"])

            if agent and task:
                try:
                    await self.start_agent(db, agent, task, project_name, repo_path)
                    tasks_started.append(assignment)
                except Exception as e:
                    logger.error(
                        f"Failed to start agent-{agent.id} on task-{task.id}: {e}"
                    )

        return tasks_started

    async def stop_agent(self, db: Session, agent_id: int) -> None:
        """Stop a running agent session."""
        # Cancel monitoring
        monitor = self._monitoring_tasks.pop(agent_id, None)
        if monitor and not monitor.done():
            monitor.cancel()

        # Stop Claude process
        await self.claude.stop_session(agent_id)

        # Update session
        sessions = db.exec(
            select(AgentSession).where(
                AgentSession.agent_id == agent_id,
                AgentSession.status == SessionStatus.RUNNING,
            )
        ).all()
        for session in sessions:
            session.status = SessionStatus.STOPPED
            db.add(session)
        db.commit()

    async def stop_all(self, db: Session, project_id: int) -> None:
        """Stop all agents for a project."""
        agents = db.exec(
            select(Agent).where(Agent.project_id == project_id)
        ).all()

        for agent in agents:
            await self.stop_agent(db, agent.id)

        # Cleanup all worktrees
        from models.project import Project
        project = db.get(Project, project_id)
        if project:
            self.git.cleanup_all(project.repo_path)

        logger.info(f"🛑 Stopped all agents for project-{project_id}")

    # ─── Monitoring ───────────────────────────────────────────────────

    async def _monitor_agent(
        self,
        db: Session,
        agent: Agent,
        task: Task,
        session: AgentSession,
    ) -> None:
        """
        Background task: stream Claude output, update statuses, handle completion.
        Works with both CLI (subprocess) and SDK (API) adapters.
        """
        completed_ok = False
        try:
            async for event in self.claude.stream_output(agent.id):
                event_type = event.get("type", "info")
                content = event.get("content", "")

                # Emit log to WebSocket
                await self._emit_log(
                    agent.project_id,
                    agent.id,
                    content,
                    event_type,
                )

                # Check for completion/error signals
                if event_type == "complete":
                    completed_ok = True
                    logger.info(f"Agent-{agent.id} completed")
                elif event_type == "error":
                    completed_ok = False
                    logger.error(f"Agent-{agent.id} error: {content}")
                elif "Task completed" in content or "DONE" in content:
                    completed_ok = True
                    logger.info(f"Agent-{agent.id} signaled completion")

            # Stream ended — determine final status
            if completed_ok or not self.claude.is_running(agent.id):
                # Success: commit changes
                worktree = session.worktree_path
                if worktree:
                    self.git.commit_changes(
                        worktree,
                        f"[chibi] {task.title}",
                        agent.name,
                    )

                task.status = TaskStatus.REVIEW
                session.status = SessionStatus.IDLE

                await self._emit_agent_status(
                    agent.project_id, agent.id, "review",
                    f"Completed: {task.title}"
                )
            else:
                task.status = TaskStatus.FAILED
                session.status = SessionStatus.FAILED

                stderr = await self.claude.get_stderr(agent.id)
                await self._emit_agent_status(
                    agent.project_id, agent.id, "failed",
                    f"Session failed: {stderr[:200]}"
                )

            db.add(task)
            db.add(session)
            db.commit()
            await self._emit_task_update(agent.project_id, task)

        except asyncio.CancelledError:
            logger.info(f"Monitoring cancelled for agent-{agent.id}")
        except Exception as e:
            logger.error(f"Monitor error for agent-{agent.id}: {e}", exc_info=True)
            await self._emit_agent_status(
                agent.project_id, agent.id, "failed", str(e)
            )

    # ─── Event Emitters ───────────────────────────────────────────────

    async def _emit_agent_status(
        self, project_id: int, agent_id: int, status: str, message: str = ""
    ) -> None:
        await self.ws.broadcast(
            project_id,
            WSEvent(
                type=EVENT_AGENT_STATUS,
                data={
                    "agent_id": agent_id,
                    "status": status,
                    "message": message,
                },
            ),
        )

    async def _emit_task_update(self, project_id: int, task: Task) -> None:
        await self.ws.broadcast(
            project_id,
            WSEvent(
                type=EVENT_TASK_UPDATED,
                data={
                    "task_id": task.id,
                    "title": task.title,
                    "status": task.status.value if isinstance(task.status, TaskStatus) else task.status,
                    "assigned_agent_id": task.assigned_agent_id,
                },
            ),
        )

    async def _emit_log(
        self, project_id: int, agent_id: int, message: str, level: str = "info"
    ) -> None:
        await self.ws.broadcast(
            project_id,
            WSEvent(
                type=EVENT_LOG_APPEND,
                data={
                    "agent_id": agent_id,
                    "message": message,
                    "level": level,
                },
            ),
        )

    # ─── Status ───────────────────────────────────────────────────────

    def get_team_status(self, db: Session, project_id: int) -> dict:
        """Get current status of all agents and their sessions."""
        agents = db.exec(
            select(Agent).where(Agent.project_id == project_id)
        ).all()

        result = []
        for agent in agents:
            session = db.exec(
                select(AgentSession)
                .where(AgentSession.agent_id == agent.id)
                .order_by(AgentSession.started_at.desc())
            ).first()

            result.append({
                "agent_id": agent.id,
                "name": agent.name,
                "role": agent.role.value,
                "session_status": session.status.value if session else "none",
                "pid": session.pid if session else None,
                "is_running": self.claude.is_running(agent.id),
                "worktree": session.worktree_path if session else None,
            })

        return {
            "project_id": project_id,
            "agents": result,
            "active_count": self.claude.get_active_count(),
        }
