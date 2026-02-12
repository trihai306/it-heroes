"""Teams router — CLI Agent Teams management endpoints."""

import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session

from database import get_session
from models.project import Project
from models.agent import Agent, AgentStatus
from models.task import Task

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects/{project_id}/teams", tags=["Teams"])


# ─── Request/Response Schemas ─────────────────────────────────────────

class CreateTeamRequest(BaseModel):
    """Create a team with one natural language prompt."""
    prompt: str
    team_name: str = "chibi-team"
    model: str = ""


class CreateFromPresetRequest(BaseModel):
    """Create a team from a predefined preset."""
    preset_id: str  # fullstack, research, review, debug
    model: str = ""  # empty = use default


class StartAgentRequest(BaseModel):
    """Start a specific agent on a task."""
    agent_id: int
    task_id: int


class SendCommandRequest(BaseModel):
    """Send a command/message to the lead session."""
    message: str


class MessageRequest(BaseModel):
    """Send a message to a specific teammate."""
    to_agent_name: str
    message: str


class BroadcastRequest(BaseModel):
    """Broadcast a message to all teammates."""
    message: str


# ─── Helpers ──────────────────────────────────────────────────────────

def _get_orchestrator():
    """Lazy import unified orchestrator singleton."""
    from main import unified_orchestrator
    return unified_orchestrator


def _get_project(db: Session, project_id: int) -> Project:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    return project


# ═══════════════════════════════════════════════════════════════════════
# TEAM LIFECYCLE
# ═══════════════════════════════════════════════════════════════════════

@router.post("/create-from-preset")
async def create_team_from_preset(
    project_id: int,
    body: CreateFromPresetRequest,
    db: Session = Depends(get_session),
):
    """Create a team from a predefined preset using CLI Agent Teams."""
    project = _get_project(db, project_id)
    orch = _get_orchestrator()

    result = await orch.create_team_from_preset(
        db=db,
        project_id=project_id,
        preset_id=body.preset_id,
        repo_path=project.repo_path,
        project_name=project.name,
        model=body.model,
    )

    if "error" in result:
        raise HTTPException(400, result["error"])
    return result


@router.post("/create-from-prompt")
async def create_team_from_prompt(
    project_id: int,
    body: CreateTeamRequest,
    db: Session = Depends(get_session),
):
    """Create a team from a natural language prompt using CLI Agent Teams."""
    project = _get_project(db, project_id)
    orch = _get_orchestrator()

    result = await orch.create_team_from_prompt(
        db=db,
        project_id=project_id,
        prompt=body.prompt,
        team_name=body.team_name,
        repo_path=project.repo_path,
        model=body.model,
    )

    if "error" in result:
        raise HTTPException(400, result["error"])
    return result


@router.post("/dispatch")
async def dispatch_tasks(
    project_id: int,
    db: Session = Depends(get_session),
):
    """Dispatch pending tasks to teammates via the lead agent."""
    project = _get_project(db, project_id)
    orch = _get_orchestrator()

    started = await orch.dispatch_tasks(
        db=db,
        project_id=project_id,
        repo_path=project.repo_path,
        project_name=project.name,
    )
    return {"started": started, "count": len(started)}


@router.post("/start-agent")
async def start_agent(
    project_id: int,
    body: StartAgentRequest,
    db: Session = Depends(get_session),
):
    """Start a specific agent on a specific task."""
    project = _get_project(db, project_id)

    agent = db.get(Agent, body.agent_id)
    if not agent or agent.project_id != project_id:
        raise HTTPException(404, "Agent not found in this project")

    task = db.get(Task, body.task_id)
    if not task or task.project_id != project_id:
        raise HTTPException(404, "Task not found in this project")

    orch = _get_orchestrator()
    session = await orch.start_agent_on_task(
        db=db, agent=agent, task=task,
        project_name=project.name, repo_path=project.repo_path,
    )

    return {
        "agent_id": agent.id,
        "task_id": task.id,
        "session_status": session.status.value if session else "none",
    }


@router.post("/stop-agent")
async def stop_agent(
    project_id: int,
    body: StartAgentRequest,
    db: Session = Depends(get_session),
):
    """Stop a specific agent by messaging the lead."""
    agent = db.get(Agent, body.agent_id)
    if not agent or agent.project_id != project_id:
        raise HTTPException(404, "Agent not found in this project")

    orch = _get_orchestrator()
    result = await orch.send_command_to_lead(
        project_id, f"Ask teammate {agent.name} to shut down"
    )

    agent.status = AgentStatus.IDLE
    db.add(agent)
    db.commit()

    return {"stopped": True, "agent_id": agent.id}


# ═══════════════════════════════════════════════════════════════════════
# COMMUNICATION
# ═══════════════════════════════════════════════════════════════════════

@router.post("/command")
async def send_command(project_id: int, body: SendCommandRequest):
    """Send a command to the lead agent."""
    orch = _get_orchestrator()
    result = await orch.send_command_to_lead(project_id, body.message)
    if "error" in result:
        raise HTTPException(400, result["error"])
    return result


@router.post("/message")
async def send_message(project_id: int, body: MessageRequest):
    """Send a message to a specific teammate."""
    orch = _get_orchestrator()
    result = await orch.send_message(project_id, body.to_agent_name, body.message)
    if "error" in result:
        raise HTTPException(400, result["error"])
    return result


@router.post("/broadcast")
async def broadcast_message(project_id: int, body: BroadcastRequest):
    """Broadcast a message to all teammates."""
    orch = _get_orchestrator()
    result = await orch.broadcast_message(project_id, body.message)
    return result


@router.post("/cleanup")
async def cleanup_team(project_id: int, db: Session = Depends(get_session)):
    """Clean up the entire team — stop all agents, remove from DB."""
    orch = _get_orchestrator()
    return await orch.cleanup_team(db, project_id)


# ═══════════════════════════════════════════════════════════════════════
# STATUS & CONFIG
# ═══════════════════════════════════════════════════════════════════════

@router.get("")
async def get_team_status(project_id: int, db: Session = Depends(get_session)):
    """Get current team configuration and status."""
    orch = _get_orchestrator()
    return orch.get_team_status(db, project_id)


@router.get("/presets")
async def get_team_presets():
    """Get predefined team configurations."""
    orch = _get_orchestrator()
    return {"presets": orch.get_presets()}


@router.get("/prerequisites")
async def check_prerequisites():
    """Check if Claude CLI is available."""
    orch = _get_orchestrator()
    return await orch.check_prerequisites()


@router.get("/inboxes")
async def get_team_inboxes(project_id: int):
    """Get all inbox messages for the active team from ~/.claude/teams/."""
    orch = _get_orchestrator()
    state = orch._teams.get(project_id)
    if not state or not state.file_watcher:
        return {"inboxes": {}}
    return {"inboxes": state.file_watcher.read_all_inboxes()}


@router.get("/config")
async def get_team_config(project_id: int):
    """Get the Claude Code team config.json from ~/.claude/teams/."""
    orch = _get_orchestrator()
    state = orch._teams.get(project_id)
    if not state or not state.file_watcher:
        return {"config": None}
    return {"config": state.file_watcher.read_config()}


@router.get("/tasks")
async def get_claude_tasks(project_id: int):
    """Get tasks from the Claude Code shared task list (~/.claude/tasks/)."""
    orch = _get_orchestrator()
    state = orch._teams.get(project_id)
    if not state or not state.file_watcher:
        return {"tasks": []}
    return {"tasks": state.file_watcher.read_tasks()}
