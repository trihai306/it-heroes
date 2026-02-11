"""Workflows router — CRUD for department flow pipelines."""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models.workflow import Workflow

router = APIRouter(tags=["workflows"])


# ─── Request / Response schemas ───────────────────────────────────────

class WorkflowCreate(BaseModel):
    name: str
    steps: list[str] = []
    nodes_data: list[dict] | None = None
    edges_data: list[dict] | None = None


class WorkflowUpdate(BaseModel):
    name: str | None = None
    steps: list[str] | None = None
    nodes_data: list[dict] | None = None
    edges_data: list[dict] | None = None
    is_active: bool | None = None


class WorkflowResponse(BaseModel):
    id: int
    project_id: int
    name: str
    steps: list[str]
    nodes_data: list[dict]
    edges_data: list[dict]
    is_active: bool
    created_at: datetime
    updated_at: datetime


# ─── Helpers ───────────────────────────────────────────────────────────

def _to_response(wf: Workflow) -> WorkflowResponse:
    return WorkflowResponse(
        id=wf.id,
        project_id=wf.project_id,
        name=wf.name,
        steps=json.loads(wf.steps) if wf.steps else [],
        nodes_data=json.loads(wf.nodes_data) if wf.nodes_data else [],
        edges_data=json.loads(wf.edges_data) if wf.edges_data else [],
        is_active=wf.is_active,
        created_at=wf.created_at,
        updated_at=wf.updated_at,
    )


# ─── Endpoints ─────────────────────────────────────────────────────────

@router.post("/projects/{project_id}/workflows", response_model=WorkflowResponse, status_code=201)
def create_workflow(project_id: int, body: WorkflowCreate, db: Session = Depends(get_session)):
    """Create a new workflow for a project."""
    wf = Workflow(
        project_id=project_id,
        name=body.name,
        steps=json.dumps(body.steps),
        nodes_data=json.dumps(body.nodes_data or []),
        edges_data=json.dumps(body.edges_data or []),
    )
    db.add(wf)
    db.commit()
    db.refresh(wf)
    return _to_response(wf)


@router.get("/projects/{project_id}/workflows", response_model=list[WorkflowResponse])
def list_workflows(project_id: int, db: Session = Depends(get_session)):
    """List all workflows for a project."""
    query = select(Workflow).where(Workflow.project_id == project_id).order_by(Workflow.created_at)
    return [_to_response(wf) for wf in db.exec(query).all()]


@router.get("/workflows/{workflow_id}", response_model=WorkflowResponse)
def get_workflow(workflow_id: int, db: Session = Depends(get_session)):
    """Get a single workflow."""
    wf = db.get(Workflow, workflow_id)
    if not wf:
        raise HTTPException(404, "Workflow not found")
    return _to_response(wf)


@router.patch("/workflows/{workflow_id}", response_model=WorkflowResponse)
def update_workflow(workflow_id: int, body: WorkflowUpdate, db: Session = Depends(get_session)):
    """Update a workflow."""
    wf = db.get(Workflow, workflow_id)
    if not wf:
        raise HTTPException(404, "Workflow not found")

    data = body.model_dump(exclude_unset=True)
    for key, value in data.items():
        if key in ("steps", "nodes_data", "edges_data"):
            setattr(wf, key, json.dumps(value))
        else:
            setattr(wf, key, value)

    wf.updated_at = datetime.now(timezone.utc)
    db.add(wf)
    db.commit()
    db.refresh(wf)
    return _to_response(wf)


@router.delete("/workflows/{workflow_id}", status_code=204)
def delete_workflow(workflow_id: int, db: Session = Depends(get_session)):
    """Delete a workflow."""
    wf = db.get(Workflow, workflow_id)
    if not wf:
        raise HTTPException(404, "Workflow not found")
    db.delete(wf)
    db.commit()


@router.post("/workflows/{workflow_id}/activate", response_model=WorkflowResponse)
def activate_workflow(workflow_id: int, db: Session = Depends(get_session)):
    """Activate a workflow (deactivates others in same project)."""
    wf = db.get(Workflow, workflow_id)
    if not wf:
        raise HTTPException(404, "Workflow not found")

    # Toggle: if already active, deactivate; otherwise activate and deactivate siblings
    if wf.is_active:
        wf.is_active = False
    else:
        siblings = db.exec(select(Workflow).where(
            Workflow.project_id == wf.project_id,
            Workflow.id != wf.id,
            Workflow.is_active == True,
        )).all()
        for s in siblings:
            s.is_active = False
            db.add(s)
        wf.is_active = True

    wf.updated_at = datetime.now(timezone.utc)
    db.add(wf)
    db.commit()
    db.refresh(wf)
    return _to_response(wf)
