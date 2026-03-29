"""Vaccination model for child health tracking."""

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Vaccination(Base):
    """Vaccination record for a child."""

    __tablename__ = "vaccinations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    child_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("children.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    vaccine_name: Mapped[str] = mapped_column(String(100), nullable=False)
    dose_number: Mapped[int] = mapped_column(Integer, default=1)
    scheduled_date: Mapped[date | None] = mapped_column(Date)
    administered_date: Mapped[date | None] = mapped_column(Date)
    facility: Mapped[str | None] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    notes: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    child = relationship("Child", back_populates="vaccinations")

    def __repr__(self) -> str:
        return f"<Vaccination {self.vaccine_name} dose={self.dose_number}>"
