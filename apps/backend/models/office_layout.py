"""OfficeLayout model — persists 2D office builder layouts per project."""

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


class OfficeLayout(SQLModel, table=True):
    __tablename__ = "office_layouts"

    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(index=True)
    name: str = Field(default="Default Office")

    # Grid configuration
    grid_width: int = Field(default=32)
    grid_height: int = Field(default=24)
    cell_size: float = Field(default=1.0)

    # Layout data — JSON arrays stored as strings (same pattern as Workflow)
    objects_data: str = Field(default="[]")     # placed furniture objects
    zones_data: str = Field(default="[]")       # department zone boundaries
    walls_data: str = Field(default="[]")       # wall segments
    nav_graph_data: str = Field(default="[]")   # auto-generated navigation graph

    is_active: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
