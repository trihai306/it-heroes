"""
Agent CRUD router — preserves existing FE API contract.
"""

import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from config import settings
from database import get_db
from models import Agent

router = APIRouter(tags=["agents"])


class AgentCreate(BaseModel):
    name: str
    role: str = "worker"
    model: str = "sonnet"
    system_prompt: str = ""
    avatar: str = "\U0001f916"
    allowed_tools: list[str] | None = None
    permission_mode: str = "acceptEdits"


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    model: Optional[str] = None
    system_prompt: Optional[str] = None
    avatar: Optional[str] = None
    status: Optional[str] = None
    allowed_tools: Optional[list[str]] = None
    permission_mode: Optional[str] = None


@router.get("/agents")
def list_agents(db: Session = Depends(get_db)):
    agents = db.exec(select(Agent)).all()
    return [a.to_api_dict() for a in agents]


@router.get("/agents/{agent_id}")
def get_agent(agent_id: str, db: Session = Depends(get_db)):
    agent = db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent.to_api_dict()


@router.post("/agents")
async def create_agent(data: AgentCreate, db: Session = Depends(get_db)):
    system_prompt = data.system_prompt or Agent.default_prompt(data.role)
    tools = data.allowed_tools or list(settings.DEFAULT_ALLOWED_TOOLS)

    agent = Agent(
        name=data.name,
        role=data.role,
        model=data.model,
        system_prompt=system_prompt,
        avatar=data.avatar,
        allowed_tools=json.dumps(tools),
        permission_mode=data.permission_mode,
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)

    # Auto-create notification
    from services.notification_service import create_notification
    await create_notification(
        type="agent_created",
        title="Agent Created",
        message=f"{agent.name} ({agent.role}) has been created",
        avatar=agent.avatar,
        related_id=agent.id,
    )

    return agent.to_api_dict()


@router.put("/agents/{agent_id}")
def update_agent(agent_id: str, data: AgentUpdate, db: Session = Depends(get_db)):
    agent = db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    updates = data.model_dump(exclude_none=True)

    # Handle allowed_tools separately (list → JSON string)
    if "allowed_tools" in updates:
        updates["allowed_tools"] = json.dumps(updates["allowed_tools"])

    for key, value in updates.items():
        setattr(agent, key, value)

    agent.last_active = datetime.now().isoformat()
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent.to_api_dict()


@router.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str, db: Session = Depends(get_db)):
    agent = db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent_name = agent.name
    db.delete(agent)
    db.commit()

    # Auto-create notification
    from services.notification_service import create_notification
    await create_notification(
        type="agent_deleted",
        title="Agent Removed",
        message=f"{agent_name} has been removed from the team",
        related_id=agent_id,
    )

    return {"success": True}
