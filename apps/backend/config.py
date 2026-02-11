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

    # Claude Code — CLI mode
    CLAUDE_CLI: str = os.getenv("CLAUDE_CLI", "claude")
    AGENT_TEAMS_ENABLED: bool = (
        os.getenv("CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS", "0") == "1"
    )

    # Claude Code — SDK mode (Anthropic API)
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    CLAUDE_MODEL: str = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-5-20250929")
    CLAUDE_MAX_TOKENS: int = int(os.getenv("CLAUDE_MAX_TOKENS", "8192"))

    # Adapter mode: "sdk", "cli", or "auto" (auto = SDK if API key present, else CLI)
    CLAUDE_ADAPTER_MODE: str = os.getenv("CLAUDE_ADAPTER_MODE", "auto")

    # Git Worktrees
    WORKTREE_BASE: str = os.getenv("CHIBI_WORKTREE_BASE", "worktrees")


settings = Settings()
