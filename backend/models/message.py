"""
Message model — persists chat messages per session.
"""

from datetime import datetime
from uuid import uuid4

from sqlmodel import SQLModel, Field


class Message(SQLModel, table=True):
    id: str = Field(default_factory=lambda: uuid4().hex[:8], primary_key=True)
    session_id: str = Field(foreign_key="agentsession.id", index=True)
    agent_id: str = Field(foreign_key="agent.id", index=True)
    role: str  # user | assistant | system
    content: str = ""
    content_type: str = "text"  # text | tool_use | tool_result
    tool_name: str | None = None
    tool_input: str | None = None
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
