"""Authentication endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, validate_telegram_init_data
from app.models.user import User

router = APIRouter()


class AuthRequest(BaseModel):
    """Request body for Telegram authentication."""
    init_data: str


class UserOut(BaseModel):
    """User data in auth response."""
    id: str
    telegram_id: int
    username: str | None
    first_name: str | None
    last_name: str | None
    photo_url: str | None
    role: str
    language: str
    city: str | None
    parenting_role: str | None
    reputation: int
    post_count: int

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    """Response with JWT token and user info."""
    access_token: str
    token_type: str = "bearer"
    user: UserOut


@router.post("/telegram", response_model=AuthResponse)
async def auth_telegram(
    body: AuthRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate via Telegram initData.

    Validates the initData from Telegram Mini App and returns a JWT token.
    Creates user if doesn't exist, updates if exists.
    """
    init_data = validate_telegram_init_data(body.init_data)
    if not init_data or "user" not in init_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram initData",
        )

    tg_user = init_data["user"]
    telegram_id = tg_user.get("id")

    if not telegram_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing user ID in initData",
        )

    # Get or create user
    result = await db.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()

    is_admin = telegram_id in settings.admin_ids

    if user is None:
        user = User(
            telegram_id=telegram_id,
            username=tg_user.get("username"),
            first_name=tg_user.get("first_name", "User"),
            last_name=tg_user.get("last_name"),
            photo_url=tg_user.get("photo_url"),
            role="admin" if is_admin else "member",
        )
        db.add(user)
        await db.flush()
    else:
        user.update_from_telegram(tg_user)
        # Always keep admin role in sync with ADMIN_TELEGRAM_IDS
        if is_admin and user.role != "admin":
            user.role = "admin"

    if user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is banned",
        )

    # Create JWT token
    token = create_access_token(
        data={"sub": str(user.id), "telegram_id": user.telegram_id}
    )

    return AuthResponse(
        access_token=token,
        user=UserOut(
            id=str(user.id),
            telegram_id=user.telegram_id,
            username=user.username,
            first_name=user.first_name,
            last_name=user.last_name,
            photo_url=user.photo_url,
            role=user.role,
            language=user.language,
            city=user.city,
            parenting_role=user.parenting_role,
            reputation=user.reputation,
            post_count=user.post_count,
        ),
    )
