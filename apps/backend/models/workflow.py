"""Workflow model — defines task‑flow pipelines between departments."""

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


class Workflow(SQLModel, table=True):
    __tablename__ = "workflows"

    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(index=True)
    name: str
    steps: str = Field(default="[]")          # JSON: ordered list of role strings
    nodes_data: str = Field(default="[]")     # JSON: React Flow node positions
    edges_data: str = Field(default="[]")     # JSON: React Flow edge connections
    is_active: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
