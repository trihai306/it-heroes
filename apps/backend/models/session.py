"""Session model — represents a running agent session."""

import enum
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel


class SessionStatus(str, enum.Enum):
    STARTING = "starting"
    RUNNING = "running"
    IDLE = "idle"
    STOPPED = "stopped"
    FAILED = "failed"


class AgentSession(SQLModel, table=True):
    __tablename__ = "sessions"

    id: Optional[int] = Field(default=None, primary_key=True)
    agent_id: int = Field(foreign_key="agents.id", index=True)
    status: SessionStatus = Field(default=SessionStatus.STARTING)
    pid: Optional[int] = None  # OS process ID
    worktree_path: Optional[str] = None
    branch_name: Optional[str] = None
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_seen: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
