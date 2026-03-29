"""User endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.core.database import get_db
from app.models.user import User

router = APIRouter()


class UserMeResponse(BaseModel):
    """Full user profile for authenticated user."""
    id: str
    telegram_id: int
    username: str | None
    first_name: str | None
    last_name: str | None
    photo_url: str | None
    phone: str | None
    phone_verified: bool
    role: str
    parenting_role: str | None
    children_data: list
    city: str | None
    reputation: int
    post_count: int
    comment_count: int
    expert_specialty: str | None
    expert_bio: str | None
    expert_verified: bool
    language: str
    settings: dict
    created_at: str

    class Config:
        from_attributes = True


class UserPublicResponse(BaseModel):
    """Public user profile (hides private fields)."""
    id: str
    username: str | None
    first_name: str | None
    last_name: str | None
    photo_url: str | None
    role: str
    parenting_role: str | None
    city: str | None
    reputation: int
    post_count: int
    comment_count: int
    expert_specialty: str | None
    expert_bio: str | None
    expert_verified: bool
    created_at: str


class UpdateProfileRequest(BaseModel):
    """Request to update user profile."""
    first_name: str | None = None
    last_name: str | None = None
    city: str | None = None
    parenting_role: str | None = Field(None, pattern=r"^(mom|dad|guardian|other)$")
    language: str | None = Field(None, pattern=r"^(am|en)$")
    children_data: list | None = None


def user_to_me_response(user: User) -> UserMeResponse:
    """Convert User model to full profile response."""
    return UserMeResponse(
        id=str(user.id),
        telegram_id=user.telegram_id,
        username=user.username,
        first_name=user.first_name,
        last_name=user.last_name,
        photo_url=user.photo_url,
        phone=user.phone,
        phone_verified=user.phone_verified,
        role=user.role,
        parenting_role=user.parenting_role,
        children_data=user.children_data or [],
        city=user.city,
        reputation=user.reputation,
        post_count=user.post_count,
        comment_count=user.comment_count,
        expert_specialty=user.expert_specialty,
        expert_bio=user.expert_bio,
        expert_verified=user.expert_verified,
        language=user.language,
        settings=user.settings or {},
        created_at=user.created_at.isoformat() if user.created_at else "",
    )


def user_to_public_response(user: User) -> UserPublicResponse:
    """Convert User model to public profile response."""
    return UserPublicResponse(
        id=str(user.id),
        username=user.username,
        first_name=user.first_name,
        last_name=user.last_name,
        photo_url=user.photo_url,
        role=user.role,
        parenting_role=user.parenting_role,
        city=user.city,
        reputation=user.reputation,
        post_count=user.post_count,
        comment_count=user.comment_count,
        expert_specialty=user.expert_specialty,
        expert_bio=user.expert_bio,
        expert_verified=user.expert_verified,
        created_at=user.created_at.isoformat() if user.created_at else "",
    )


@router.get("/me", response_model=UserMeResponse)
async def get_me(user: CurrentUser):
    """Get current user profile."""
    return user_to_me_response(user)


@router.patch("/me", response_model=UserMeResponse)
async def update_profile(
    body: UpdateProfileRequest,
    user: CurrentUser,
):
    """Update current user profile."""
    if body.first_name is not None:
        user.first_name = body.first_name
    if body.last_name is not None:
        user.last_name = body.last_name
    if body.city is not None:
        user.city = body.city
    if body.parenting_role is not None:
        user.parenting_role = body.parenting_role
    if body.language is not None:
        user.language = body.language
    if body.children_data is not None:
        user.children_data = body.children_data

    return user_to_me_response(user)


@router.get("/{user_id}", response_model=UserPublicResponse)
async def get_user_profile(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a user's public profile."""
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user_to_public_response(user)
