"""
AgentSession model — tracks Claude SDK client sessions.
"""

from datetime import datetime
from uuid import uuid4

from sqlmodel import SQLModel, Field


class AgentSession(SQLModel, table=True):
    id: str = Field(default_factory=lambda: uuid4().hex[:8], primary_key=True)
    agent_id: str = Field(foreign_key="agent.id", index=True)
    project_id: str | None = Field(default=None, foreign_key="project.id")
    title: str = "New Chat"
    status: str = "idle"
    cwd: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    last_active: str | None = None
    total_turns: int = 0
