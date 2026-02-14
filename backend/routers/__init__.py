from .agents import router as agents_router
from .tasks import router as tasks_router
from .projects import router as projects_router
from .sessions import router as sessions_router
from .chat import router as chat_router
from .notifications import router as notifications_router
from .setup import router as setup_router

__all__ = [
    "agents_router",
    "tasks_router",
    "projects_router",
    "sessions_router",
    "chat_router",
    "notifications_router",
    "setup_router",
]
