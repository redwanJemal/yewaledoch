"""Telegram bot notification service for YeWaledoch."""

import asyncio
import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

TELEGRAM_API = f"https://api.telegram.org/bot{{}}/sendMessage"


async def send_telegram_notification(
    telegram_id: int,
    text: str,
    post_id: str | None = None,
) -> bool:
    """Send a notification to a user via Telegram bot.

    Includes an inline keyboard button to open the Mini App when post_id is provided.
    """
    if not settings.BOT_TOKEN:
        logger.warning("No BOT_TOKEN configured, skipping Telegram notification")
        return False

    url = TELEGRAM_API.format(settings.BOT_TOKEN)

    reply_markup = None
    if post_id and settings.BOT_USERNAME:
        web_app_url = f"https://t.me/{settings.BOT_USERNAME}?startapp=p_{post_id}"
        reply_markup = {
            "inline_keyboard": [[
                {"text": "📖 ክፈት / Open", "url": web_app_url}
            ]]
        }

    payload: dict = {
        "chat_id": telegram_id,
        "text": text,
        "parse_mode": "HTML",
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=10.0)
            if response.status_code == 200:
                return True
            logger.error("Telegram API error: %s - %s", response.status_code, response.text)
            return False
    except Exception as e:
        logger.error("Failed to send Telegram notification: %s", e)
        return False


async def notify_comment_reply(
    post_author_telegram_id: int,
    commenter_name: str,
    post_title: str,
    post_id: str,
) -> bool:
    """Notify post author when someone comments on their post."""
    text = (
        f"💬 <b>አዲስ አስተያየት / New Comment</b>\n\n"
        f"<b>{commenter_name}</b> በፅሁፍዎ ላይ አስተያየት ሰጥቷል\n"
        f"ርዕስ: {post_title}"
    )
    return await send_telegram_notification(
        telegram_id=post_author_telegram_id,
        text=text,
        post_id=post_id,
    )


async def notify_like(
    post_author_telegram_id: int,
    liker_name: str,
    post_title: str,
    post_id: str,
) -> bool:
    """Notify post author when someone likes their post."""
    text = (
        f"❤️ <b>አዲስ ላይክ / New Like</b>\n\n"
        f"<b>{liker_name}</b> ፅሁፍዎን ወድዷል\n"
        f"ርዕስ: {post_title}"
    )
    return await send_telegram_notification(
        telegram_id=post_author_telegram_id,
        text=text,
        post_id=post_id,
    )


async def notify_expert_answer(
    post_author_telegram_id: int,
    expert_name: str,
    post_title: str,
    post_id: str,
) -> bool:
    """Notify post author when an expert answers their post."""
    text = (
        f"🎓 <b>የባለሙያ መልስ / Expert Answer</b>\n\n"
        f"<b>{expert_name}</b> ለጥያቄዎ የባለሙያ መልስ ሰጥቷል\n"
        f"ርዕስ: {post_title}"
    )
    return await send_telegram_notification(
        telegram_id=post_author_telegram_id,
        text=text,
        post_id=post_id,
    )


async def broadcast_to_all(
    telegram_ids: list[int],
    title: str,
    body: str,
) -> int:
    """Send broadcast message to all users via Telegram.

    Sends in batches respecting Telegram's rate limit (~30 msgs/sec).
    Returns the number of successfully sent messages.
    """
    if not settings.BOT_TOKEN:
        logger.warning("No BOT_TOKEN configured, skipping broadcast")
        return 0

    url = TELEGRAM_API.format(settings.BOT_TOKEN)
    text = f"📢 <b>{title}</b>\n\n{body}"
    sent = 0

    async with httpx.AsyncClient() as client:
        for i, tid in enumerate(telegram_ids):
            try:
                response = await client.post(
                    url,
                    json={"chat_id": tid, "text": text, "parse_mode": "HTML"},
                    timeout=10.0,
                )
                if response.status_code == 200:
                    sent += 1
            except Exception as e:
                logger.error("Failed to send broadcast to %s: %s", tid, e)

            # Respect Telegram rate limit: ~30 msgs/sec → sleep every 30 messages
            if (i + 1) % 30 == 0:
                await asyncio.sleep(1.0)

    logger.info("Broadcast sent to %d/%d users", sent, len(telegram_ids))
    return sent
