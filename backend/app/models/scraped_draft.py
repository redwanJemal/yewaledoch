"""ScrapedDraft model for Reddit content pipeline."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ScrapedDraft(Base):
    """Scraped Reddit post awaiting review and publication."""

    __tablename__ = "scraped_drafts"
    __table_args__ = (
        Index("ix_scraped_drafts_status_scraped", "status", "scraped_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Reddit source
    reddit_post_id: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False
    )
    reddit_url: Mapped[str | None] = mapped_column(Text)
    subreddit: Mapped[str | None] = mapped_column(String(50))
    original_title: Mapped[str | None] = mapped_column(Text)
    original_body: Mapped[str | None] = mapped_column(Text)
    original_upvotes: Mapped[int | None] = mapped_column(Integer)
    original_comments: Mapped[int | None] = mapped_column(Integer)
    top_comments: Mapped[list] = mapped_column(JSONB, default=list)

    # Translated content
    translated_title: Mapped[str | None] = mapped_column(Text)
    translated_body: Mapped[str | None] = mapped_column(Text)
    translated_comments: Mapped[list] = mapped_column(JSONB, default=list)

    # Review status
    status: Mapped[str] = mapped_column(String(20), default="pending")
    category: Mapped[str | None] = mapped_column(String(50))
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"),
    )
    published_post_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("posts.id"),
    )
    notes: Mapped[str | None] = mapped_column(Text)

    # Timestamps
    scraped_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relationships
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    published_post = relationship("Post", foreign_keys=[published_post_id])

    def __repr__(self) -> str:
        return f"<ScrapedDraft {self.reddit_post_id} status={self.status}>"
