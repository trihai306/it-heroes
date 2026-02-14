"""
Task CRUD router — preserves existing FE Task interface.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_db
from models import Agent, Task

router = APIRouter(tags=["tasks"])


class TaskCreate(BaseModel):
    title: str
    description: str = ""
    assigned_agent_id: Optional[str] = None
    priority: str = "medium"


class TaskStatusUpdate(BaseModel):
    status: str


@router.get("/tasks")
def list_tasks(db: Session = Depends(get_db)):
    tasks = db.exec(select(Task)).all()
    return [t.model_dump() for t in tasks]


@router.post("/tasks")
def create_task(data: TaskCreate, db: Session = Depends(get_db)):
    assigned_name = None
    if data.assigned_agent_id:
        agent = db.get(Agent, data.assigned_agent_id)
        if agent:
            assigned_name = agent.name

    task = Task(
        title=data.title,
        description=data.description,
        assigned_agent_id=data.assigned_agent_id,
        assigned_agent_name=assigned_name,
        priority=data.priority,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task.model_dump()


@router.put("/tasks/{task_id}/status")
def update_task_status(
    task_id: str,
    data: TaskStatusUpdate,
    db: Session = Depends(get_db),
):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.status = data.status
    task.updated_at = datetime.now().isoformat()
    if data.status == "completed":
        task.completed_at = datetime.now().isoformat()

    db.add(task)
    db.commit()
    db.refresh(task)
    return task.model_dump()
