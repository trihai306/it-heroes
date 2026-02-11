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
