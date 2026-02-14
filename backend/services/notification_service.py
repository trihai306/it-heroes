"""
Notification service — create & broadcast notifications.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from sqlmodel import Session

from database import engine
from models.notification import Notification

if TYPE_CHECKING:
    from ws import WSManager

logger = logging.getLogger(__name__)

# Module-level reference set by main.py at startup
_ws_manager: WSManager | None = None


def set_ws_manager(ws: WSManager):
    global _ws_manager
    _ws_manager = ws


async def create_notification(
    *,
    type: str = "system",
    title: str = "",
    message: str = "",
    avatar: str = "",
    related_id: str | None = None,
) -> Notification:
    """Create a notification, persist it, and broadcast via WS."""
    notif = Notification(
        type=type,
        title=title,
        message=message,
        avatar=avatar,
        related_id=related_id,
    )
    with Session(engine) as db:
        db.add(notif)
        db.commit()
        db.refresh(notif)

    logger.info("Notification created: [%s] %s", notif.type, notif.title)

    # Broadcast to all connected WS clients
    if _ws_manager:
        await _ws_manager.broadcast({
            "type": "notification_created",
            "notification": notif.model_dump(),
        })

    return notif
