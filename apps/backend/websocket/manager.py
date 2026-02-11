"""WebSocket connection manager — handles per-project connections and broadcasting."""

import json
import logging
from fastapi import WebSocket

from websocket.events import WSEvent

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections grouped by project ID."""

    def __init__(self):
        # project_id -> set of WebSocket connections
        self.active_connections: dict[int, set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, project_id: int):
        """Accept a WebSocket connection and register it under project_id."""
        await websocket.accept()
        if project_id not in self.active_connections:
            self.active_connections[project_id] = set()
        self.active_connections[project_id].add(websocket)
        logger.info(f"WS connected: project={project_id}, total={len(self.active_connections[project_id])}")

    def disconnect(self, websocket: WebSocket, project_id: int):
        """Remove a WebSocket connection."""
        if project_id in self.active_connections:
            self.active_connections[project_id].discard(websocket)
            if not self.active_connections[project_id]:
                del self.active_connections[project_id]
            logger.info(f"WS disconnected: project={project_id}")

    async def broadcast(self, project_id: int, event: WSEvent):
        """Send an event to all connections for a given project."""
        connections = self.active_connections.get(project_id, set())
        dead = []
        payload = json.dumps(event.to_dict())

        for ws in connections:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)

        for ws in dead:
            self.disconnect(ws, project_id)

    async def send_personal(self, websocket: WebSocket, event: WSEvent):
        """Send an event to a specific connection."""
        try:
            await websocket.send_text(json.dumps(event.to_dict()))
        except Exception:
            logger.warning("Failed to send personal WS message")

    def get_connection_count(self, project_id: int) -> int:
        """Get number of active connections for a project."""
        return len(self.active_connections.get(project_id, set()))
