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

    # Adapter mode: "agent-sdk", "sdk", "cli", or "auto"
    # auto = Agent SDK if installed, else SDK if API key present, else CLI
    CLAUDE_ADAPTER_MODE: str = os.getenv("CLAUDE_ADAPTER_MODE", "auto")

    # Claude Agent SDK settings (for "agent-sdk" adapter mode)
    AGENT_SDK_ALLOWED_TOOLS: list[str] = os.getenv(
        "AGENT_SDK_ALLOWED_TOOLS",
        "Bash,Read,Write,Edit,Glob,Grep,WebFetch,WebSearch",
    ).split(",")
    AGENT_SDK_MAX_TURNS: int = int(os.getenv("AGENT_SDK_MAX_TURNS", "200"))
    AGENT_SDK_SANDBOX: bool = os.getenv("AGENT_SDK_SANDBOX", "false").lower() == "true"

    # Agent Teams / Subagents
    SUBAGENT_MODEL: str = os.getenv("SUBAGENT_MODEL", "claude-sonnet-4-5-20250929")
    MAX_SUBAGENTS: int = int(os.getenv("MAX_SUBAGENTS", "5"))

    # Git Worktrees
    WORKTREE_BASE: str = os.getenv("CHIBI_WORKTREE_BASE", "worktrees")


settings = Settings()
