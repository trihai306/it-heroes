"""
Claude Service — core wrapper around Claude Agent SDK.
Manages ClaudeSDKClient instances and message streaming.
"""

from __future__ import annotations

import asyncio
import json
import logging
import shutil
from typing import Any, AsyncGenerator

from config import settings

logger = logging.getLogger(__name__)


def _sdk_available() -> bool:
    try:
        import claude_agent_sdk  # noqa: F401
        return True
    except ImportError:
        return False


class ClaudeService:
    """Manages Claude SDK clients and streaming."""

    def __init__(
        self,
        tool_registry: Any = None,
        hook_manager: Any = None,
    ):
        self._active_clients: dict[str, Any] = {}  # session_id → ClaudeSDKClient
        self._tool_registry = tool_registry
        self._hook_manager = hook_manager
        self._cli_available: bool | None = None

    async def check_cli_available(self) -> bool:
        """Verify Claude CLI is installed and accessible."""
        if settings.CLAUDE_CLI_PATH:
            self._cli_available = shutil.which(settings.CLAUDE_CLI_PATH) is not None
        else:
            self._cli_available = shutil.which("claude") is not None

        if not self._cli_available:
            logger.warning("Claude CLI not found in PATH")
        else:
            logger.info("Claude CLI found")
        return self._cli_available

    @property
    def cli_available(self) -> bool:
        if self._cli_available is None:
            if settings.CLAUDE_CLI_PATH:
                self._cli_available = shutil.which(settings.CLAUDE_CLI_PATH) is not None
            else:
                self._cli_available = shutil.which("claude") is not None
        return self._cli_available

    def build_options(self, agent: Any, project: Any | None = None) -> Any:
        """Build ClaudeAgentOptions from Agent + Project config."""
        from claude_agent_sdk import ClaudeAgentOptions

        allowed_tools = json.loads(agent.allowed_tools) if agent.allowed_tools else []
        if not allowed_tools:
            allowed_tools = list(settings.DEFAULT_ALLOWED_TOOLS)

        # Add custom MCP tool names
        if self._tool_registry:
            allowed_tools.extend(
                self._tool_registry.get_tool_names(agent.id),
            )

        kwargs: dict[str, Any] = {
            "system_prompt": agent.system_prompt,
            "allowed_tools": allowed_tools,
            "permission_mode": agent.permission_mode or settings.DEFAULT_PERMISSION_MODE,
            "max_turns": settings.DEFAULT_MAX_TURNS,
        }

        if settings.CLAUDE_CLI_PATH:
            kwargs["cli_path"] = settings.CLAUDE_CLI_PATH

        if project and project.path:
            kwargs["cwd"] = project.path

        # MCP servers
        if self._tool_registry:
            servers = self._tool_registry.get_servers(agent.id)
            if servers:
                kwargs["mcp_servers"] = servers

        # Hooks
        if self._hook_manager:
            hooks = self._hook_manager.get_hooks(agent.id)
            if hooks:
                kwargs["hooks"] = hooks

        return ClaudeAgentOptions(**kwargs)

    async def one_shot(
        self,
        prompt: str,
        agent: Any,
        project: Any | None = None,
    ) -> AsyncGenerator[dict, None]:
        """One-shot query using query() — yields message events."""
        from claude_agent_sdk import query

        options = self.build_options(agent, project)
        async for message in query(prompt=prompt, options=options):
            yield self._convert_message(message)

    async def start_session(
        self,
        session_id: str,
        agent: Any,
        project: Any | None = None,
    ) -> None:
        """Start a new interactive ClaudeSDKClient session."""
        from claude_agent_sdk import ClaudeSDKClient

        if session_id in self._active_clients:
            logger.warning("Session %s already active, closing old one", session_id)
            await self.stop_session(session_id)

        options = self.build_options(agent, project)
        client = ClaudeSDKClient(options=options)
        await client.__aenter__()
        self._active_clients[session_id] = client
        logger.info("Started SDK session %s for agent %s", session_id, agent.id)

    async def send_message(
        self,
        session_id: str,
        message: str,
    ) -> AsyncGenerator[dict, None]:
        """Send message to existing session, yield streaming events."""
        client = self._active_clients.get(session_id)
        if not client:
            raise ValueError(f"No active session: {session_id}")

        await client.query(message)
        async for msg in client.receive_response():
            yield self._convert_message(msg)

    async def stop_session(self, session_id: str) -> None:
        """Gracefully close a session."""
        client = self._active_clients.pop(session_id, None)
        if client:
            try:
                await client.__aexit__(None, None, None)
                logger.info("Stopped session %s", session_id)
            except Exception as e:
                logger.warning("Error closing session %s: %s", session_id, e)

    def is_session_active(self, session_id: str) -> bool:
        return session_id in self._active_clients

    async def shutdown(self):
        """Stop all active sessions (called on app shutdown)."""
        session_ids = list(self._active_clients.keys())
        for sid in session_ids:
            await self.stop_session(sid)
        logger.info("Shut down %d sessions", len(session_ids))

    def _convert_message(self, message: Any) -> dict:
        """Convert SDK message to WS-friendly dict."""
        try:
            from claude_agent_sdk import (
                AssistantMessage,
                ResultMessage,
                SystemMessage,
                TextBlock,
                ToolResultBlock,
                ToolUseBlock,
            )
        except ImportError:
            return {"type": "unknown", "content": str(message)}

        if isinstance(message, AssistantMessage):
            blocks = []
            for block in message.content:
                if isinstance(block, TextBlock):
                    blocks.append({"type": "text", "text": block.text})
                elif isinstance(block, ToolUseBlock):
                    blocks.append({
                        "type": "tool_use",
                        "id": block.id,
                        "name": block.name,
                        "input": block.input,
                    })
                elif isinstance(block, ToolResultBlock):
                    content = block.content
                    if isinstance(content, list):
                        content = "\n".join(
                            item.get("text", str(item))
                            if isinstance(item, dict) else str(item)
                            for item in content
                        )
                    blocks.append({
                        "type": "tool_result",
                        "tool_use_id": block.tool_use_id,
                        "content": str(content),
                    })
                else:
                    blocks.append({
                        "type": "unknown_block",
                        "content": str(block),
                    })
            return {"type": "assistant", "blocks": blocks}

        elif isinstance(message, ResultMessage):
            text = ""
            if hasattr(message, "content"):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        text += block.text
            return {"type": "result", "content": text or str(message)}

        elif isinstance(message, SystemMessage):
            return {"type": "system", "content": str(message)}

        return {"type": "unknown", "content": str(message)}
