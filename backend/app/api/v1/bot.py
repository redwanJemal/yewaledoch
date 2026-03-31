"""Telegram bot webhook handler."""

import logging

from fastapi import APIRouter, Request
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db_context
from app.models.user import User

router = APIRouter()
logger = logging.getLogger("bot.webhook")


@router.post("/webhook")
async def bot_webhook(request: Request):
    """Handle incoming Telegram bot updates.

    Processes contact messages to save user phone numbers.
    """
    try:
        data = await request.json()
    except Exception:
        return {"ok": True}

    message = data.get("message")
    if not message:
        return {"ok": True}

    contact = message.get("contact")
    if not contact:
        return {"ok": True}

    # Contact shared — extract phone and user info
    phone_number = contact.get("phone_number")
    # The user_id in contact is the Telegram user whose contact was shared
    contact_user_id = contact.get("user_id")
    # The from field is who sent the message (should be the same user)
    from_user = message.get("from", {})
    sender_telegram_id = from_user.get("id")

    # Use the contact's user_id if available, otherwise the sender
    telegram_id = contact_user_id or sender_telegram_id

    if not phone_number or not telegram_id:
        return {"ok": True}

    # Normalize phone number (ensure + prefix)
    if not phone_number.startswith("+"):
        phone_number = f"+{phone_number}"

    logger.info("Contact received: telegram_id=%s phone=%s", telegram_id, phone_number[:6] + "***")

    # Save phone to user record
    async with get_db_context() as db:
        result = await db.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        user = result.scalar_one_or_none()
        if user:
            user.phone = phone_number
            user.phone_verified = True
            logger.info("Phone saved for user %s", user.id)

    return {"ok": True}
