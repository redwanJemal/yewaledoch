"""LLMSettings model — admin-configurable LLM provider for translation."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class LLMSettings(Base):
    """Singleton table holding the active LLM provider configuration."""

    __tablename__ = "llm_settings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Provider: "anthropic" | "openai" | "deepseek" | "custom"
    provider: Mapped[str] = mapped_column(String(50), nullable=False, default="anthropic")

    # API key for the chosen provider (stored as-is; mask in API responses)
    api_key: Mapped[str] = mapped_column(Text, nullable=False, default="")

    # Model identifier (e.g. "claude-sonnet-4-20250514", "deepseek-chat", "gpt-4o")
    model: Mapped[str] = mapped_column(String(200), nullable=False, default="claude-sonnet-4-20250514")

    # Optional base URL — required for DeepSeek, custom OpenAI-compatible endpoints
    base_url: Mapped[str | None] = mapped_column(Text)

    # Whether to use these DB settings (false = fall back to ANTHROPIC_API_KEY env var)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    def __repr__(self) -> str:
        return f"<LLMSettings provider={self.provider} model={self.model} enabled={self.enabled}>"
