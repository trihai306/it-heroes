"""
Agent model — persistent AI agent definitions.
Output format matches FE Agent interface exactly.
"""

import json
from datetime import datetime
from uuid import uuid4

from sqlmodel import SQLModel, Field


class Agent(SQLModel, table=True):
    id: str = Field(default_factory=lambda: uuid4().hex[:8], primary_key=True)
    name: str
    role: str = "worker"
    model: str = "sonnet"
    system_prompt: str = ""
    avatar: str = "\U0001f916"
    status: str = "idle"
    allowed_tools: str = "[]"
    permission_mode: str = "acceptEdits"
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    last_active: str | None = None
    current_task: str | None = None
    tasks_completed: int = 0
    messages_sent: int = 0
    errors: int = 0

    def to_api_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "role": self.role,
            "model": self.model,
            "system_prompt": self.system_prompt,
            "avatar": self.avatar,
            "status": self.status,
            "created_at": self.created_at,
            "last_active": self.last_active,
            "current_task": self.current_task,
            "metrics": {
                "tasks_completed": self.tasks_completed,
                "messages_sent": self.messages_sent,
                "errors": self.errors,
                "uptime_seconds": 0,
            },
        }

    def get_allowed_tools(self) -> list[str]:
        return json.loads(self.allowed_tools)

    def set_allowed_tools(self, tools: list[str]):
        self.allowed_tools = json.dumps(tools)

    @staticmethod
    def default_prompt(role: str) -> str:
        prompts = {
            "orchestrator": (
                "You are an Orchestrator Agent. Decompose complex tasks into subtasks, "
                "assign them to specialized agents, monitor progress, and aggregate results."
            ),
            "researcher": (
                "You are a Researcher Agent. Gather information, analyze data, "
                "and provide comprehensive research reports."
            ),
            "coder": (
                "You are a Coder Agent. Write clean, efficient, well-documented, "
                "production-ready code."
            ),
            "reviewer": (
                "You are a Reviewer Agent. Review code and outputs for quality, "
                "correctness, and security."
            ),
            "worker": (
                "You are a versatile Worker Agent. Handle various tasks including "
                "writing, analysis, coding, and problem-solving."
            ),
        }
        return prompts.get(role, prompts["worker"])
