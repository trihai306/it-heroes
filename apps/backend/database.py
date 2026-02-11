"""Chibi Office AI — Database engine and session management."""

from sqlmodel import Session, SQLModel, create_engine

from config import settings

engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    connect_args={"check_same_thread": False},  # SQLite needs this for FastAPI
)


def create_db_and_tables():
    """Create all tables defined by SQLModel metadata."""
    SQLModel.metadata.create_all(engine)


def get_session():
    """FastAPI dependency: yield a database session."""
    with Session(engine) as session:
        yield session
