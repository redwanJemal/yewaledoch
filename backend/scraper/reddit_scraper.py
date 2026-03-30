"""Reddit scraper — fetch top parenting posts from subreddits."""

import asyncio

import httpx
import structlog

from scraper import MAX_COMMENTS_PER_POST, REQUEST_DELAY, SUBREDDIT_SOURCES, USER_AGENT

logger = structlog.get_logger(__name__)


async def fetch_subreddit_posts(
    client: httpx.AsyncClient,
    subreddit: str,
    limit: int = 20,
    timeframe: str = "day",
) -> list[dict]:
    """Fetch top posts from a subreddit using Reddit's public JSON API."""
    url = f"https://www.reddit.com/r/{subreddit}/top/.json"
    params = {"t": timeframe, "limit": limit}

    response = await client.get(url, params=params)
    response.raise_for_status()

    data = response.json()
    children = data.get("data", {}).get("children", [])

    posts = []
    for child in children:
        post_data = child.get("data", {})
        posts.append({
            "reddit_post_id": post_data.get("id", ""),
            "title": post_data.get("title", ""),
            "selftext": post_data.get("selftext", ""),
            "author": post_data.get("author", ""),
            "upvotes": post_data.get("ups", 0),
            "num_comments": post_data.get("num_comments", 0),
            "permalink": post_data.get("permalink", ""),
            "subreddit": post_data.get("subreddit", subreddit),
            "link_flair_text": post_data.get("link_flair_text"),
        })

    return posts


async def fetch_post_comments(
    client: httpx.AsyncClient,
    permalink: str,
    max_comments: int = MAX_COMMENTS_PER_POST,
) -> list[dict]:
    """Fetch top comments for a specific Reddit post."""
    url = f"https://www.reddit.com{permalink}.json"
    params = {"limit": max_comments, "sort": "top"}

    try:
        response = await client.get(url, params=params)
        response.raise_for_status()

        data = response.json()
        if len(data) < 2:
            return []

        comments_data = data[1].get("data", {}).get("children", [])
        comments = []
        for comment in comments_data[:max_comments]:
            if comment.get("kind") != "t1":
                continue
            c = comment.get("data", {})
            body = c.get("body", "")
            if body and body != "[deleted]" and body != "[removed]":
                comments.append({
                    "author": c.get("author", ""),
                    "body": body,
                    "upvotes": c.get("ups", 0),
                })

        return comments
    except Exception:
        logger.warning("failed_to_fetch_comments", permalink=permalink)
        return []


async def scrape_reddit(
    existing_reddit_ids: set[str] | None = None,
) -> list[dict]:
    """
    Scrape top posts from configured subreddits.

    Args:
        existing_reddit_ids: Set of reddit_post_id values already in the database.
            Posts with these IDs will be skipped.

    Returns:
        List of scraped post dicts with top comments included.
    """
    if existing_reddit_ids is None:
        existing_reddit_ids = set()

    all_posts: list[dict] = []

    async with httpx.AsyncClient(
        headers={"User-Agent": USER_AGENT},
        timeout=30.0,
        follow_redirects=True,
    ) as client:
        for source in SUBREDDIT_SOURCES:
            subreddit = source["name"]
            min_upvotes = source["min_upvotes"]
            limit = source["limit"]

            logger.info(
                "scraping_subreddit",
                subreddit=subreddit,
                limit=limit,
                min_upvotes=min_upvotes,
            )

            try:
                posts = await fetch_subreddit_posts(
                    client, subreddit, limit=limit
                )
            except httpx.HTTPError as e:
                logger.error(
                    "subreddit_fetch_failed",
                    subreddit=subreddit,
                    error=str(e),
                )
                await asyncio.sleep(REQUEST_DELAY)
                continue

            await asyncio.sleep(REQUEST_DELAY)

            for post in posts:
                # Skip low-upvote posts
                if post["upvotes"] < min_upvotes:
                    continue

                # Skip already-scraped posts
                if post["reddit_post_id"] in existing_reddit_ids:
                    logger.debug(
                        "skipping_duplicate",
                        reddit_post_id=post["reddit_post_id"],
                    )
                    continue

                # Skip posts without body text (link posts, image posts)
                if not post["selftext"].strip():
                    continue

                # Fetch top comments
                comments = await fetch_post_comments(
                    client, post["permalink"]
                )
                post["top_comments"] = comments

                await asyncio.sleep(REQUEST_DELAY)

                all_posts.append(post)
                logger.info(
                    "scraped_post",
                    reddit_post_id=post["reddit_post_id"],
                    subreddit=post["subreddit"],
                    upvotes=post["upvotes"],
                    comments_fetched=len(comments),
                )

    logger.info("scrape_complete", total_posts=len(all_posts))
    return all_posts
