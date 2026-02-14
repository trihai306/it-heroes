"""
Tool Registry — register and manage custom MCP tools per agent.
Uses claude_agent_sdk's @tool decorator and create_sdk_mcp_server.
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


class ToolRegistry:
    """Register and manage custom MCP tools per agent."""

    def __init__(self):
        self._agent_tools: dict[str, list] = {}  # agent_id → [tool_fns]
        self._global_tools: list = []
        self._servers: dict[str, Any] = {}  # agent_id → compiled MCP server

    def register_global_tool(self, tool_fn):
        """Register a tool available to all agents."""
        self._global_tools.append(tool_fn)
        self._invalidate_all_servers()

    def register_agent_tool(self, agent_id: str, tool_fn):
        """Register a tool for a specific agent."""
        if agent_id not in self._agent_tools:
            self._agent_tools[agent_id] = []
        self._agent_tools[agent_id].append(tool_fn)
        self._servers.pop(agent_id, None)

    def get_servers(self, agent_id: str) -> dict[str, Any]:
        """Get MCP servers dict for ClaudeAgentOptions.mcp_servers."""
        tools = self._global_tools + self._agent_tools.get(agent_id, [])
        if not tools:
            return {}

        if agent_id not in self._servers:
            try:
                from claude_agent_sdk import create_sdk_mcp_server
                server = create_sdk_mcp_server(
                    name=f"it-heroes-{agent_id}",
                    version="1.0.0",
                    tools=tools,
                )
                self._servers[agent_id] = server
            except ImportError:
                logger.warning("claude_agent_sdk not installed, skipping MCP servers")
                return {}

        return {"it_heroes": self._servers[agent_id]}

    def get_tool_names(self, agent_id: str) -> list[str]:
        """Get list of custom tool names for allowed_tools config."""
        tools = self._global_tools + self._agent_tools.get(agent_id, [])
        names = []
        for t in tools:
            name = getattr(t, "name", getattr(t, "__name__", "unknown"))
            names.append(f"mcp__it_heroes__{name}")
        return names

    def list_tools(self, agent_id: str | None = None) -> list[dict]:
        """List available tools for an agent (or all global tools)."""
        tools = list(self._global_tools)
        if agent_id and agent_id in self._agent_tools:
            tools.extend(self._agent_tools[agent_id])
        return [
            {
                "name": getattr(t, "name", getattr(t, "__name__", "unknown")),
                "description": getattr(t, "description", ""),
            }
            for t in tools
        ]

    def _invalidate_all_servers(self):
        self._servers.clear()
