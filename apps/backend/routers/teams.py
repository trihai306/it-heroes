"""Teams router — Claude Agent Teams management endpoints."""

import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models.project import Project
from models.agent import Agent, AgentRole, AgentStatus

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects/{project_id}/teams", tags=["Teams"])


# ─── Request/Response Schemas ─────────────────────────────────────────

class CreateTeamRequest(BaseModel):
    """Create a team with one natural language prompt."""
    prompt: str  # The user's prompt — Claude creates the team from this
    team_name: str = "chibi-team"
    model: str = "claude-sonnet-4-5-20250929"


class AddTeammateRequest(BaseModel):
    """Request to add a teammate via prompt to the lead."""
    prompt: str  # e.g. "Spawn a security reviewer teammate"


class SendCommandRequest(BaseModel):
    """Send a command/message to the lead session."""
    message: str


class MessageRequest(BaseModel):
    """Request to send a message to a teammate via the lead."""
    to_agent_name: str
    message: str


class BroadcastRequest(BaseModel):
    """Request to broadcast a message to all teammates."""
    message: str


# ─── Helpers ──────────────────────────────────────────────────────────

def _get_team_manager():
    """Lazy import team manager singleton."""
    from main import team_manager
    return team_manager


def _get_simulation():
    """Lazy import simulation singleton."""
    from main import simulation
    return simulation


# ─── Endpoints ────────────────────────────────────────────────────────

@router.post("")
async def create_team(
    project_id: int,
    body: CreateTeamRequest,
    db: Session = Depends(get_session),
):
    """
    Create a new Claude Agent Team.

    Sends the user's prompt directly to ONE Claude Code session.
    Claude reads the prompt and creates the team itself —
    spawning teammates, assigning roles, choosing models.
    """
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    # Remove existing agents
    existing = db.exec(select(Agent).where(Agent.project_id == project_id)).all()
    for agent in existing:
        db.delete(agent)

    # Create one lead agent record in DB
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

    # Initialize simulation
    sim = _get_simulation()
    sim.init_agents(
        [{"id": lead.id, "role": lead.role, "status": "idle"}],
        project_id,
    )

    # Start lead session with user's prompt
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


@router.get("")
async def get_team_status(
    project_id: int,
    db: Session = Depends(get_session),
):
    """Get current team configuration and status."""
    agents = db.exec(select(Agent).where(Agent.project_id == project_id)).all()

    tm = _get_team_manager()
    session_status = tm.get_team_status()

    return {
        "agents": [_agent_to_dict(a) for a in agents],
        "session": session_status,
        "team_name": agents[0].team_name if agents else None,
    }


@router.post("/command")
async def send_command(
    project_id: int,
    body: SendCommandRequest,
):
    """
    Send a raw command/message to the lead session's stdin.
    This is the primary way to interact with the team.
    """
    tm = _get_team_manager()
    result = await tm.send_to_lead(body.message)

    if "error" in result:
        raise HTTPException(400, result["error"])

    return result


@router.post("/teammates")
async def add_teammate(
    project_id: int,
    body: AddTeammateRequest,
):
    """
    Add a new teammate by sending a prompt to the lead session.
    Claude handles the actual teammate spawning.
    """
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
    """Ask the lead to shut down a teammate, then remove from DB."""
    agent = db.get(Agent, agent_id)
    if not agent or agent.project_id != project_id:
        raise HTTPException(404, "Agent not found in this project")

    if agent.is_lead:
        raise HTTPException(400, "Cannot remove the lead agent. Use cleanup instead.")

    # Ask lead to shut down this teammate
    tm = _get_team_manager()
    await tm.stop_teammate(agent.name)

    # Remove from DB
    db.delete(agent)
    db.commit()

    return {"removed": True, "agent_name": agent.name}


@router.post("/message")
async def send_message(
    project_id: int,
    body: MessageRequest,
):
    """Send a message to a specific teammate via the lead."""
    tm = _get_team_manager()
    result = await tm.send_message(0, body.to_agent_name, body.message)

    if "error" in result:
        raise HTTPException(400, result["error"])

    return result


@router.post("/broadcast")
async def broadcast_message(
    project_id: int,
    body: BroadcastRequest,
):
    """Broadcast a message to all teammates via the lead."""
    tm = _get_team_manager()
    result = await tm.broadcast(0, body.message)
    return result


@router.get("/output")
async def get_team_output(
    project_id: int,
    last_n: int = 50,
):
    """Get output lines from the lead session."""
    tm = _get_team_manager()
    output = tm.get_agent_output(last_n)
    return {"output": output, "count": len(output)}


@router.post("/cleanup")
async def cleanup_team(
    project_id: int,
    db: Session = Depends(get_session),
):
    """Clean up the entire team — stop lead session and remove agents."""
    # Stop lead session (which cleans up all teammates)
    tm = _get_team_manager()
    cleanup_result = await tm.cleanup_team()

    # Remove agents from DB
    agents = db.exec(select(Agent).where(Agent.project_id == project_id)).all()
    for agent in agents:
        db.delete(agent)
    db.commit()

    # Clear simulation
    sim = _get_simulation()
    sim.clear()

    return cleanup_result


# ─── Presets ──────────────────────────────────────────────────────────

@router.get("/presets")
async def get_team_presets():
    """Get predefined team configurations."""
    return {
        "presets": [
            {
                "id": "fullstack",
                "name": "Full Stack Team",
                "description": "Lead + Backend + Frontend + QA for full development cycle",
                "icon": "🚀",
                "agents": [
                    {"name": "Lead Agent", "role": "lead", "is_lead": True,
                     "system_prompt": "You are the lead architect. Coordinate the team, review PRs, and ensure code quality.",
                     "avatar_key": "lead"},
                    {"name": "Backend Dev", "role": "backend",
                     "system_prompt": "You are a backend specialist. Focus on API design, data models, and server logic.",
                     "avatar_key": "backend"},
                    {"name": "Frontend Dev", "role": "frontend",
                     "system_prompt": "You are a frontend specialist. Focus on UI components, UX, and responsive design.",
                     "avatar_key": "frontend"},
                    {"name": "QA Engineer", "role": "qa",
                     "system_prompt": "You are a QA engineer. Write tests, verify functionality, and ensure quality.",
                     "avatar_key": "qa"},
                ],
            },
            {
                "id": "research",
                "name": "Research Team",
                "description": "Multiple reviewers investigating from different angles",
                "icon": "🔬",
                "agents": [
                    {"name": "Lead Researcher", "role": "lead", "is_lead": True,
                     "system_prompt": "You lead the research effort. Synthesize findings from your team.",
                     "avatar_key": "lead"},
                    {"name": "Security Auditor", "role": "security",
                     "system_prompt": "Focus on security vulnerabilities and best practices.",
                     "avatar_key": "security"},
                    {"name": "Performance Analyst", "role": "backend",
                     "system_prompt": "Analyze performance bottlenecks and optimization opportunities.",
                     "avatar_key": "backend"},
                    {"name": "Documentation Writer", "role": "docs",
                     "system_prompt": "Document architecture, APIs, and create developer guides.",
                     "avatar_key": "docs"},
                ],
            },
            {
                "id": "review",
                "name": "Code Review Team",
                "description": "Parallel reviewers checking security, performance, and tests",
                "icon": "🔍",
                "agents": [
                    {"name": "Review Lead", "role": "lead", "is_lead": True,
                     "system_prompt": "Coordinate the review and synthesize findings into a summary.",
                     "avatar_key": "lead"},
                    {"name": "Security Reviewer", "role": "security",
                     "system_prompt": "Review code for security vulnerabilities and injection risks.",
                     "avatar_key": "security"},
                    {"name": "Quality Reviewer", "role": "qa",
                     "system_prompt": "Check test coverage, edge cases, and code quality standards.",
                     "avatar_key": "qa"},
                ],
            },
            {
                "id": "debug",
                "name": "Debug Squad",
                "description": "Competing hypotheses — multiple agents investigate in parallel",
                "icon": "🐛",
                "agents": [
                    {"name": "Debug Lead", "role": "lead", "is_lead": True,
                     "system_prompt": "Coordinate the debugging effort. Compare hypotheses from teammates.",
                     "avatar_key": "lead"},
                    {"name": "Hypothesis A", "role": "backend",
                     "system_prompt": "Investigate from a backend/data perspective. Test your theory and report findings.",
                     "avatar_key": "backend"},
                    {"name": "Hypothesis B", "role": "frontend",
                     "system_prompt": "Investigate from a frontend/UI perspective. Test your theory and report findings.",
                     "avatar_key": "frontend"},
                    {"name": "Hypothesis C", "role": "qa",
                     "system_prompt": "Investigate from a testing perspective. Try to reproduce and isolate the issue.",
                     "avatar_key": "qa"},
                ],
            },
        ],
    }


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
        "created_at": agent.created_at.isoformat(),
    }
