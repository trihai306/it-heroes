"""
Task model — matches FE Task interface exactly.
"""

from datetime import datetime
from uuid import uuid4

from sqlmodel import SQLModel, Field


class Task(SQLModel, table=True):
    id: str = Field(default_factory=lambda: uuid4().hex[:8], primary_key=True)
    title: str
    description: str = ""
    status: str = "pending"
    priority: str = "medium"
    assigned_agent_id: str | None = Field(default=None, foreign_key="agent.id")
    assigned_agent_name: str | None = None
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    completed_at: str | None = None
