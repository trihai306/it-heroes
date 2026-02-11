"""Filesystem router — Browse local directories for project selection."""

import os
from pathlib import Path

from fastapi import APIRouter, Query
from pydantic import BaseModel

router = APIRouter(prefix="/filesystem", tags=["filesystem"])


class FolderItem(BaseModel):
    name: str
    path: str
    is_git: bool = False
    children_count: int = 0


class BrowseResponse(BaseModel):
    current: str
    parent: str | None
    folders: list[FolderItem]


@router.get("/browse", response_model=BrowseResponse)
def browse_directory(path: str = Query(default="~", description="Directory path to browse")):
    """List subdirectories of a given path for the folder picker UI."""
    target = Path(os.path.expanduser(path)).resolve()

    if not target.is_dir():
        # Fallback to home if invalid path
        target = Path.home()

    parent = str(target.parent) if target != target.parent else None
    folders: list[FolderItem] = []

    try:
        for item in sorted(target.iterdir(), key=lambda x: x.name.lower()):
            if not item.is_dir():
                continue
            if item.name.startswith("."):
                continue

            # Count visible subdirectories (for the expand arrow hint)
            try:
                child_count = sum(
                    1 for c in item.iterdir()
                    if c.is_dir() and not c.name.startswith(".")
                )
            except PermissionError:
                child_count = 0

            is_git = (item / ".git").is_dir()

            folders.append(FolderItem(
                name=item.name,
                path=str(item),
                is_git=is_git,
                children_count=child_count,
            ))
    except PermissionError:
        pass

    return BrowseResponse(
        current=str(target),
        parent=parent,
        folders=folders,
    )
