"""Office Layouts router — CRUD for drag-and-drop office builder layouts."""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models.office_layout import OfficeLayout
from services.nav_graph_generator import generate_nav_graph

router = APIRouter(tags=["office-layouts"])


# ─── Request / Response schemas ───────────────────────────────────────

class OfficeLayoutCreate(BaseModel):
    name: str = "Default Office"
    grid_width: int = 32
    grid_height: int = 24
    cell_size: float = 1.0
    objects_data: list[dict] | None = None
    zones_data: list[dict] | None = None
    walls_data: list[dict] | None = None


class OfficeLayoutUpdate(BaseModel):
    name: str | None = None
    grid_width: int | None = None
    grid_height: int | None = None
    cell_size: float | None = None
    objects_data: list[dict] | None = None
    zones_data: list[dict] | None = None
    walls_data: list[dict] | None = None
    is_active: bool | None = None


class OfficeLayoutResponse(BaseModel):
    id: int
    project_id: int
    name: str
    grid_width: int
    grid_height: int
    cell_size: float
    objects_data: list[dict]
    zones_data: list[dict]
    walls_data: list[dict]
    nav_graph_data: list[dict]
    is_active: bool
    created_at: datetime
    updated_at: datetime


# ─── Helpers ───────────────────────────────────────────────────────────

def _to_response(layout: OfficeLayout) -> OfficeLayoutResponse:
    return OfficeLayoutResponse(
        id=layout.id,
        project_id=layout.project_id,
        name=layout.name,
        grid_width=layout.grid_width,
        grid_height=layout.grid_height,
        cell_size=layout.cell_size,
        objects_data=json.loads(layout.objects_data) if layout.objects_data else [],
        zones_data=json.loads(layout.zones_data) if layout.zones_data else [],
        walls_data=json.loads(layout.walls_data) if layout.walls_data else [],
        nav_graph_data=json.loads(layout.nav_graph_data) if layout.nav_graph_data else [],
        is_active=layout.is_active,
        created_at=layout.created_at,
        updated_at=layout.updated_at,
    )


def _regenerate_nav_graph(layout: OfficeLayout):
    """Re-generate nav graph data from current layout objects/zones/walls."""
    objects = json.loads(layout.objects_data) if layout.objects_data else []
    zones = json.loads(layout.zones_data) if layout.zones_data else []
    walls = json.loads(layout.walls_data) if layout.walls_data else []
    nav = generate_nav_graph(objects, zones, walls, layout.grid_width, layout.grid_height, layout.cell_size)
    layout.nav_graph_data = json.dumps(nav)


# ─── Endpoints ─────────────────────────────────────────────────────────

@router.post("/projects/{project_id}/office-layouts", response_model=OfficeLayoutResponse, status_code=201)
def create_office_layout(project_id: int, body: OfficeLayoutCreate, db: Session = Depends(get_session)):
    """Create a new office layout for a project."""
    layout = OfficeLayout(
        project_id=project_id,
        name=body.name,
        grid_width=body.grid_width,
        grid_height=body.grid_height,
        cell_size=body.cell_size,
        objects_data=json.dumps(body.objects_data or []),
        zones_data=json.dumps(body.zones_data or []),
        walls_data=json.dumps(body.walls_data or []),
    )
    _regenerate_nav_graph(layout)
    db.add(layout)
    db.commit()
    db.refresh(layout)
    return _to_response(layout)


@router.get("/projects/{project_id}/office-layouts", response_model=list[OfficeLayoutResponse])
def list_office_layouts(project_id: int, db: Session = Depends(get_session)):
    """List all office layouts for a project."""
    query = select(OfficeLayout).where(OfficeLayout.project_id == project_id).order_by(OfficeLayout.created_at)
    return [_to_response(layout) for layout in db.exec(query).all()]


@router.get("/projects/{project_id}/office-layouts/active", response_model=OfficeLayoutResponse)
def get_active_office_layout(project_id: int, db: Session = Depends(get_session)):
    """Get the active office layout for a project."""
    query = select(OfficeLayout).where(
        OfficeLayout.project_id == project_id,
        OfficeLayout.is_active == True,
    )
    layout = db.exec(query).first()
    if not layout:
        raise HTTPException(404, "No active office layout")
    return _to_response(layout)


@router.get("/office-layouts/{layout_id}", response_model=OfficeLayoutResponse)
def get_office_layout(layout_id: int, db: Session = Depends(get_session)):
    """Get a single office layout."""
    layout = db.get(OfficeLayout, layout_id)
    if not layout:
        raise HTTPException(404, "Office layout not found")
    return _to_response(layout)


@router.patch("/office-layouts/{layout_id}", response_model=OfficeLayoutResponse)
def update_office_layout(layout_id: int, body: OfficeLayoutUpdate, db: Session = Depends(get_session)):
    """Update an office layout. Auto-regenerates nav graph when layout data changes."""
    layout = db.get(OfficeLayout, layout_id)
    if not layout:
        raise HTTPException(404, "Office layout not found")

    data = body.model_dump(exclude_unset=True)
    layout_data_changed = False

    for key, value in data.items():
        if key in ("objects_data", "zones_data", "walls_data"):
            setattr(layout, key, json.dumps(value))
            layout_data_changed = True
        elif key in ("grid_width", "grid_height", "cell_size"):
            setattr(layout, key, value)
            layout_data_changed = True
        else:
            setattr(layout, key, value)

    if layout_data_changed:
        _regenerate_nav_graph(layout)

    layout.updated_at = datetime.now(timezone.utc)
    db.add(layout)
    db.commit()
    db.refresh(layout)
    return _to_response(layout)


@router.delete("/office-layouts/{layout_id}", status_code=204)
def delete_office_layout(layout_id: int, db: Session = Depends(get_session)):
    """Delete an office layout."""
    layout = db.get(OfficeLayout, layout_id)
    if not layout:
        raise HTTPException(404, "Office layout not found")
    db.delete(layout)
    db.commit()


@router.post("/office-layouts/{layout_id}/activate", response_model=OfficeLayoutResponse)
def activate_office_layout(layout_id: int, db: Session = Depends(get_session)):
    """Activate an office layout (deactivates others in same project)."""
    layout = db.get(OfficeLayout, layout_id)
    if not layout:
        raise HTTPException(404, "Office layout not found")

    # Toggle: if already active, deactivate; otherwise activate and deactivate siblings
    if layout.is_active:
        layout.is_active = False
    else:
        siblings = db.exec(select(OfficeLayout).where(
            OfficeLayout.project_id == layout.project_id,
            OfficeLayout.id != layout.id,
            OfficeLayout.is_active == True,
        )).all()
        for s in siblings:
            s.is_active = False
            db.add(s)
        layout.is_active = True

    layout.updated_at = datetime.now(timezone.utc)
    db.add(layout)
    db.commit()
    db.refresh(layout)
    return _to_response(layout)
