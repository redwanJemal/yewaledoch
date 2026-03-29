"""Post model for community content."""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Index, Integer, String, Text, func,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Post(Base):
    """Community post — curated or user-generated."""

    __tablename__ = "posts"
    __table_args__ = (
        Index("ix_posts_status_published", "status", "published_at"),
        Index("ix_posts_category", "category"),
        Index("ix_posts_author_id", "author_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Author
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Content
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    post_type: Mapped[str] = mapped_column(String(20), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    age_group: Mapped[str | None] = mapped_column(String(20))
    tags: Mapped[list] = mapped_column(ARRAY(String(50)), default=list)
    language: Mapped[str] = mapped_column(String(5), default="am")
    images: Mapped[list] = mapped_column(ARRAY(Text), default=list)

    # Flags
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    discussion_prompt: Mapped[str | None] = mapped_column(Text)

    # Source (scraped content)
    source_url: Mapped[str | None] = mapped_column(Text)
    source_subreddit: Mapped[str | None] = mapped_column(String(50))
    source_upvotes: Mapped[int | None] = mapped_column(Integer)

    # Stats
    like_count: Mapped[int] = mapped_column(Integer, default=0)
    comment_count: Mapped[int] = mapped_column(Integer, default=0)
    save_count: Mapped[int] = mapped_column(Integer, default=0)
    view_count: Mapped[int] = mapped_column(Integer, default=0)

    # Status
    status: Mapped[str] = mapped_column(String(20), default="draft")
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    author = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="post", cascade="all, delete-orphan")
    saves = relationship("Save", back_populates="post", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Post {self.title[:30]}>"
