import os
import platform
import subprocess
import sys
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_db
from models import Project

router = APIRouter(tags=["projects"])


@router.get("/select-directory")
def select_directory():
    """Open a native folder picker dialog and return the selected path."""
    system = platform.system()

    try:
        if system == "Darwin":
            # macOS — use osascript (always available)
            result = subprocess.run(
                [
                    "osascript",
                    "-e",
                    'set theFolder to POSIX path of (choose folder with prompt "Select project folder")',
                ],
                capture_output=True,
                text=True,
                timeout=120,
            )
            path = result.stdout.strip().rstrip("/")
            if path and os.path.isdir(path):
                return {"path": path}
            return {"path": None}

        elif system == "Linux":
            # Linux — try zenity
            result = subprocess.run(
                ["zenity", "--file-selection", "--directory", "--title=Select project folder"],
                capture_output=True,
                text=True,
                timeout=120,
            )
            path = result.stdout.strip()
            if path and os.path.isdir(path):
                return {"path": path}
            return {"path": None}

        else:
            # Windows — use PowerShell
            ps_script = (
                "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; "
                "$d = New-Object System.Windows.Forms.FolderBrowserDialog; "
                "$d.ShowDialog() | Out-Null; $d.SelectedPath"
            )
            result = subprocess.run(
                ["powershell", "-Command", ps_script],
                capture_output=True,
                text=True,
                timeout=120,
            )
            path = result.stdout.strip()
            if path and os.path.isdir(path):
                return {"path": path}
            return {"path": None}

    except Exception:
        return {"path": None}


class ProjectCreate(BaseModel):
    name: str
    path: str
    description: str = ""


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    path: Optional[str] = None
    description: Optional[str] = None


@router.get("/projects")
def list_projects(db: Session = Depends(get_db)):
    projects = db.exec(select(Project)).all()
    return [p.model_dump() for p in projects]


@router.get("/projects/{project_id}")
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project.model_dump()


@router.post("/projects")
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    if not os.path.isabs(data.path):
        raise HTTPException(
            status_code=400,
            detail="path must be an absolute path",
        )
    if not os.path.isdir(data.path):
        raise HTTPException(
            status_code=400,
            detail=f"Directory does not exist: {data.path}",
        )

    project = Project(
        name=data.name,
        path=data.path,
        description=data.description,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project.model_dump()


@router.put("/projects/{project_id}")
def update_project(
    project_id: str,
    data: ProjectUpdate,
    db: Session = Depends(get_db),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    updates = data.model_dump(exclude_none=True)
    if "path" in updates:
        if not os.path.isabs(updates["path"]):
            raise HTTPException(status_code=400, detail="path must be absolute")
        if not os.path.isdir(updates["path"]):
            raise HTTPException(status_code=400, detail="Directory does not exist")

    for key, value in updates.items():
        setattr(project, key, value)

    db.add(project)
    db.commit()
    db.refresh(project)
    return project.model_dump()


@router.delete("/projects/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
    return {"success": True}
