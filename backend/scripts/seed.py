"""Seed script — load initial categories and posts into the database."""

import asyncio
import json
import sys
from datetime import UTC, datetime
from pathlib import Path

# Add backend root to path so app imports work
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from app.core.database import async_session_factory, engine
from app.models import Post, User
from app.models.user import Base


SEED_DATA_DIR = Path(__file__).resolve().parent.parent / "seed_data"


async def get_or_create_system_user(session) -> User:
    """Get or create a system user to own seed posts."""
    result = await session.execute(
        select(User).where(User.telegram_id == 0)
    )
    user = result.scalar_one_or_none()
    if user:
        return user

    user = User(
        telegram_id=0,
        first_name="YeWaledoch",
        last_name="Admin",
        username="yewaledoch_bot",
        role="admin",
        language="am",
    )
    session.add(user)
    await session.flush()
    return user


async def seed_posts(session, author: User) -> int:
    """Load initial posts from JSON."""
    posts_file = SEED_DATA_DIR / "initial_posts.json"
    if not posts_file.exists():
        print("  No initial_posts.json found, skipping")
        return 0

    with open(posts_file) as f:
        posts_data = json.load(f)

    # Check how many seed posts already exist
    result = await session.execute(
        select(Post).where(Post.author_id == author.id, Post.post_type == "curated")
    )
    existing = result.scalars().all()
    existing_titles = {p.title for p in existing}

    created = 0
    now = datetime.now(UTC)

    for post_data in posts_data:
        if post_data["title"] in existing_titles:
            continue

        post = Post(
            author_id=author.id,
            title=post_data["title"],
            body=post_data["body"],
            post_type=post_data.get("post_type", "curated"),
            category=post_data["category"],
            tags=post_data.get("tags", []),
            language="am",
            discussion_prompt=post_data.get("discussion_prompt"),
            is_pinned=post_data.get("is_pinned", False),
            is_featured=post_data.get("is_featured", False),
            source_subreddit=post_data.get("source_subreddit"),
            status="published",
            published_at=now,
        )
        session.add(post)
        created += 1

    return created


async def main():
    """Run seed script."""
    print("=== YeWaledoch Seed Script ===\n")

    async with async_session_factory() as session:
        # Create system user
        print("1. Creating system user...")
        system_user = await get_or_create_system_user(session)
        print(f"   System user: {system_user.display_name} (id={system_user.id})")

        # Seed posts
        print("2. Seeding initial posts...")
        post_count = await seed_posts(session, system_user)
        print(f"   Created {post_count} posts")

        await session.commit()
        print("\nDone! Seed data loaded successfully.")


if __name__ == "__main__":
    asyncio.run(main())
