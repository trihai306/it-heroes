"""
Project model — workspace directories for agents.
"""

from datetime import datetime
from uuid import uuid4

from sqlmodel import SQLModel, Field


class Project(SQLModel, table=True):
    id: str = Field(default_factory=lambda: uuid4().hex[:8], primary_key=True)
    name: str
    path: str
    description: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
