"""
Notification model — system notifications for events.
"""

from datetime import datetime
from uuid import uuid4

from sqlmodel import SQLModel, Field


class Notification(SQLModel, table=True):
    id: str = Field(default_factory=lambda: uuid4().hex[:8], primary_key=True)
    type: str = "system"  # agent_created | task_assigned | chat_message | system
    title: str = ""
    message: str = ""
    avatar: str = ""
    is_read: bool = False
    related_id: str | None = None  # optional link to agent/task id
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
