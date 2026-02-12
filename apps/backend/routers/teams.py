"""Teams router — Unified Agent Teams management endpoints.

Supports both:
- Unified orchestrator (SDK subagents + CLI fallback)
- Legacy team manager (backward compat)
"""

import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models.project import Project
from models.agent import Agent, AgentRole, AgentStatus
from models.task import Task

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects/{project_id}/teams", tags=["Teams"])


# ─── Request/Response Schemas ─────────────────────────────────────────

class CreateTeamRequest(BaseModel):
    """Create a team with one natural language prompt."""
    prompt: str
    team_name: str = "chibi-team"
    model: str = "claude-sonnet-4-5-20250929"


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


class AddTeammateRequest(BaseModel):
    """Request to add a teammate via prompt."""
    prompt: str


# ─── Helpers ──────────────────────────────────────────────────────────

def _get_unified_orchestrator():
    """Lazy import unified orchestrator singleton."""
    from main import unified_orchestrator
    return unified_orchestrator


def _get_team_manager():
    """Lazy import legacy team manager singleton."""
    from main import team_manager
    return team_manager



def _get_project(db: Session, project_id: int) -> Project:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    return project


# ═══════════════════════════════════════════════════════════════════════
# UNIFIED ENDPOINTS (new)
# ═══════════════════════════════════════════════════════════════════════

@router.post("/create-from-preset")
async def create_team_from_preset(
    project_id: int,
    body: CreateFromPresetRequest,
    db: Session = Depends(get_session),
):
    """
    Create a team from a predefined preset (fullstack, research, review, debug).

    Creates all agent records, worktrees, and initializes the team.
    """
    project = _get_project(db, project_id)
    orch = _get_unified_orchestrator()

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
    """
    Create a team from a natural language prompt.

    The lead agent analyzes the prompt and delegates to subagents.
    """
    project = _get_project(db, project_id)
    orch = _get_unified_orchestrator()

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
    """
    Auto-assign pending tasks to agents and start them.

    Uses TaskDispatcher to match tasks to agents by role.
    """
    project = _get_project(db, project_id)
    orch = _get_unified_orchestrator()

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

    orch = _get_unified_orchestrator()
    session = await orch.start_agent_on_task(
        db=db,
        agent=agent,
        task=task,
        project_name=project.name,
        repo_path=project.repo_path,
    )

    return {
        "agent_id": agent.id,
        "task_id": task.id,
        "session_status": session.status.value,
    }


@router.post("/stop-agent")
async def stop_agent(
    project_id: int,
    body: StartAgentRequest,  # reuse — just needs agent_id
    db: Session = Depends(get_session),
):
    """Stop a specific agent."""
    agent = db.get(Agent, body.agent_id)
    if not agent or agent.project_id != project_id:
        raise HTTPException(404, "Agent not found in this project")

    orch = _get_unified_orchestrator()

    # Cancel agent monitor (gracefully stops the running query)
    monitor = orch._agent_monitors.pop(agent.id, None)
    if monitor and not monitor.done():
        monitor.cancel()
        try:
            await monitor
        except asyncio.CancelledError:
            pass

    agent.status = AgentStatus.IDLE
    db.add(agent)
    db.commit()

    return {"stopped": True, "agent_id": agent.id}


@router.get("/output")
async def get_team_output(
    project_id: int,
    agent_id: int = 0,
    last_n: int = 50,
):
    """
    Get output lines. If agent_id is provided, get per-agent output.
    Otherwise returns lead session output.
    """
    # For now, use legacy team manager output
    tm = _get_team_manager()
    output = tm.get_agent_output(last_n)
    return {"output": output, "count": len(output)}


@router.get("/prerequisites")
async def check_prerequisites():
    """Check if required tools (SDK, CLI) are available."""
    orch = _get_unified_orchestrator()
    return await orch.check_prerequisites()


# ═══════════════════════════════════════════════════════════════════════
# SHARED ENDPOINTS (work with both unified + legacy)
# ═══════════════════════════════════════════════════════════════════════

@router.get("/presets")
async def get_team_presets():
    """Get predefined team configurations from team_presets.py."""
    orch = _get_unified_orchestrator()
    return {"presets": orch.get_presets()}


@router.get("")
async def get_team_status(
    project_id: int,
    db: Session = Depends(get_session),
):
    """Get current team configuration and status."""
    orch = _get_unified_orchestrator()
    return orch.get_team_status(db, project_id)


@router.post("/command")
async def send_command(
    project_id: int,
    body: SendCommandRequest,
):
    """Send a command to the lead agent."""
    orch = _get_unified_orchestrator()
    result = await orch.send_command_to_lead(project_id, body.message)

    if "error" in result:
        # Fallback to legacy team manager
        tm = _get_team_manager()
        result = await tm.send_to_lead(body.message)
        if "error" in result:
            raise HTTPException(400, result["error"])

    return result


@router.post("/message")
async def send_message(
    project_id: int,
    body: MessageRequest,
):
    """Send a message to a specific teammate."""
    orch = _get_unified_orchestrator()
    result = await orch.send_message(project_id, body.to_agent_name, body.message)

    if "error" in result:
        raise HTTPException(400, result["error"])

    return result


@router.post("/broadcast")
async def broadcast_message(
    project_id: int,
    body: BroadcastRequest,
):
    """Broadcast a message to all teammates."""
    orch = _get_unified_orchestrator()
    result = await orch.broadcast_message(project_id, body.message)
    return result


@router.post("/cleanup")
async def cleanup_team(
    project_id: int,
    db: Session = Depends(get_session),
):
    """Clean up the entire team — stop all agents, remove from DB."""
    orch = _get_unified_orchestrator()
    result = await orch.cleanup_team(db, project_id)

    # Also cleanup legacy team manager
    try:
        tm = _get_team_manager()
        await tm.cleanup_team()
    except Exception:
        pass

    return result


# ═══════════════════════════════════════════════════════════════════════
# LEGACY ENDPOINTS (backward compat with old TeamManager)
# ═══════════════════════════════════════════════════════════════════════

@router.post("")
async def create_team_legacy(
    project_id: int,
    body: CreateTeamRequest,
    db: Session = Depends(get_session),
):
    """
    Legacy: Create a team via old TeamManager.
    Prefer /create-from-preset or /create-from-prompt instead.
    """
    project = _get_project(db, project_id)

    # Remove existing agents
    existing = db.exec(select(Agent).where(Agent.project_id == project_id)).all()
    for agent in existing:
        db.delete(agent)

    lead = Agent(
        project_id=project_id,
        name="Lead Agent",
        role=AgentRole.LEAD,
        avatar_key="lead",
        system_prompt="",
        model=body.model,
        is_lead=True,
        team_name=body.team_name,
        status=AgentStatus.IDLE,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)


    tm = _get_team_manager()
    try:
        team_result = await tm.create_team(
            team_name=body.team_name,
            project_id=project_id,
            working_dir=project.repo_path,
            prompt=body.prompt,
            model=body.model,
        )
    except Exception as e:
        logger.error(f"Failed to start lead session: {e}")
        team_result = {"error": str(e)}

    return {
        "team_name": body.team_name,
        "lead": {"id": lead.id, "name": lead.name},
        "session_result": team_result,
    }


@router.post("/teammates")
async def add_teammate(
    project_id: int,
    body: AddTeammateRequest,
):
    """Add a teammate by sending a prompt to the lead."""
    tm = _get_team_manager()
    result = await tm.send_to_lead(body.prompt)

    if "error" in result:
        raise HTTPException(400, result["error"])

    return result


@router.delete("/teammates/{agent_id}")
async def remove_teammate(
    project_id: int,
    agent_id: int,
    db: Session = Depends(get_session),
):
    """Remove a teammate."""
    agent = db.get(Agent, agent_id)
    if not agent or agent.project_id != project_id:
        raise HTTPException(404, "Agent not found in this project")

    if agent.is_lead:
        raise HTTPException(400, "Cannot remove the lead agent. Use cleanup instead.")

    tm = _get_team_manager()
    await tm.stop_teammate(agent.name)

    db.delete(agent)
    db.commit()

    return {"removed": True, "agent_name": agent.name}


# ─── Utilities ───────────────────────────────────────────────────────

def _agent_to_dict(agent: Agent) -> dict:
    return {
        "id": agent.id,
        "project_id": agent.project_id,
        "name": agent.name,
        "role": agent.role.value,
        "avatar_key": agent.avatar_key,
        "status": agent.status.value,
        "system_prompt": agent.system_prompt,
        "model": agent.model,
        "team_name": agent.team_name,
        "is_lead": agent.is_lead,
        "parent_agent_id": agent.parent_agent_id,
        "sdk_agent_key": agent.sdk_agent_key,
        "created_at": agent.created_at.isoformat(),
    }
