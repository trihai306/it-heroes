"""Agent model — represents an AI agent (chibi character)."""

import enum
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel


class AgentRole(str, enum.Enum):
    LEAD = "lead"
    BACKEND = "backend"
    FRONTEND = "frontend"
    QA = "qa"
    DOCS = "docs"
    SECURITY = "security"
    CUSTOM = "custom"


class AgentStatus(str, enum.Enum):
    IDLE = "idle"
    WORKING = "working"
    REVIEWING = "reviewing"
    BLOCKED = "blocked"
    STOPPED = "stopped"


class Agent(SQLModel, table=True):
    __tablename__ = "agents"

    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="projects.id", index=True)
    role: AgentRole = Field(default=AgentRole.BACKEND)
    name: str
    avatar_key: str = Field(default="default")
    status: AgentStatus = Field(default=AgentStatus.IDLE)
    system_prompt: str = Field(default="")
    model: str = Field(default="claude-sonnet-4-5-20250929")
    team_name: Optional[str] = Field(default=None)
    is_lead: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
