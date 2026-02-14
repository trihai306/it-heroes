"""
Session Manager — manages session lifecycle with DB persistence.
Bridges between ClaudeService (in-memory SDK clients) and SQLite storage.
"""

from __future__ import annotations

import logging
from datetime import datetime
from uuid import uuid4

from sqlmodel import Session, select

from models import Agent, AgentSession, Message, Project

logger = logging.getLogger(__name__)


class SessionManager:
    """Manages session lifecycle with DB persistence."""

    def __init__(self, claude_service, db_engine):
        self.claude = claude_service
        self.engine = db_engine

    def _db(self) -> Session:
        return Session(self.engine)

    async def create_session(
        self,
        agent_id: str,
        project_id: str | None = None,
    ) -> AgentSession:
        """Create DB record + start SDK client."""
        with self._db() as db:
            agent = db.get(Agent, agent_id)
            if not agent:
                raise ValueError(f"Agent not found: {agent_id}")

            project = db.get(Project, project_id) if project_id else None

            session = AgentSession(
                id=uuid4().hex[:8],
                agent_id=agent_id,
                project_id=project_id,
                status="starting",
                cwd=project.path if project else "",
            )
            db.add(session)
            db.commit()
            db.refresh(session)

            # Start SDK client
            await self.claude.start_session(session.id, agent, project)

            session.status = "active"
            session.last_active = datetime.now().isoformat()
            db.add(session)
            db.commit()
            db.refresh(session)

        return session

    async def get_or_create_session(
        self,
        agent_id: str,
        project_id: str | None = None,
    ) -> AgentSession:
        """Get active session for agent or create new one."""
        with self._db() as db:
            stmt = (
                select(AgentSession)
                .where(AgentSession.agent_id == agent_id)
                .where(AgentSession.status.in_(["active", "idle"]))
            )
            session = db.exec(stmt).first()

            if session and self.claude.is_session_active(session.id):
                return session

            # If session exists in DB but not in memory, mark as stopped
            if session:
                session.status = "stopped"
                db.add(session)
                db.commit()

        return await self.create_session(agent_id, project_id)

    async def resume_session(self, session_id: str) -> AgentSession:
        """Resume a stopped session by creating a new SDK client."""
        with self._db() as db:
            session = db.get(AgentSession, session_id)
            if not session:
                raise ValueError(f"Session not found: {session_id}")

            agent = db.get(Agent, session.agent_id)
            if not agent:
                raise ValueError(f"Agent not found: {session.agent_id}")

            project = (
                db.get(Project, session.project_id)
                if session.project_id else None
            )

            await self.claude.start_session(session.id, agent, project)

            session.status = "active"
            session.last_active = datetime.now().isoformat()
            db.add(session)
            db.commit()
            db.refresh(session)

        return session

    async def stop_session(self, session_id: str) -> None:
        """Stop SDK client + update DB."""
        await self.claude.stop_session(session_id)
        with self._db() as db:
            session = db.get(AgentSession, session_id)
            if session:
                session.status = "stopped"
                db.add(session)
                db.commit()

    async def delete_session(self, session_id: str) -> None:
        """Stop + delete session and its messages from DB."""
        await self.claude.stop_session(session_id)
        with self._db() as db:
            # Delete messages
            msgs = db.exec(
                select(Message).where(Message.session_id == session_id),
            ).all()
            for msg in msgs:
                db.delete(msg)

            session = db.get(AgentSession, session_id)
            if session:
                db.delete(session)
            db.commit()

    async def cleanup_stale_sessions(self) -> int:
        """Mark all active/idle sessions as stopped (called on startup)."""
        count = 0
        with self._db() as db:
            stmt = select(AgentSession).where(
                AgentSession.status.in_(["active", "idle", "starting"]),
            )
            for session in db.exec(stmt).all():
                session.status = "stopped"
                db.add(session)
                count += 1
            db.commit()
        if count:
            logger.info("Cleaned up %d stale sessions", count)
        return count

    def list_sessions(self, agent_id: str | None = None) -> list[dict]:
        with self._db() as db:
            stmt = select(AgentSession).order_by(AgentSession.created_at.desc())
            if agent_id:
                stmt = stmt.where(AgentSession.agent_id == agent_id)
            sessions = db.exec(stmt).all()
            return [s.model_dump() for s in sessions]

    def get_session(self, session_id: str) -> AgentSession | None:
        """Return ORM model (used by WS handler)."""
        with self._db() as db:
            return db.get(AgentSession, session_id)

    def get_session_dict(self, session_id: str) -> dict | None:
        with self._db() as db:
            session = db.get(AgentSession, session_id)
            return session.model_dump() if session else None

    def update_session_title(self, session_id: str, title: str) -> None:
        """Update session title in DB."""
        with self._db() as db:
            session = db.get(AgentSession, session_id)
            if session:
                session.title = title
                db.add(session)
                db.commit()

    async def update_agent_status(self, agent_id: str, status: str):
        """Update agent's status field in DB."""
        with self._db() as db:
            agent = db.get(Agent, agent_id)
            if agent:
                agent.status = status
                agent.last_active = datetime.now().isoformat()
                db.add(agent)
                db.commit()

    async def get_agent_dict(self, agent_id: str) -> dict | None:
        """Get agent as API dict."""
        with self._db() as db:
            agent = db.get(Agent, agent_id)
            return agent.to_api_dict() if agent else None

    async def save_messages(
        self,
        session_id: str,
        agent_id: str,
        user_text: str,
        assistant_text: str,
    ):
        """Persist user + assistant messages to DB."""
        now = datetime.now().isoformat()
        with self._db() as db:
            db.add(Message(
                id=uuid4().hex[:8],
                session_id=session_id,
                agent_id=agent_id,
                role="user",
                content=user_text,
                timestamp=now,
            ))
            db.add(Message(
                id=uuid4().hex[:8],
                session_id=session_id,
                agent_id=agent_id,
                role="assistant",
                content=assistant_text,
                timestamp=now,
            ))

            # Update agent metrics
            agent = db.get(Agent, agent_id)
            if agent:
                agent.messages_sent += 1
                agent.last_active = now
                db.add(agent)

            # Update session
            session = db.get(AgentSession, session_id)
            if session:
                session.total_turns += 1
                session.last_active = now
                db.add(session)

            db.commit()
