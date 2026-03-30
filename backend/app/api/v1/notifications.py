"""Notification endpoints — list, mark read."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.core.database import get_db
from app.models.notification import Notification

router = APIRouter()


# --- Schemas ---


class NotificationResponse(BaseModel):
    """Single notification response."""
    id: str
    type: str
    title: str
    body: str
    data: dict
    is_read: bool
    created_at: str


class NotificationListResponse(BaseModel):
    """Paginated notification list."""
    notifications: list[NotificationResponse]
    total: int
    unread_count: int
    has_more: bool


class MarkReadRequest(BaseModel):
    """Mark specific notifications as read."""
    ids: list[UUID]


# --- Helpers ---


def notification_to_response(n: Notification) -> NotificationResponse:
    """Convert notification model to response."""
    return NotificationResponse(
        id=str(n.id),
        type=n.type,
        title=n.title,
        body=n.body,
        data=n.data or {},
        is_read=n.is_read,
        created_at=n.created_at.isoformat(),
    )


# --- Endpoints ---


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    unread_only: bool = Query(False),
):
    """List user's notifications (newest first)."""
    base = select(Notification).where(Notification.user_id == user.id)

    if unread_only:
        base = base.where(Notification.is_read == False)  # noqa: E712

    # Total count
    total_result = await db.execute(
        select(func.count()).select_from(base.subquery())
    )
    total = total_result.scalar() or 0

    # Unread count (always show total unread, regardless of filter)
    unread_result = await db.execute(
        select(func.count()).where(
            Notification.user_id == user.id,
            Notification.is_read == False,  # noqa: E712
        )
    )
    unread_count = unread_result.scalar() or 0

    # Fetch page
    offset = (page - 1) * per_page
    result = await db.execute(
        base.order_by(Notification.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    notifications = result.scalars().all()

    return NotificationListResponse(
        notifications=[notification_to_response(n) for n in notifications],
        total=total,
        unread_count=unread_count,
        has_more=(offset + per_page) < total,
    )


@router.post("/read")
async def mark_read(
    body: MarkReadRequest,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Mark specific notifications as read."""
    await db.execute(
        update(Notification)
        .where(
            Notification.id.in_(body.ids),
            Notification.user_id == user.id,
        )
        .values(is_read=True)
    )
    await db.commit()
    return {"message": f"Marked {len(body.ids)} notifications as read"}


@router.post("/read-all")
async def mark_all_read(
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Mark all notifications as read."""
    result = await db.execute(
        update(Notification)
        .where(
            Notification.user_id == user.id,
            Notification.is_read == False,  # noqa: E712
        )
        .values(is_read=True)
    )
    await db.commit()
    return {"message": f"Marked {result.rowcount} notifications as read"}
