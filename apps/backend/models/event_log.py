"""EventLog model — records all system events for audit/replay."""

from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel, Column, JSON


class EventLog(SQLModel, table=True):
    __tablename__ = "event_logs"

    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="projects.id", index=True)
    event_type: str = Field(index=True)  # e.g. "agent.status", "task.updated"
    payload_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    ts: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
