"""Authentication helpers for Claude Code integration.

Reads OAuth tokens from multiple sources:
1. CLAUDE_CODE_OAUTH_TOKEN env var
2. ANTHROPIC_AUTH_TOKEN env var
3. ANTHROPIC_API_KEY env var (fallback for direct API usage)
4. macOS Keychain / ~/.claude/.credentials.json

Based on patterns from Auto-Claude's core/auth.py.
"""

import json
import logging
import os
import subprocess
import sys
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# OAuth env vars (checked in priority order)
AUTH_TOKEN_ENV_VARS = [
    "CLAUDE_CODE_OAUTH_TOKEN",   # OAuth token from `claude /login`
    "ANTHROPIC_AUTH_TOKEN",       # Enterprise/proxy setups
]


def _get_token_from_macos_keychain() -> Optional[str]:
    """
    Read OAuth token from macOS Keychain.

    Claude Code CLI stores credentials after `claude /login` in Keychain
    under the service name "Claude Code-credentials".

    The stored JSON structure:
    {
        "claudeAiOauth": {
            "accessToken": "sk-ant-oat01-..."
        }
    }
    """
    try:
        result = subprocess.run(
            [
                "/usr/bin/security",
                "find-generic-password",
                "-s", "Claude Code-credentials",
                "-w",
            ],
            capture_output=True,
            text=True,
            timeout=5,
        )

        if result.returncode != 0:
            logger.debug("No Claude Code credentials in Keychain")
            return None

        credentials_json = result.stdout.strip()
        if not credentials_json:
            return None

        data = json.loads(credentials_json)
        token = data.get("claudeAiOauth", {}).get("accessToken")

        if not token:
            logger.debug("Keychain entry found but no accessToken")
            return None

        # OAuth tokens start with sk-ant-oat01-
        if token.startswith("sk-ant-oat01-"):
            logger.info("✅ Found OAuth token in macOS Keychain")
            return token

        # Encrypted tokens (enc:) — not supported yet
        if token.startswith("enc:"):
            logger.warning(
                "Found encrypted token in Keychain. "
                "Run `claude /login` to refresh, or set CLAUDE_CODE_OAUTH_TOKEN."
            )
            return None

        return None

    except (subprocess.TimeoutExpired, json.JSONDecodeError, Exception) as e:
        logger.debug(f"Keychain read failed: {e}")
        return None


def _get_token_from_credential_files() -> Optional[str]:
    """
    Read OAuth token from Claude Code credential files.

    Claude Code stores credentials in ~/.claude/.credentials.json
    """
    home = Path.home()
    cred_paths = [
        home / ".claude" / ".credentials.json",
        home / ".claude" / "credentials.json",
    ]

    for cred_path in cred_paths:
        if cred_path.exists():
            try:
                data = json.loads(cred_path.read_text(encoding="utf-8"))
                oauth_data = (
                    data.get("claudeAiOauth")
                    or data.get("oauthAccount")
                    or {}
                )
                token = oauth_data.get("accessToken")

                if token and token.startswith("sk-ant-oat01-"):
                    logger.info(f"✅ Found OAuth token in {cred_path}")
                    return token

            except (json.JSONDecodeError, Exception) as e:
                logger.debug(f"Failed to read {cred_path}: {e}")
                continue

    return None


def get_oauth_token() -> Optional[str]:
    """
    Get Claude Code OAuth token from all available sources.

    Priority order:
    1. CLAUDE_CODE_OAUTH_TOKEN env var
    2. ANTHROPIC_AUTH_TOKEN env var
    3. macOS Keychain (if on macOS)
    4. ~/.claude/.credentials.json file

    Returns:
        OAuth token string, or None if not found
    """
    # 1. Check env vars
    for var in AUTH_TOKEN_ENV_VARS:
        token = os.environ.get(var)
        if token:
            logger.info(f"✅ Using OAuth token from {var}")
            return token

    # 2. macOS Keychain
    if sys.platform == "darwin":
        token = _get_token_from_macos_keychain()
        if token:
            return token

    # 3. Credential files
    token = _get_token_from_credential_files()
    if token:
        return token

    return None


def get_api_key() -> Optional[str]:
    """
    Get API key for direct Anthropic API usage.

    This is separate from OAuth — its the standard ANTHROPIC_API_KEY
    for direct billing to the user's API account.
    """
    return os.environ.get("ANTHROPIC_API_KEY") or None


def get_auth_token() -> Optional[str]:
    """
    Get the best available authentication token.

    Tries OAuth first (from Claude Code login), then falls back to API key.
    """
    # Prefer OAuth (uses Claude Pro/Max subscription, no API billing)
    token = get_oauth_token()
    if token:
        return token

    # Fallback to API key (direct billing)
    api_key = get_api_key()
    if api_key:
        logger.info("✅ Using ANTHROPIC_API_KEY (direct API billing)")
        return api_key

    return None


def get_auth_source() -> str:
    """Describe where the auth token was found."""
    for var in AUTH_TOKEN_ENV_VARS:
        if os.environ.get(var):
            return var

    if sys.platform == "darwin" and _get_token_from_macos_keychain():
        return "macOS Keychain"

    if _get_token_from_credential_files():
        return "~/.claude/.credentials.json"

    if os.environ.get("ANTHROPIC_API_KEY"):
        return "ANTHROPIC_API_KEY"

    return "none"
