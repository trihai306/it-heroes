"""WebSocket event type definitions."""

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any


EVENT_AGENT_STATUS = "agent.status"
EVENT_AGENT_POSITIONS = "agents.positions"
EVENT_TASK_UPDATED = "task.updated"
EVENT_LOG_APPEND = "log.append"
EVENT_ROOM_OCCUPANCY = "room.occupancy"
EVENT_QA_STATUS = "qa.status"
EVENT_PROJECT_UPDATED = "project.updated"
EVENT_OFFICE_LAYOUT_UPDATED = "office.layout_updated"
EVENT_TOOL_EXECUTION = "tool.execution"
EVENT_SESSION_RESULT = "session.result"

# Team lifecycle events
EVENT_TEAM_CREATED = "team.created"
EVENT_TEAM_AGENT_SPAWNED = "team.agent_spawned"
EVENT_TEAM_AGENT_COMPLETED = "team.agent_completed"
EVENT_TEAM_TASK_DELEGATED = "team.task_delegated"
EVENT_TEAM_MESSAGE = "team.message"


@dataclass
class WSEvent:
    """A WebSocket event to broadcast to clients."""

    type: str
    data: dict[str, Any]
    ts: str | None = None

    def to_dict(self) -> dict:
        return {
            "type": self.type,
            "ts": self.ts or datetime.now(timezone.utc).isoformat(),
            "data": self.data,
        }
