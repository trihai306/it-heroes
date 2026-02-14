"""
WebSocket connection manager with streaming support.
Preserves existing WS events + adds streaming protocol.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import TYPE_CHECKING

from fastapi import WebSocket

if TYPE_CHECKING:
    from services.claude_service import ClaudeService
    from services.session_manager import SessionManager

logger = logging.getLogger(__name__)


class WSManager:
    def __init__(self):
        self.connections: list[WebSocket] = []
        self._claude: ClaudeService | None = None
        self._sessions: SessionManager | None = None

    def set_services(self, claude: ClaudeService, sessions: SessionManager):
        self._claude = claude
        self._sessions = sessions

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.connections.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.connections:
            self.connections.remove(ws)

    async def broadcast(self, message: dict):
        disconnected = []
        for conn in self.connections:
            try:
                await conn.send_json(message)
            except Exception:
                disconnected.append(conn)
        for conn in disconnected:
            self.connections.remove(conn)

    async def handle_message(self, ws: WebSocket, raw: str):
        """Route incoming WS messages to appropriate handlers."""
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return

        msg_type = data.get("type")

        if msg_type == "ping":
            await ws.send_json({"type": "pong"})
        elif msg_type == "chat":
            asyncio.create_task(self._handle_chat(data))
        elif msg_type == "stop":
            await self._handle_stop(data)

    async def _handle_chat(self, data: dict):
        """Handle chat command → stream Claude response."""
        agent_id = data.get("agent_id", "")
        message = data.get("message", "")
        project_id = data.get("project_id")
        session_id = data.get("session_id")

        if not agent_id or not message:
            await self.broadcast({
                "type": "stream_error",
                "agent_id": agent_id,
                "session_id": "",
                "error": "agent_id and message are required",
            })
            return

        session = None
        try:
            if session_id:
                session = self._sessions.get_session(session_id)
                if not session:
                    session = await self._sessions.get_or_create_session(
                        agent_id, project_id,
                    )
            else:
                session = await self._sessions.get_or_create_session(
                    agent_id, project_id,
                )

            # Auto-title session from first message
            if session.title == "New Chat" and message:
                title = message[:50] + ("..." if len(message) > 50 else "")
                self._sessions.update_session_title(session.id, title)

            await self.broadcast({
                "type": "stream_start",
                "agent_id": agent_id,
                "session_id": session.id,
            })

            # Update agent status → thinking
            await self._sessions.update_agent_status(agent_id, "thinking")
            await self.broadcast({
                "type": "agent_updated",
                "agent": await self._sessions.get_agent_dict(agent_id),
            })

            full_text = ""
            async for event in self._claude.send_message(session.id, message):
                if event["type"] == "assistant":
                    for block in event["blocks"]:
                        if block["type"] == "text":
                            full_text += block["text"]
                            await self.broadcast({
                                "type": "stream_text",
                                "agent_id": agent_id,
                                "session_id": session.id,
                                "text": block["text"],
                            })
                        elif block["type"] == "tool_use":
                            await self.broadcast({
                                "type": "stream_tool_use",
                                "agent_id": agent_id,
                                "session_id": session.id,
                                "tool_name": block.get("name", ""),
                                "tool_input": block.get("input", {}),
                            })
                        elif block["type"] == "tool_result":
                            await self.broadcast({
                                "type": "stream_tool_result",
                                "agent_id": agent_id,
                                "session_id": session.id,
                                "tool_name": block.get("name", ""),
                                "output": block.get("content", ""),
                            })
                elif event["type"] == "result":
                    if not full_text:
                        full_text = event.get("content", "")

            # Persist messages
            await self._sessions.save_messages(
                session.id, agent_id, message, full_text,
            )

            await self.broadcast({
                "type": "stream_end",
                "agent_id": agent_id,
                "session_id": session.id,
                "full_response": full_text,
            })

        except Exception as e:
            logger.exception("Streaming error for agent %s", agent_id)
            await self.broadcast({
                "type": "stream_error",
                "agent_id": agent_id,
                "session_id": session.id if session else "",
                "error": str(e),
            })
        finally:
            await self._sessions.update_agent_status(agent_id, "idle")
            await self.broadcast({
                "type": "agent_updated",
                "agent": await self._sessions.get_agent_dict(agent_id),
            })

    async def _handle_stop(self, data: dict):
        """Stop an ongoing generation."""
        session_id = data.get("session_id", "")
        if session_id and self._claude:
            try:
                await self._claude.stop_session(session_id)
            except Exception as e:
                logger.warning("Failed to stop session %s: %s", session_id, e)
