"""Orchestration router — agent team management and task dispatching."""

import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models.project import Project
from models.agent import Agent
from models.task import Task, TaskStatus

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orchestrate", tags=["Orchestration"])


# ─── Request/Response Models ──────────────────────────────────────────

class DispatchRequest(BaseModel):
    """Request to dispatch unassigned tasks to agents."""
    task_ids: list[int] | None = None  # Specific task IDs, or None for all


class StartAgentRequest(BaseModel):
    """Request to start a single agent on a specific task."""
    agent_id: int
    task_id: int


class StopAgentRequest(BaseModel):
    """Request to stop a running agent."""
    agent_id: int


# ─── Helper: get orchestrator from app state ─────────────────────────

def get_orchestrator():
    """Dependency to get the singleton orchestrator from app state."""
    from main import orchestrator
    return orchestrator


# ─── Endpoints ────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/status")
def get_team_status(
    project_id: int,
    db: Session = Depends(get_session),
    orch=Depends(get_orchestrator),
):
    """Get current status of all agents and sessions for a project."""
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    return orch.get_team_status(db, project_id)


@router.post("/projects/{project_id}/dispatch")
async def dispatch_tasks(
    project_id: int,
    body: DispatchRequest | None = None,
    background: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_session),
    orch=Depends(get_orchestrator),
):
    """
    Auto-assign unassigned tasks to best-match agents
    and start Claude sessions for them.
    """
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    agents = db.exec(select(Agent).where(Agent.project_id == project_id)).all()
    if not agents:
        raise HTTPException(400, "No agents found. Summon a team first.")

    assignments = await orch.dispatch_tasks(
        db, project_id, project.repo_path, project.name
    )

    return {
        "dispatched": len(assignments),
        "assignments": assignments,
    }


@router.post("/projects/{project_id}/start-agent")
async def start_single_agent(
    project_id: int,
    body: StartAgentRequest,
    db: Session = Depends(get_session),
    orch=Depends(get_orchestrator),
):
    """Start a specific agent on a specific task."""
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    agent = db.get(Agent, body.agent_id)
    if not agent or agent.project_id != project_id:
        raise HTTPException(404, "Agent not found in this project")

    task = db.get(Task, body.task_id)
    if not task or task.project_id != project_id:
        raise HTTPException(404, "Task not found in this project")

    session = await orch.start_agent(
        db, agent, task, project.name, project.repo_path
    )

    return {
        "session_id": session.id,
        "agent_id": agent.id,
        "task_id": task.id,
        "worktree": session.worktree_path,
        "branch": session.branch_name,
        "status": session.status.value,
    }


@router.post("/projects/{project_id}/stop-agent")
async def stop_single_agent(
    project_id: int,
    body: StopAgentRequest,
    db: Session = Depends(get_session),
    orch=Depends(get_orchestrator),
):
    """Stop a running agent."""
    await orch.stop_agent(db, body.agent_id)
    return {"stopped": True, "agent_id": body.agent_id}


@router.post("/projects/{project_id}/stop-all")
async def stop_all_agents(
    project_id: int,
    db: Session = Depends(get_session),
    orch=Depends(get_orchestrator),
):
    """Stop all agents for a project and clean up worktrees."""
    await orch.stop_all(db, project_id)
    return {"stopped": True, "project_id": project_id}


@router.get("/prerequisites")
async def check_prerequisites(
    orch=Depends(get_orchestrator),
):
    """Check if required tools (Claude CLI, etc.) are available."""
    result = await orch.check_prerequisites()
    return result


@router.post("/tasks/{task_id}/requeue")
def requeue_task(
    task_id: int,
    db: Session = Depends(get_session),
    orch=Depends(get_orchestrator),
):
    """Requeue a failed task — reset to TODO and unassign."""
    task = orch.dispatcher.requeue_failed(db, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    return {
        "task_id": task.id,
        "status": task.status.value,
        "message": "Task requeued",
    }


@router.get("/projects/{project_id}/worktrees")
def list_worktrees(
    project_id: int,
    db: Session = Depends(get_session),
    orch=Depends(get_orchestrator),
):
    """List git worktrees for a project."""
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    return orch.git.list_worktrees(project.repo_path)


@router.get("/projects/{project_id}/diffs")
def get_all_diffs(
    project_id: int,
    db: Session = Depends(get_session),
    orch=Depends(get_orchestrator),
):
    """Get diff summaries from all agent worktrees."""
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    agents = db.exec(select(Agent).where(Agent.project_id == project_id)).all()
    agent_ids = [a.id for a in agents]

    return orch.git.create_merge_plan(project.repo_path, agent_ids)
