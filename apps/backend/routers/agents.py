"""Agents router — manage team agents."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models.agent import Agent, AgentRole

router = APIRouter(tags=["agents"])


# ─── Schemas ───────────────────────────────────────────────────────────

class AgentCreate(BaseModel):
    name: str
    role: AgentRole = AgentRole.BACKEND
    avatar_key: str = "default"


class AgentResponse(BaseModel):
    id: int
    project_id: int
    role: AgentRole
    name: str
    avatar_key: str
    status: str = "idle"
    system_prompt: str = ""
    model: str = "claude-sonnet-4-5-20250929"
    team_name: str | None = None
    is_lead: bool = False
    created_at: datetime


class TeamConfig(BaseModel):
    agents: list[AgentCreate]


def _get_simulation():
    """Lazy import simulation singleton to avoid circular imports."""
    from main import simulation
    return simulation


# ─── Endpoints ─────────────────────────────────────────────────────────

@router.post("/projects/{project_id}/team", response_model=list[AgentResponse], status_code=201)
def create_team(
    project_id: int,
    body: TeamConfig,
    db: Session = Depends(get_session),
):
    """Create a team of agents for a project."""
    # Remove existing agents for this project
    existing = db.exec(select(Agent).where(Agent.project_id == project_id)).all()
    for agent in existing:
        db.delete(agent)

    created = []
    for agent_cfg in body.agents:
        agent = Agent(
            project_id=project_id,
            name=agent_cfg.name,
            role=agent_cfg.role,
            avatar_key=agent_cfg.avatar_key,
        )
        db.add(agent)
        created.append(agent)

    db.commit()
    for a in created:
        db.refresh(a)

    # Initialize simulation for new team
    sim = _get_simulation()
    sim.init_agents(
        [{"id": a.id, "role": a.role, "status": "idle"} for a in created],
        project_id,
    )

    return [_to_response(a) for a in created]


@router.get("/projects/{project_id}/agents", response_model=list[AgentResponse])
def list_agents(project_id: int, db: Session = Depends(get_session)):
    """List all agents for a project."""
    agents = db.exec(select(Agent).where(Agent.project_id == project_id)).all()

    # Auto-init simulation if agents exist but simulation is empty
    sim = _get_simulation()
    if agents and not sim.agents:
        sim.init_agents(
            [{"id": a.id, "role": a.role, "status": "idle"} for a in agents],
            project_id,
        )

    return [_to_response(a) for a in agents]


@router.get("/projects/{project_id}/agents/positions")
def get_agent_positions(project_id: int):
    """Get current chibi positions from simulation engine."""
    sim = _get_simulation()
    return {"positions": sim.get_all_positions()}


@router.get("/agents/{agent_id}", response_model=AgentResponse)
def get_agent(agent_id: int, db: Session = Depends(get_session)):
    """Get a single agent."""
    agent = db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")
    return _to_response(agent)


@router.delete("/projects/{project_id}/team", status_code=204)
def disband_team(project_id: int, db: Session = Depends(get_session)):
    """Remove all agents from a project."""
    agents = db.exec(select(Agent).where(Agent.project_id == project_id)).all()
    for agent in agents:
        db.delete(agent)
    db.commit()

    # Clear simulation
    sim = _get_simulation()
    sim.clear()


def _to_response(agent: Agent) -> AgentResponse:
    return AgentResponse(
        id=agent.id,
        project_id=agent.project_id,
        role=agent.role,
        name=agent.name,
        avatar_key=agent.avatar_key,
        status=agent.status.value if hasattr(agent.status, 'value') else str(agent.status),
        system_prompt=agent.system_prompt or "",
        model=agent.model or "claude-sonnet-4-5-20250929",
        team_name=agent.team_name,
        is_lead=agent.is_lead,
        created_at=agent.created_at,
    )
