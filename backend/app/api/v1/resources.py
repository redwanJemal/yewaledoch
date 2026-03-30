"""Resources endpoints — static reference data."""

import json
from functools import lru_cache
from pathlib import Path

from fastapi import APIRouter

router = APIRouter()

SEED_DIR = Path(__file__).resolve().parents[3] / "seed_data"


@lru_cache
def _load_json(filename: str) -> list:
    """Load and cache a seed data JSON file."""
    with open(SEED_DIR / filename) as f:
        return json.load(f)


@router.get("/vaccines")
async def get_vaccines():
    """Ethiopian EPI vaccination schedule reference."""
    return _load_json("ethiopian_vaccines.json")


@router.get("/milestones")
async def get_milestones():
    """Milestone reference list by age."""
    return _load_json("milestones.json")


@router.get("/categories")
async def get_categories():
    """Content categories list."""
    return _load_json("categories.json")
