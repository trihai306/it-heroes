"""
Session management router — CRUD for Claude SDK sessions.
"""

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(tags=["sessions"])

# SessionManager will be injected via app.state
_session_manager = None


def set_session_manager(sm):
    global _session_manager
    _session_manager = sm


def _sm():
    if _session_manager is None:
        raise HTTPException(status_code=503, detail="Session manager not initialized")
    return _session_manager


class SessionCreate(BaseModel):
    agent_id: str
    project_id: Optional[str] = None


@router.get("/sessions")
def list_sessions(agent_id: str | None = None):
    return _sm().list_sessions(agent_id)


@router.get("/sessions/{session_id}")
def get_session(session_id: str):
    session = _sm().get_session_dict(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.post("/sessions")
async def create_session(data: SessionCreate):
    try:
        session = await _sm().create_session(data.agent_id, data.project_id)
        return session.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions/{session_id}/resume")
async def resume_session(session_id: str):
    try:
        session = await _sm().resume_session(session_id)
        return session.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    try:
        await _sm().delete_session(session_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
