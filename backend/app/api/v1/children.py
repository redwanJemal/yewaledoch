"""Children endpoints — CRUD, vaccinations, milestones."""

import json
from datetime import date, timedelta
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser
from app.core.database import get_db
from app.models.child import Child
from app.models.milestone import Milestone
from app.models.vaccination import Vaccination

router = APIRouter()

SEED_DIR = Path(__file__).resolve().parents[3] / "seed_data"


# --- Schemas ---


class ChildCreate(BaseModel):
    """Create child request."""
    name: str = Field(..., min_length=1, max_length=100)
    date_of_birth: date
    gender: str | None = Field(None, pattern=r"^[MF]$")


class ChildUpdate(BaseModel):
    """Update child request."""
    name: str | None = Field(None, min_length=1, max_length=100)
    date_of_birth: date | None = None
    gender: str | None = Field(None, pattern=r"^[MF]$")


class ChildResponse(BaseModel):
    """Child response."""
    id: str
    name: str
    date_of_birth: str
    gender: str | None
    photo_url: str | None
    created_at: str


class VaccinationResponse(BaseModel):
    """Vaccination record response."""
    id: str
    vaccine_name: str
    dose_number: int
    scheduled_date: str | None
    administered_date: str | None
    facility: str | None
    status: str
    notes: str | None


class VaccinationLog(BaseModel):
    """Log a vaccination as completed."""
    vaccine_name: str = Field(..., min_length=1)
    dose_number: int = Field(1, ge=1)
    administered_date: date
    facility: str | None = None
    notes: str | None = None


class MilestoneResponse(BaseModel):
    """Milestone response."""
    id: str
    milestone_type: str
    completed_at: str | None
    notes: str | None
    photo_url: str | None


class MilestoneLog(BaseModel):
    """Log a milestone."""
    milestone_type: str = Field(..., min_length=1, max_length=50)
    completed_at: date | None = None
    notes: str | None = None
    photo_url: str | None = None


# --- Helpers ---


def child_to_response(c: Child) -> ChildResponse:
    return ChildResponse(
        id=str(c.id),
        name=c.name,
        date_of_birth=c.date_of_birth.isoformat(),
        gender=c.gender,
        photo_url=c.photo_url,
        created_at=c.created_at.isoformat(),
    )


async def _get_child_or_404(
    child_id: UUID, user_id, db: AsyncSession
) -> Child:
    """Fetch child ensuring ownership."""
    result = await db.execute(
        select(Child).where(Child.id == child_id, Child.user_id == user_id)
    )
    child = result.scalar_one_or_none()
    if not child:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Child not found")
    return child


def _generate_vaccination_schedule(dob: date) -> list[dict]:
    """Generate vaccination schedule based on Ethiopian EPI and child's DOB."""
    vaccines_path = SEED_DIR / "ethiopian_vaccines.json"
    with open(vaccines_path) as f:
        schedule = json.load(f)

    records = []
    for stage in schedule:
        age_weeks = stage["age_weeks"]
        scheduled = dob + timedelta(weeks=age_weeks)
        for vaccine in stage["vaccines"]:
            records.append({
                "vaccine_name": vaccine["name"],
                "dose_number": vaccine["dose"],
                "scheduled_date": scheduled,
                "status": "pending",
            })
    return records


# --- Child CRUD ---


@router.get("", response_model=list[ChildResponse])
async def list_children(
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """List user's children."""
    result = await db.execute(
        select(Child)
        .where(Child.user_id == user.id)
        .order_by(Child.created_at)
    )
    children = result.scalars().all()
    return [child_to_response(c) for c in children]


@router.post("", response_model=ChildResponse, status_code=status.HTTP_201_CREATED)
async def create_child(
    body: ChildCreate,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Add a child and pre-populate vaccination schedule."""
    child = Child(
        user_id=user.id,
        name=body.name,
        date_of_birth=body.date_of_birth,
        gender=body.gender,
    )
    db.add(child)
    await db.flush()

    # Pre-populate vaccination schedule based on Ethiopian EPI
    schedule = _generate_vaccination_schedule(body.date_of_birth)
    for rec in schedule:
        vaccination = Vaccination(child_id=child.id, **rec)
        db.add(vaccination)

    await db.commit()
    await db.refresh(child)
    return child_to_response(child)


@router.patch("/{child_id}", response_model=ChildResponse)
async def update_child(
    child_id: UUID,
    body: ChildUpdate,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Update child info."""
    child = await _get_child_or_404(child_id, user.id, db)

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(child, field, value)

    await db.commit()
    await db.refresh(child)
    return child_to_response(child)


@router.delete("/{child_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_child(
    child_id: UUID,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Remove child (cascades vaccinations and milestones)."""
    child = await _get_child_or_404(child_id, user.id, db)
    await db.delete(child)
    await db.commit()


# --- Vaccinations ---


@router.get("/{child_id}/vaccinations", response_model=list[VaccinationResponse])
async def list_vaccinations(
    child_id: UUID,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Get vaccination schedule for a child."""
    await _get_child_or_404(child_id, user.id, db)

    result = await db.execute(
        select(Vaccination)
        .where(Vaccination.child_id == child_id)
        .order_by(Vaccination.scheduled_date, Vaccination.vaccine_name)
    )
    vaccinations = result.scalars().all()
    return [
        VaccinationResponse(
            id=str(v.id),
            vaccine_name=v.vaccine_name,
            dose_number=v.dose_number,
            scheduled_date=v.scheduled_date.isoformat() if v.scheduled_date else None,
            administered_date=v.administered_date.isoformat() if v.administered_date else None,
            facility=v.facility,
            status=v.status,
            notes=v.notes,
        )
        for v in vaccinations
    ]


@router.post(
    "/{child_id}/vaccinations",
    response_model=VaccinationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def log_vaccination(
    child_id: UUID,
    body: VaccinationLog,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Log a vaccination as completed.

    If a matching pending vaccination exists in the schedule, update it.
    Otherwise, create a new record.
    """
    await _get_child_or_404(child_id, user.id, db)

    # Try to find existing pending record for this vaccine+dose
    result = await db.execute(
        select(Vaccination).where(
            Vaccination.child_id == child_id,
            Vaccination.vaccine_name == body.vaccine_name,
            Vaccination.dose_number == body.dose_number,
            Vaccination.status == "pending",
        )
    )
    vaccination = result.scalar_one_or_none()

    if vaccination:
        vaccination.administered_date = body.administered_date
        vaccination.facility = body.facility
        vaccination.notes = body.notes
        vaccination.status = "completed"
    else:
        vaccination = Vaccination(
            child_id=child_id,
            vaccine_name=body.vaccine_name,
            dose_number=body.dose_number,
            administered_date=body.administered_date,
            facility=body.facility,
            notes=body.notes,
            status="completed",
        )
        db.add(vaccination)

    await db.commit()
    await db.refresh(vaccination)

    return VaccinationResponse(
        id=str(vaccination.id),
        vaccine_name=vaccination.vaccine_name,
        dose_number=vaccination.dose_number,
        scheduled_date=vaccination.scheduled_date.isoformat() if vaccination.scheduled_date else None,
        administered_date=vaccination.administered_date.isoformat() if vaccination.administered_date else None,
        facility=vaccination.facility,
        status=vaccination.status,
        notes=vaccination.notes,
    )


# --- Milestones ---


@router.get("/{child_id}/milestones", response_model=list[MilestoneResponse])
async def list_milestones(
    child_id: UUID,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Get milestones for a child."""
    await _get_child_or_404(child_id, user.id, db)

    result = await db.execute(
        select(Milestone)
        .where(Milestone.child_id == child_id)
        .order_by(Milestone.created_at)
    )
    milestones = result.scalars().all()
    return [
        MilestoneResponse(
            id=str(m.id),
            milestone_type=m.milestone_type,
            completed_at=m.completed_at.isoformat() if m.completed_at else None,
            notes=m.notes,
            photo_url=m.photo_url,
        )
        for m in milestones
    ]


@router.post(
    "/{child_id}/milestones",
    response_model=MilestoneResponse,
    status_code=status.HTTP_201_CREATED,
)
async def log_milestone(
    child_id: UUID,
    body: MilestoneLog,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Log a milestone for a child."""
    await _get_child_or_404(child_id, user.id, db)

    milestone = Milestone(
        child_id=child_id,
        milestone_type=body.milestone_type,
        completed_at=body.completed_at,
        notes=body.notes,
        photo_url=body.photo_url,
    )
    db.add(milestone)
    await db.commit()
    await db.refresh(milestone)

    return MilestoneResponse(
        id=str(milestone.id),
        milestone_type=milestone.milestone_type,
        completed_at=milestone.completed_at.isoformat() if milestone.completed_at else None,
        notes=milestone.notes,
        photo_url=milestone.photo_url,
    )
