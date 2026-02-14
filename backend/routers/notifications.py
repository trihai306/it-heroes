"""
Notifications router — CRUD endpoints for notifications.
"""

from fastapi import APIRouter
from sqlmodel import Session, select, desc

from database import engine
from models.notification import Notification

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def list_notifications(limit: int = 50, offset: int = 0):
    """List notifications, newest first."""
    with Session(engine) as db:
        stmt = (
            select(Notification)
            .order_by(desc(Notification.created_at))
            .offset(offset)
            .limit(limit)
        )
        notifications = db.exec(stmt).all()
        total = len(db.exec(select(Notification)).all())
    return {
        "items": [n.model_dump() for n in notifications],
        "total": total,
    }


@router.get("/unread-count")
def unread_count():
    """Get count of unread notifications."""
    with Session(engine) as db:
        unread = db.exec(
            select(Notification).where(Notification.is_read == False)
        ).all()
    return {"count": len(unread)}


@router.patch("/{notification_id}/read")
def mark_as_read(notification_id: str):
    """Mark a single notification as read."""
    with Session(engine) as db:
        notif = db.get(Notification, notification_id)
        if not notif:
            return {"error": "Notification not found"}
        notif.is_read = True
        db.add(notif)
        db.commit()
        db.refresh(notif)
    return notif.model_dump()


@router.post("/read-all")
def mark_all_read():
    """Mark all notifications as read."""
    with Session(engine) as db:
        unread = db.exec(
            select(Notification).where(Notification.is_read == False)
        ).all()
        for n in unread:
            n.is_read = True
            db.add(n)
        db.commit()
    return {"success": True, "updated": len(unread)}
