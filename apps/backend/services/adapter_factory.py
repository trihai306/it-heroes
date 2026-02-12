"""Adapter Factory — selects the right Claude adapter based on configuration.

Modes:
  - "agent-sdk": Use Claude Agent SDK (requires `claude-agent-sdk` + CLI)
  - "sdk":       Use Anthropic SDK direct API (requires OAuth token or API key)
  - "cli":       Use Claude CLI subprocess (requires `claude` binary)
  - "auto":      Try Agent SDK → Anthropic SDK → CLI (in priority order)
"""

import logging

from config import settings
from services.auth import get_auth_token

logger = logging.getLogger(__name__)


def _is_agent_sdk_available() -> bool:
    """Check if claude-agent-sdk package is installed."""
    try:
        import claude_agent_sdk  # noqa: F401
        return True
    except ImportError:
        return False


def create_adapter(mode: str = "auto"):
    """
    Create the appropriate Claude adapter based on mode.

    Priority in "auto" mode:
    1. Agent SDK (if claude-agent-sdk is installed + CLI available)
    2. Anthropic SDK (if auth token found)
    3. Claude CLI subprocess (fallback)

    Returns:
        An instance of ClaudeAgentSDKAdapter, AnthropicSDKAdapter, or ClaudeCodeAdapter
    """
    if mode == "agent-sdk":
        from services.agent_sdk_adapter import ClaudeAgentSDKAdapter

        adapter = ClaudeAgentSDKAdapter()
        if not _is_agent_sdk_available():
            logger.warning(
                "agent-sdk mode requested but claude-agent-sdk not installed. "
                "Install with: pip install claude-agent-sdk"
            )
        logger.info("🚀 Using Claude Agent SDK adapter")
        return adapter

    elif mode == "sdk":
        from services.anthropic_adapter import AnthropicSDKAdapter

        adapter = AnthropicSDKAdapter()
        if not adapter._auth_token:
            logger.warning(
                "SDK mode requested but no auth token found. "
                "Run `claude /login` or set ANTHROPIC_API_KEY."
            )
        logger.info("🧠 Using Anthropic SDK adapter (direct API)")
        return adapter

    elif mode == "cli":
        from services.claude_adapter import ClaudeCodeAdapter

        adapter = ClaudeCodeAdapter()
        logger.info("⌨️  Using Claude CLI adapter (subprocess)")
        return adapter

    else:  # "auto"
        # 1. Prefer Agent SDK if package is available
        if _is_agent_sdk_available():
            from services.agent_sdk_adapter import ClaudeAgentSDKAdapter

            adapter = ClaudeAgentSDKAdapter()
            logger.info(
                "🚀 Auto-selected: Claude Agent SDK adapter (package found)"
            )
            return adapter

        # 2. Fallback to Anthropic SDK if auth token available
        auth_token = get_auth_token()
        if auth_token:
            from services.anthropic_adapter import AnthropicSDKAdapter

            adapter = AnthropicSDKAdapter()
            logger.info(
                "🧠 Auto-selected: Anthropic SDK adapter (auth token found)"
            )
            return adapter

        # 3. Fallback to CLI
        from services.claude_adapter import ClaudeCodeAdapter

        adapter = ClaudeCodeAdapter()
        logger.info(
            "⌨️  Auto-selected: Claude CLI adapter "
            "(no agent-sdk/auth token, run `claude /login` to enable SDK mode)"
        )
        return adapter
