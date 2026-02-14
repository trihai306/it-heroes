"""
IT Heroes — Multi-Agent Backend v2
FastAPI server with Claude Agent SDK integration.

Run: uvicorn main:app --reload --port 8000
"""

import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from config import settings
from database import engine, init_db
from models import Agent
from routers import (
    agents_router,
    chat_router,
    notifications_router,
    projects_router,
    sessions_router,
    setup_router,
    tasks_router,
)
from routers.chat import set_services as chat_set_services
from routers.sessions import set_session_manager as sessions_set_sm
from services.claude_service import ClaudeService
from services.hook_manager import HookManager
from services.session_manager import SessionManager
from services.tool_registry import ToolRegistry
from ws import WSManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Singletons ─────────────────────────────────────────────────

tool_registry = ToolRegistry()
hook_manager = HookManager()
claude_service = ClaudeService(
    tool_registry=tool_registry,
    hook_manager=hook_manager,
)
session_manager = SessionManager(claude_service, engine)
ws_manager = WSManager()


def _seed_defaults():
    """Create default agents if DB is empty."""
    with Session(engine) as db:
        count = len(db.exec(select(Agent)).all())
        if count > 0:
            return

        defaults = [
            {"name": "Director", "role": "orchestrator", "avatar": "\U0001f3af"},
            {"name": "Scout", "role": "researcher", "avatar": "\U0001f52c"},
            {"name": "Builder", "role": "coder", "avatar": "\U0001f4bb"},
            {"name": "Inspector", "role": "reviewer", "avatar": "\U0001f50e"},
        ]
        for cfg in defaults:
            agent = Agent(
                name=cfg["name"],
                role=cfg["role"],
                avatar=cfg["avatar"],
                system_prompt=Agent.default_prompt(cfg["role"]),
                allowed_tools=json.dumps(list(settings.DEFAULT_ALLOWED_TOOLS)),
                permission_mode=settings.DEFAULT_PERMISSION_MODE,
                model=settings.DEFAULT_MODEL,
            )
            db.add(agent)
        db.commit()
        logger.info("Seeded %d default agents", len(defaults))


# ── Lifespan ───────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Init DB
    init_db()
    # _seed_defaults()  # Disabled — users create agents via UI

    # Check CLI
    cli_ok = await claude_service.check_cli_available()
    if not cli_ok:
        logger.warning(
            "Claude CLI not found! Install: curl -fsSL https://claude.ai/install.sh | bash"
        )

    # Wire services
    ws_manager.set_services(claude_service, session_manager)
    chat_set_services(claude_service, session_manager)
    sessions_set_sm(session_manager)

    # Wire notification service with WS manager
    from services.notification_service import set_ws_manager
    set_ws_manager(ws_manager)

    # Cleanup stale sessions from previous runs
    await session_manager.cleanup_stale_sessions()

    logger.info("IT Heroes Backend v2 started (CLI available: %s)", cli_ok)
    yield

    # Shutdown
    await claude_service.shutdown()
    logger.info("IT Heroes Backend v2 shut down")


# ── FastAPI App ────────────────────────────────────────────────

app = FastAPI(
    title="IT Heroes Multi-Agent API",
    description="Backend API for managing AI agents with Claude Agent SDK",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────

app.include_router(agents_router, prefix="/api")
app.include_router(tasks_router, prefix="/api")
app.include_router(projects_router, prefix="/api")
app.include_router(sessions_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(setup_router, prefix="/api")


# ── System endpoints ──────────────────────────────────────────

@app.get("/api/health")
def health_check():
    from datetime import datetime
    with Session(engine) as db:
        agents_count = len(db.exec(select(Agent)).all())
    return {
        "status": "healthy",
        "version": "2.0.0",
        "cli_available": claude_service.cli_available,
        "timestamp": datetime.now().isoformat(),
        "agents_count": agents_count,
    }


@app.get("/api/stats")
def get_stats():
    from models import Task
    with Session(engine) as db:
        agents = db.exec(select(Agent)).all()
        tasks = db.exec(select(Task)).all()
    return {
        "total_agents": len(agents),
        "active_agents": sum(1 for a in agents if a.status == "active"),
        "idle_agents": sum(1 for a in agents if a.status == "idle"),
        "total_tasks": len(tasks),
        "pending_tasks": sum(1 for t in tasks if t.status == "pending"),
        "in_progress_tasks": sum(1 for t in tasks if t.status == "in_progress"),
        "completed_tasks": sum(1 for t in tasks if t.status == "completed"),
    }


@app.get("/api/config")
def get_config():
    import subprocess, shutil
    cli_path = settings.CLAUDE_CLI_PATH or shutil.which("claude") or ""
    cli_version = ""
    cli_available = False
    if cli_path:
        try:
            result = subprocess.run(
                [cli_path, "--version"],
                capture_output=True, text=True, timeout=5,
            )
            cli_version = result.stdout.strip()
            cli_available = result.returncode == 0
        except Exception:
            pass
    return {
        "default_model": settings.DEFAULT_MODEL,
        "permission_mode": settings.DEFAULT_PERMISSION_MODE,
        "max_turns": settings.DEFAULT_MAX_TURNS,
        "claude_cli_path": settings.CLAUDE_CLI_PATH or "",
        "allowed_tools": list(settings.DEFAULT_ALLOWED_TOOLS),
        "cli_status": {
            "available": cli_available,
            "version": cli_version,
            "path": cli_path,
        },
    }


@app.put("/api/config")
def update_config(data: dict):
    if "default_model" in data:
        settings.DEFAULT_MODEL = data["default_model"]
    if "permission_mode" in data:
        settings.DEFAULT_PERMISSION_MODE = data["permission_mode"]
    if "max_turns" in data:
        settings.DEFAULT_MAX_TURNS = int(data["max_turns"])
    if "claude_cli_path" in data and data["claude_cli_path"]:
        settings.CLAUDE_CLI_PATH = data["claude_cli_path"]
    if "allowed_tools" in data:
        settings.DEFAULT_ALLOWED_TOOLS = data["allowed_tools"]
    return {"status": "ok"}


# ── WebSocket ─────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Send initial state
        with Session(engine) as db:
            agents = [a.to_api_dict() for a in db.exec(select(Agent)).all()]
            from models import Task
            tasks = [t.model_dump() for t in db.exec(select(Task)).all()]

        await websocket.send_json({
            "type": "init",
            "agents": agents,
            "tasks": tasks,
        })

        # Message loop
        while True:
            raw = await websocket.receive_text()
            await ws_manager.handle_message(websocket, raw)

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
