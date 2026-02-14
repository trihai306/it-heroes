"""
Application settings — loaded from environment / .env file.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./it_heroes.db"
    CLAUDE_CLI_PATH: str | None = None
    DEFAULT_MODEL: str = "sonnet"
    DEFAULT_PERMISSION_MODE: str = "acceptEdits"
    DEFAULT_ALLOWED_TOOLS: list[str] = [
        "Read", "Write", "Edit", "Bash", "Glob", "Grep",
    ]
    DEFAULT_MAX_TURNS: int = 25

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
