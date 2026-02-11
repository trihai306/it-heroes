"""Auth router — Claude Code authentication status and login trigger."""

import logging
from fastapi import APIRouter

from services.auth import (
    get_auth_token,
    get_oauth_token,
    get_api_key,
    get_auth_source,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/status")
async def auth_status():
    """
    Check current Claude authentication status.

    Returns info about the auth state so the frontend can show
    a login screen if needed.
    """
    token = get_auth_token()
    source = get_auth_source()
    is_oauth = bool(get_oauth_token())
    has_api_key = bool(get_api_key())

    return {
        "authenticated": bool(token),
        "source": source if token else None,
        "is_oauth": is_oauth,
        "has_api_key": has_api_key,
        "token_preview": f"{token[:12]}..." if token else None,
        "login_instructions": _get_login_instructions() if not token else None,
    }


@router.post("/refresh")
async def auth_refresh():
    """
    Re-check auth token (e.g., after user runs `claude /login`).

    The auth module reads from Keychain/env vars each time,
    so this just triggers a fresh check.
    """
    token = get_auth_token()
    source = get_auth_source()

    if token:
        logger.info(f"✅ Auth refreshed: {source}")
    else:
        logger.warning("❌ Auth refresh: still no token found")

    return {
        "authenticated": bool(token),
        "source": source if token else None,
        "token_preview": f"{token[:12]}..." if token else None,
    }


def _get_login_instructions():
    """Generate platform-specific login instructions."""
    return {
        "steps": [
            {
                "step": 1,
                "title": "Cài Claude Code CLI",
                "command": "npm install -g @anthropic-ai/claude-code",
                "description": "Cài Claude Code CLI qua npm (cần Node.js)",
            },
            {
                "step": 2,
                "title": "Đăng nhập tài khoản Claude",
                "command": "claude /login",
                "description": "Mở trình duyệt để đăng nhập vào Claude (Pro/Max)",
            },
            {
                "step": 3,
                "title": "Kiểm tra kết nối",
                "command": "claude --version",
                "description": "Xác nhận CLI đã kết nối thành công",
            },
        ],
        "alternative": {
            "title": "Hoặc dùng API Key",
            "description": "Set ANTHROPIC_API_KEY trong file .env",
            "command": "export ANTHROPIC_API_KEY='sk-ant-...'",
        },
    }
