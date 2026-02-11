"""Adapter Factory — selects the right Claude adapter based on configuration.

Modes:
  - "sdk":  Always use Anthropic SDK (requires OAuth token or API key)
  - "cli":  Always use Claude CLI subprocess (requires `claude` binary)
  - "auto": Try SDK first (if any auth token found), fallback to CLI
"""

import logging

from config import settings
from services.auth import get_auth_token

logger = logging.getLogger(__name__)


def create_adapter(mode: str = "auto"):
    """
    Create the appropriate Claude adapter based on mode.

    Auth token sources (checked in order):
    1. CLAUDE_CODE_OAUTH_TOKEN env var (from `claude /login`)
    2. ANTHROPIC_AUTH_TOKEN env var (enterprise)
    3. macOS Keychain (after `claude /login`)
    4. ~/.claude/.credentials.json
    5. ANTHROPIC_API_KEY env var (direct API billing)

    Returns:
        An instance of AnthropicSDKAdapter or ClaudeCodeAdapter
    """
    if mode == "sdk":
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
        # Prefer SDK if any auth token is available (OAuth or API key)
        auth_token = get_auth_token()
        if auth_token:
            from services.anthropic_adapter import AnthropicSDKAdapter

            adapter = AnthropicSDKAdapter()
            logger.info(
                "🧠 Auto-selected: Anthropic SDK adapter (auth token found)"
            )
            return adapter
        else:
            from services.claude_adapter import ClaudeCodeAdapter

            adapter = ClaudeCodeAdapter()
            logger.info(
                "⌨️  Auto-selected: Claude CLI adapter "
                "(no auth token, run `claude /login` to enable SDK mode)"
            )
            return adapter

