"""Chibi Office AI — Application Configuration."""

import os
from pathlib import Path


class Settings:
    """Application settings loaded from environment variables."""

    APP_NAME: str = "Chibi Office AI"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = os.getenv("CHIBI_DEBUG", "true").lower() == "true"

    # Database
    DATABASE_URL: str = os.getenv(
        "CHIBI_DATABASE_URL",
        f"sqlite:///{Path(__file__).parent / 'chibi.db'}"
    )

    # Server
    HOST: str = os.getenv("CHIBI_HOST", "127.0.0.1")
    PORT: int = int(os.getenv("CHIBI_PORT", "8420"))

    # Claude Code CLI
    CLAUDE_CLI: str = os.getenv("CLAUDE_CLI", "claude")
    CLAUDE_MODEL: str = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-5-20250929")
    SUBAGENT_MODEL: str = os.getenv("SUBAGENT_MODEL", "claude-sonnet-4-5-20250929")
    MAX_SUBAGENTS: int = int(os.getenv("MAX_SUBAGENTS", "5"))

    # Agent Teams (CLI multi-instance)
    TEAMMATE_MODE: str = os.getenv("TEAMMATE_MODE", "in-process")
    FILE_WATCHER_POLL_INTERVAL: float = float(
        os.getenv("FILE_WATCHER_POLL_INTERVAL", "1.5")
    )

    # Git Worktrees
    WORKTREE_BASE: str = os.getenv("CHIBI_WORKTREE_BASE", "worktrees")


settings = Settings()
