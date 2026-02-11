"""Tasks router — CRUD and status management."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models.task import Task, TaskStatus

router = APIRouter(tags=["tasks"])


# ─── Request/Response schemas ─────────────────────────────────────────

class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    priority: int = 0
    assigned_agent_id: int | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: TaskStatus | None = None
    priority: int | None = None
    assigned_agent_id: int | None = None


class TaskResponse(BaseModel):
    id: int
    project_id: int
    title: str
    description: str | None
    status: TaskStatus
    priority: int
    assigned_agent_id: int | None
    created_at: datetime
    updated_at: datetime


# ─── Endpoints ─────────────────────────────────────────────────────────

@router.post("/projects/{project_id}/tasks", response_model=TaskResponse, status_code=201)
def create_task(
    project_id: int,
    body: TaskCreate,
    db: Session = Depends(get_session),
):
    """Create a new task for a project."""
    task = Task(
        project_id=project_id,
        title=body.title,
        description=body.description,
        priority=body.priority,
        assigned_agent_id=body.assigned_agent_id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return _to_response(task)


@router.get("/projects/{project_id}/tasks", response_model=list[TaskResponse])
def list_tasks(
    project_id: int,
    status: TaskStatus | None = None,
    db: Session = Depends(get_session),
):
    """List tasks for a project, optionally filtered by status."""
    query = select(Task).where(Task.project_id == project_id)
    if status:
        query = query.where(Task.status == status)

    tasks = db.exec(query.order_by(Task.priority.desc(), Task.created_at)).all()
    return [_to_response(t) for t in tasks]


@router.get("/tasks/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_session)):
    """Get a single task."""
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    return _to_response(task)


@router.patch("/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, body: TaskUpdate, db: Session = Depends(get_session)):
    """Update a task (status, assignment, etc)."""
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(404, "Task not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(task, key, value)

    task.updated_at = datetime.now(timezone.utc)
    db.add(task)
    db.commit()
    db.refresh(task)
    return _to_response(task)


@router.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_session)):
    """Delete a task."""
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    db.delete(task)
    db.commit()


def _to_response(task: Task) -> TaskResponse:
    return TaskResponse(
        id=task.id,
        project_id=task.project_id,
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        assigned_agent_id=task.assigned_agent_id,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )
