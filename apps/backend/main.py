"""Chibi Office AI — FastAPI Application Entry Point."""

import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import create_db_and_tables
from routers import projects, tasks, agents
from routers.orchestration import router as orchestration_router
from routers.filesystem import router as filesystem_router
from routers.workflows import router as workflows_router
from routers.auth import router as auth_router
from routers.teams import router as teams_router
from routers.system import router as system_router
from websocket.manager import ConnectionManager
from websocket.events import WSEvent
from services.agent_orchestrator import AgentOrchestrator
from services.simulation import SimulationEngine
from services.team_manager import TeamManager

# ─── Logging ───────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("chibi")


# ─── App lifecycle ─────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info(f"🏢 {settings.APP_NAME} v{settings.APP_VERSION} starting...")
    create_db_and_tables()
    logger.info("✅ Database tables created")
    # Start simulation engine
    await simulation.start()
    logger.info("✅ Simulation engine started")
    yield
    # Graceful shutdown: stop all agents
    logger.info("👋 Shutting down...")
    await simulation.stop()
    await orchestrator.claude.stop_all()
    logger.info("✅ All agent sessions stopped")


# ─── App ───────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Electron renderer
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared WebSocket manager + Orchestrator + Simulation singletons
ws_manager = ConnectionManager()
orchestrator = AgentOrchestrator(ws_manager)
simulation = SimulationEngine(ws_manager)
team_manager = TeamManager(ws_manager)

# ─── REST Routers ──────────────────────────────────────────────────────

app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(agents.router)
app.include_router(orchestration_router)
app.include_router(filesystem_router)
app.include_router(workflows_router)
app.include_router(auth_router)
app.include_router(teams_router)
app.include_router(system_router)


# ─── WebSocket ─────────────────────────────────────────────────────────

@app.websocket("/ws/projects/{project_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: int):
    """WebSocket connection per project for realtime events."""
    await ws_manager.connect(websocket, project_id)
    try:
        # Send welcome event
        await ws_manager.send_personal(
            websocket,
            WSEvent(type="connected", data={"project_id": project_id}),
        )

        # Keep alive — listen for client messages
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                msg_type = msg.get("type", "")

                if msg_type == "positions.sync" and msg.get("data"):
                    # Client is syncing its local walk positions to the server
                    simulation.receive_client_sync(msg["data"])
                else:
                    logger.debug(f"WS recv project={project_id}: {msg_type}")
            except (json.JSONDecodeError, Exception):
                logger.debug(f"WS recv project={project_id}: {data[:80]}")

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, project_id)
        logger.info(f"WS client disconnected from project {project_id}")


# ─── Health ────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    """Health check endpoint for Electron to poll."""
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@app.get("/")
def root():
    """Root endpoint with API info."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
    }


# ─── Run directly ─────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
