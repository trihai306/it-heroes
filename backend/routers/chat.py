"""
Chat router — backward-compatible POST /api/chat + streaming endpoint.
"""

from datetime import datetime
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_db
from models import Agent, AgentSession, Message

router = APIRouter(tags=["chat"])

# Services injected at startup
_claude_service = None
_session_manager = None


def set_services(claude, sessions):
    global _claude_service, _session_manager
    _claude_service = claude
    _session_manager = sessions


class ChatMessage(BaseModel):
    agent_id: str
    message: str
    conversation_id: Optional[str] = None
    project_id: Optional[str] = None


@router.post("/chat")
async def send_chat_message(data: ChatMessage, db: Session = Depends(get_db)):
    """
    Backward-compatible chat endpoint.
    Sends message, waits for full response, returns ChatResponse format.
    For streaming, use WebSocket with {"type": "chat"} message.
    """
    agent = db.get(Agent, data.agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    if not _claude_service or not _session_manager:
        raise HTTPException(status_code=503, detail="Services not initialized")

    # Get or create session
    session = await _session_manager.get_or_create_session(
        data.agent_id, data.project_id,
    )

    # Update agent status
    agent.status = "thinking"
    agent.last_active = datetime.now().isoformat()
    db.add(agent)
    db.commit()

    full_text = ""
    try:
        async for event in _claude_service.send_message(session.id, data.message):
            if event["type"] == "assistant":
                for block in event["blocks"]:
                    if block["type"] == "text":
                        full_text += block["text"]
            elif event["type"] == "result" and not full_text:
                full_text = event.get("content", "")
    except Exception as e:
        agent.status = "error"
        agent.errors += 1
        db.add(agent)
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))

    # Save messages
    now = datetime.now().isoformat()
    user_msg_id = uuid4().hex[:8]
    assistant_msg_id = uuid4().hex[:8]

    db.add(Message(
        id=user_msg_id,
        session_id=session.id,
        agent_id=data.agent_id,
        role="user",
        content=data.message,
        timestamp=now,
    ))
    db.add(Message(
        id=assistant_msg_id,
        session_id=session.id,
        agent_id=data.agent_id,
        role="assistant",
        content=full_text,
        timestamp=now,
    ))

    # Update metrics
    agent.status = "idle"
    agent.messages_sent += 1
    agent.last_active = now
    db.add(agent)
    db.commit()

    # Return FE-compatible ChatResponse format
    return {
        "conversation_id": session.id,
        "user_message": {
            "id": user_msg_id,
            "role": "user",
            "content": data.message,
            "timestamp": now,
        },
        "assistant_message": {
            "id": assistant_msg_id,
            "role": "assistant",
            "content": full_text,
            "agent_id": data.agent_id,
            "agent_name": agent.name,
            "agent_avatar": agent.avatar,
            "timestamp": now,
        },
    }


@router.get("/chat/{agent_id}/history")
def get_chat_history(agent_id: str, db: Session = Depends(get_db)):
    """Get all messages for an agent across sessions."""
    stmt = (
        select(Message)
        .where(Message.agent_id == agent_id)
        .order_by(Message.timestamp)
    )
    messages = db.exec(stmt).all()
    return [m.model_dump() for m in messages]


@router.get("/chat/sessions/{session_id}/history")
def get_session_history(session_id: str, db: Session = Depends(get_db)):
    """Get all messages for a specific session."""
    stmt = (
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.timestamp)
    )
    messages = db.exec(stmt).all()
    return [m.model_dump() for m in messages]
