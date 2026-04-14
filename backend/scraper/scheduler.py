"""Pipeline orchestrator — scrape Reddit, translate, save drafts, notify admin."""

import asyncio
import sys

import httpx
import structlog
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db_context
from app.models.scraped_draft import ScrapedDraft
from scraper.reddit_scraper import scrape_reddit
from scraper.translator import LLMConfig, translate_post

logger = structlog.get_logger(__name__)


async def get_existing_reddit_ids() -> set[str]:
    """Fetch all reddit_post_id values already in the database."""
    async with get_db_context() as db:
        result = await db.execute(select(ScrapedDraft.reddit_post_id))
        return {row[0] for row in result.all()}


async def load_llm_config_from_db() -> LLMConfig | None:
    """
    Load LLM provider settings from the database.

    Returns the DB config if one exists and is enabled, otherwise falls back
    to the ANTHROPIC_API_KEY environment variable.
    """
    try:
        from app.models.llm_settings import LLMSettings

        async with get_db_context() as db:
            result = await db.execute(
                select(LLMSettings).where(LLMSettings.enabled == True).limit(1)  # noqa: E712
            )
            row = result.scalar_one_or_none()
            if row and row.api_key:
                return LLMConfig(
                    provider=row.provider,
                    api_key=row.api_key,
                    model=row.model,
                    base_url=row.base_url,
                )
    except Exception as e:
        logger.warning("llm_config_db_load_failed", error=str(e))

    # Fall back to environment variable
    return LLMConfig.from_env()


async def save_draft(post: dict, translation: dict | None) -> None:
    """Save a scraped post as a draft in the database."""
    async with get_db_context() as db:
        draft = ScrapedDraft(
            reddit_post_id=post["reddit_post_id"],
            reddit_url=f"https://www.reddit.com{post['permalink']}",
            subreddit=post["subreddit"],
            original_title=post["title"],
            original_body=post["selftext"],
            original_upvotes=post["upvotes"],
            original_comments=post["num_comments"],
            top_comments=post.get("top_comments", []),
            translated_title=translation["translated_title"] if translation else None,
            translated_body=translation["translated_body"] if translation else None,
            translated_comments=translation.get("translated_comments", []) if translation else [],
            category=translation.get("suggested_category") if translation else None,
            status="pending",
        )
        db.add(draft)
        logger.info(
            "draft_saved",
            reddit_post_id=post["reddit_post_id"],
            translated=translation is not None,
        )


async def notify_admins(count: int) -> None:
    """Send Telegram notification to admin users about new drafts."""
    if not settings.BOT_TOKEN or not settings.ADMIN_TELEGRAM_IDS:
        logger.info("admin_notification_skipped", reason="no bot token or admin IDs")
        return

    message = f"📝 {count} new draft{'s' if count != 1 else ''} ready for review"

    async with httpx.AsyncClient(timeout=10.0) as client:
        for admin_id in settings.admin_ids:
            try:
                url = f"https://api.telegram.org/bot{settings.BOT_TOKEN}/sendMessage"
                response = await client.post(
                    url,
                    json={"chat_id": admin_id, "text": message},
                )
                response.raise_for_status()
                logger.info("admin_notified", telegram_id=admin_id)
            except Exception as e:
                logger.error(
                    "admin_notification_failed",
                    telegram_id=admin_id,
                    error=str(e),
                )


async def run_pipeline() -> dict:
    """
    Main pipeline: scrape → translate → save drafts → notify admin.

    Returns:
        Summary dict with counts of scraped, translated, and saved posts.
    """
    logger.info("pipeline_started")

    # Step 1: Get existing reddit IDs to avoid duplicates
    existing_ids = await get_existing_reddit_ids()
    logger.info("existing_drafts_loaded", count=len(existing_ids))

    # Step 2: Load LLM config once (DB settings take priority over env vars)
    llm_config = await load_llm_config_from_db()
    if llm_config:
        logger.info("llm_config_loaded", provider=llm_config.provider, model=llm_config.model)
    else:
        logger.warning("llm_config_unavailable", reason="no API key configured")

    # Step 3: Scrape new posts from Reddit
    try:
        posts = await scrape_reddit(existing_reddit_ids=existing_ids)
    except Exception as e:
        logger.error("scrape_failed", error=str(e))
        return {"scraped": 0, "translated": 0, "saved": 0, "errors": 1}

    if not posts:
        logger.info("no_new_posts_found")
        return {"scraped": 0, "translated": 0, "saved": 0, "errors": 0}

    logger.info("posts_scraped", count=len(posts))

    # Step 4: Translate and save each post
    translated_count = 0
    saved_count = 0
    error_count = 0

    for post in posts:
        try:
            translation = await translate_post(
                title=post["title"],
                body=post["selftext"],
                comments=post.get("top_comments", []),
                llm_config=llm_config,
            )

            if translation:
                translated_count += 1

            await save_draft(post, translation)
            saved_count += 1

        except Exception as e:
            error_count += 1
            logger.error(
                "post_processing_failed",
                reddit_post_id=post["reddit_post_id"],
                error=str(e),
            )

    # Step 5: Notify admins
    if saved_count > 0:
        await notify_admins(saved_count)

    summary = {
        "scraped": len(posts),
        "translated": translated_count,
        "saved": saved_count,
        "errors": error_count,
    }
    logger.info("pipeline_complete", **summary)
    return summary


def main() -> None:
    """Entry point for `python -m scraper.scheduler`."""
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.dev.set_exc_info,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.dev.ConsoleRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(0),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

    summary = asyncio.run(run_pipeline())
    print(f"\nPipeline complete: {summary}")

    if summary.get("errors", 0) > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
