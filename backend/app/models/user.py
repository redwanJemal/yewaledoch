"""User model for Telegram users."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import BigInteger, Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    """Telegram user model."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Telegram identity
    telegram_id: Mapped[int] = mapped_column(
        BigInteger, unique=True, index=True, nullable=False
    )

    # User info from Telegram
    first_name: Mapped[str | None] = mapped_column(String(255))
    last_name: Mapped[str | None] = mapped_column(String(255))
    username: Mapped[str | None] = mapped_column(String(255), index=True)
    photo_url: Mapped[str | None] = mapped_column(Text)

    # Phone verification
    phone: Mapped[str | None] = mapped_column(String(20))
    phone_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    # Role & profile
    role: Mapped[str] = mapped_column(String(20), default="reader")
    parenting_role: Mapped[str | None] = mapped_column(String(20))
    children_data: Mapped[list] = mapped_column("children", JSONB, default=list)
    city: Mapped[str | None] = mapped_column(String(100))

    # Reputation & stats
    reputation: Mapped[int] = mapped_column(Integer, default=0)
    post_count: Mapped[int] = mapped_column(Integer, default=0)
    comment_count: Mapped[int] = mapped_column(Integer, default=0)

    # Expert fields
    expert_specialty: Mapped[str | None] = mapped_column(String(100))
    expert_license: Mapped[str | None] = mapped_column(String(200))
    expert_bio: Mapped[str | None] = mapped_column(Text)
    expert_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    # Status
    is_banned: Mapped[bool] = mapped_column(Boolean, default=False)
    ban_reason: Mapped[str | None] = mapped_column(Text)

    # Preferences
    language: Mapped[str] = mapped_column(String(5), default="am")
    settings: Mapped[dict] = mapped_column(JSONB, default=dict)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="author", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="user", cascade="all, delete-orphan")
    saves = relationship("Save", back_populates="user", cascade="all, delete-orphan")
    children = relationship("Child", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<User {self.telegram_id} (@{self.username})>"

    def update_from_telegram(self, tg_user: dict) -> None:
        """Update user info from Telegram data."""
        self.username = tg_user.get("username")
        self.first_name = tg_user.get("first_name", self.first_name)
        self.last_name = tg_user.get("last_name")
        self.photo_url = tg_user.get("photo_url")

    @property
    def display_name(self) -> str:
        """Get display name."""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.first_name or self.username or "User"
