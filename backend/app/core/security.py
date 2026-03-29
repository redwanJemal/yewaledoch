"""Security utilities: Telegram validation, JWT tokens."""

import hashlib
import hmac
import json
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import parse_qsl, unquote

from jose import JWTError, jwt

from app.core.config import settings


def validate_telegram_init_data(init_data: str) -> dict | None:
    """
    Validate Telegram Mini App initData.

    Returns parsed data if valid, None if invalid.
    See: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
    """
    if not init_data or not settings.BOT_TOKEN:
        return None

    try:
        # Parse the init data
        parsed = dict(parse_qsl(init_data, keep_blank_values=True))

        # Extract hash
        received_hash = parsed.pop("hash", None)
        if not received_hash:
            return None

        # Build data check string (sorted alphabetically)
        data_check_string = "\n".join(
            f"{k}={v}" for k, v in sorted(parsed.items())
        )

        # Calculate secret key
        secret_key = hmac.new(
            b"WebAppData", settings.BOT_TOKEN.encode(), hashlib.sha256
        ).digest()

        # Calculate hash
        calculated_hash = hmac.new(
            secret_key, data_check_string.encode(), hashlib.sha256
        ).hexdigest()

        # Validate
        if not hmac.compare_digest(calculated_hash, received_hash):
            return None

        # Check auth_date (optional: reject if too old)
        auth_date = int(parsed.get("auth_date", 0))
        if auth_date > 0:
            age = datetime.now(UTC).timestamp() - auth_date
            if age > 86400:  # 24 hours
                return None

        # Parse user data
        if "user" in parsed:
            parsed["user"] = json.loads(unquote(parsed["user"]))

        return parsed

    except Exception:
        return None


def create_access_token(data: dict[str, Any], expires_minutes: int | None = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(UTC) + timedelta(
        minutes=expires_minutes or settings.JWT_EXPIRATION_MINUTES
    )
    to_encode.update({"exp": expire, "iat": datetime.now(UTC)})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def verify_token(token: str) -> dict[str, Any] | None:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None
