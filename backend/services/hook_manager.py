"""
Hook Manager — manage PreToolUse / PostToolUse hooks per agent.
Provides default safety hooks to block dangerous commands.
"""

from __future__ import annotations

import logging
from typing import Any, Callable

logger = logging.getLogger(__name__)

# Patterns blocked by default safety hook
BLOCKED_PATTERNS = [
    "rm -rf /",
    "rm -rf ~",
    "sudo rm",
    "mkfs",
    ":(){:|:&};:",
    "dd if=/dev/zero",
    "> /dev/sda",
]


async def default_safety_hook(
    input_data: dict, tool_use_id: str, context: Any,
) -> dict:
    """Block dangerous bash commands."""
    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})

    if tool_name != "Bash":
        return {}

    command = tool_input.get("command", "")
    for pattern in BLOCKED_PATTERNS:
        if pattern in command:
            return {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": (
                        f"Blocked: command contains dangerous pattern '{pattern}'"
                    ),
                },
            }
    return {}


class HookManager:
    """Manage PreToolUse/PostToolUse hooks per agent."""

    def __init__(self):
        self._hooks: dict[str, dict[str, list]] = {}
        # agent_id → {"PreToolUse": [callbacks], "PostToolUse": [callbacks]}
        self._global_hooks: dict[str, list[Callable]] = {
            "PreToolUse": [default_safety_hook],
            "PostToolUse": [],
        }

    def register_hook(
        self,
        agent_id: str,
        event: str,
        matcher: str,
        callback: Callable,
    ):
        """Register a hook for a specific agent."""
        if agent_id not in self._hooks:
            self._hooks[agent_id] = {"PreToolUse": [], "PostToolUse": []}
        self._hooks[agent_id].setdefault(event, []).append(
            (matcher, callback),
        )

    def get_hooks(self, agent_id: str) -> dict:
        """Get hooks dict for ClaudeAgentOptions.hooks."""
        try:
            from claude_agent_sdk import HookMatcher
        except ImportError:
            return {}

        result: dict[str, list] = {}

        for event in ("PreToolUse", "PostToolUse"):
            matchers = []

            # Global hooks
            for callback in self._global_hooks.get(event, []):
                matchers.append(
                    HookMatcher(matcher="*", hooks=[callback]),
                )

            # Agent-specific hooks
            for matcher_str, callback in (
                self._hooks.get(agent_id, {}).get(event, [])
            ):
                matchers.append(
                    HookMatcher(matcher=matcher_str, hooks=[callback]),
                )

            if matchers:
                result[event] = matchers

        return result

    def list_hooks(self, agent_id: str | None = None) -> dict:
        """List registered hooks."""
        if agent_id:
            return self._hooks.get(agent_id, {})
        return {
            "global": {
                k: len(v) for k, v in self._global_hooks.items()
            },
            "agents": {
                aid: {k: len(v) for k, v in hooks.items()}
                for aid, hooks in self._hooks.items()
            },
        }
