"""Seed the database with scraped and translated Reddit posts — published directly."""

import asyncio
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text
from app.core.database import engine, Base, async_session_factory


SEED_FILE = Path(__file__).resolve().parent.parent / "seed_data" / "scraped_posts.json"


async def seed():
    # Create tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    with open(SEED_FILE) as f:
        posts = json.load(f)

    print(f"Seeding {len(posts)} posts...")

    async with async_session_factory() as db:
        # Create or get the system user for curated posts
        system_user_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
        result = await db.execute(text("SELECT id FROM users WHERE id = :id"), {"id": system_user_id})
        if not result.first():
            await db.execute(text("""
                INSERT INTO users (
                    id, telegram_id, first_name, last_name, role, language,
                    phone_verified, is_banned, expert_verified, reputation,
                    post_count, comment_count, settings, children,
                    created_at, updated_at
                ) VALUES (
                    :id, 0, 'YeWaledoch', 'Bot', 'admin', 'am',
                    false, false, false, 0,
                    0, 0, '{}', '[]',
                    :now, :now
                )
            """), {"id": system_user_id, "now": datetime.now(timezone.utc)})
            await db.commit()
            print("Created system user: YeWaledoch Bot")

        # Check existing posts to avoid duplicates
        result = await db.execute(text("SELECT source_url FROM posts WHERE source_url IS NOT NULL"))
        existing_urls = {row[0] for row in result.all()}

        count = 0
        for post in posts:
            source_url = f"https://www.reddit.com{post['permalink']}"
            if source_url in existing_urls:
                print(f"  Skipping duplicate: {post['reddit_post_id']}")
                continue

            post_id = uuid.uuid4()
            now = datetime.now(timezone.utc)

            await db.execute(text("""
                INSERT INTO posts (
                    id, author_id, title, body, post_type, category, language,
                    source_url, source_subreddit, source_upvotes,
                    status, published_at, created_at, updated_at,
                    like_count, comment_count, save_count, view_count,
                    is_anonymous, is_pinned, is_featured,
                    tags, images
                ) VALUES (
                    :id, :author_id, :title, :body, 'curated', :category, 'am',
                    :source_url, :subreddit, :upvotes,
                    'published', :now, :now, :now,
                    0, 0, 0, 0,
                    false, false, false,
                    '{}', '{}'
                )
            """), {
                "author_id": system_user_id,
                "id": post_id,
                "title": post["translated_title"],
                "body": post["translated_body"],
                "category": post["category"],
                "source_url": source_url,
                "subreddit": post["subreddit"],
                "upvotes": post["upvotes"],
                "now": now,
            })
            count += 1
            print(f"  ✓ [{post['category']}] {post['translated_title'][:60]}...")

        await db.commit()
        print(f"\nSeeded {count} new posts successfully!")


if __name__ == "__main__":
    asyncio.run(seed())
