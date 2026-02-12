"""Projects router — CRUD."""

import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models.project import Project

router = APIRouter(prefix="/projects", tags=["projects"])


# ─── Request/Response schemas ─────────────────────────────────────────

class ProjectCreate(BaseModel):
    repo_path: str
    name: str | None = None
    description: str | None = None


class ProjectResponse(BaseModel):
    id: int
    name: str
    repo_path: str
    description: str | None
    created_at: datetime


# ─── Endpoints ─────────────────────────────────────────────────────────

@router.post("", response_model=ProjectResponse, status_code=201)
def create_project(body: ProjectCreate, db: Session = Depends(get_session)):
    """Create a new project from a local repo path."""
    repo_path = os.path.expanduser(body.repo_path)

    if not os.path.isdir(repo_path):
        raise HTTPException(400, f"Directory not found: {repo_path}")

    # Check .git exists
    git_dir = os.path.join(repo_path, ".git")
    if not os.path.exists(git_dir):
        raise HTTPException(400, f"Not a git repository: {repo_path}")

    # Check duplicate
    existing = db.exec(select(Project).where(Project.repo_path == repo_path)).first()
    if existing:
        raise HTTPException(409, f"Project already exists for: {repo_path}")

    name = body.name or os.path.basename(repo_path)
    project = Project(name=name, repo_path=repo_path, description=body.description)
    db.add(project)
    db.commit()
    db.refresh(project)

    return ProjectResponse(
        id=project.id,
        name=project.name,
        repo_path=project.repo_path,
        description=project.description,
        created_at=project.created_at,
    )


@router.get("", response_model=list[ProjectResponse])
def list_projects(db: Session = Depends(get_session)):
    """List all projects."""
    projects = db.exec(select(Project)).all()
    return [
        ProjectResponse(
            id=p.id,
            name=p.name,
            repo_path=p.repo_path,
            description=p.description,
            created_at=p.created_at,
        )
        for p in projects
    ]


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_session)):
    """Get project detail."""
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    return ProjectResponse(
        id=project.id,
        name=project.name,
        repo_path=project.repo_path,
        description=project.description,
        created_at=project.created_at,
    )


@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: int, db: Session = Depends(get_session)):
    """Delete a project and clean up all associated teams/agents."""
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    # Clean up active team (stop processes, file watchers, remove agents/sessions)
    from main import unified_orchestrator
    await unified_orchestrator.cleanup_team(db, project_id)

    db.delete(project)
    db.commit()
