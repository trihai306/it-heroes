"""
SQLite database engine and session helpers.
"""

from sqlmodel import SQLModel, Session, create_engine

from config import settings

engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)


def init_db():
    """Create all tables."""
    SQLModel.metadata.create_all(engine)


def get_db() -> Session:
    """FastAPI dependency — yields a DB session."""
    with Session(engine) as session:
        yield session
