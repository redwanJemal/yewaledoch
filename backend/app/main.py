"""FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, update
from starlette.middleware.base import BaseHTTPMiddleware
import structlog

from app.api.v1.router import router as v1_router
from app.core.config import settings
from app.core.database import get_db_context
from app.core.rate_limit import rate_limiter, check_rate_limit, RATE_LIMITS
from app.models.user import User

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger()


bot_logger = logging.getLogger("bot.webhook")


async def _setup_telegram_bot() -> None:
    """Register webhook, commands, menu button, name, and description with Telegram."""
    base = f"https://api.telegram.org/bot{settings.BOT_TOKEN}"
    webhook_url = f"{settings.MINI_APP_URL}/api/v1/bot/webhook"

    calls = [
        # Webhook
        (
            "setWebhook",
            {"url": webhook_url, "allowed_updates": ["message"]},
        ),
        # Bot commands shown in the menu
        (
            "setMyCommands",
            {
                "commands": [
                    {"command": "start", "description": "Open YeWaledoch"},
                    {"command": "help", "description": "Help & info"},
                ]
            },
        ),
        # Mini App button in the chat menu bar
        (
            "setChatMenuButton",
            {
                "menu_button": {
                    "type": "web_app",
                    "text": settings.BOT_NAME,
                    "web_app": {"url": settings.MINI_APP_URL},
                }
            },
        ),
        # Bot display name
        ("setMyName", {"name": settings.BOT_NAME}),
        # Full description (shown on bot profile page)
        ("setMyDescription", {"description": settings.BOT_DESCRIPTION}),
        # Short description (shown before /start)
        ("setMyShortDescription", {"short_description": settings.BOT_SHORT_DESCRIPTION}),
    ]

    async with httpx.AsyncClient(timeout=10.0) as client:
        for method, payload in calls:
            try:
                resp = await client.post(f"{base}/{method}", json=payload)
                data = resp.json()
                if data.get("ok"):
                    bot_logger.info("Bot setup OK: %s", method)
                else:
                    bot_logger.warning("Bot setup failed: %s → %s", method, data.get("description"))
            except Exception as exc:
                bot_logger.warning("Bot setup error: %s → %s", method, exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    logger.info("application_starting", app_name=settings.APP_NAME)
    await rate_limiter.connect()

    # Configure Telegram bot on startup
    if settings.BOT_TOKEN and settings.MINI_APP_URL:
        await _setup_telegram_bot()

    yield
    await rate_limiter.close()
    logger.info("application_stopping")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Add rate limit headers if available
        if hasattr(request.state, "rate_limit_remaining"):
            response.headers["X-RateLimit-Remaining"] = str(request.state.rate_limit_remaining)
            response.headers["X-RateLimit-Reset"] = str(request.state.rate_limit_reset)

        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware."""

    async def dispatch(self, request: Request, call_next):
        # Determine rate limit based on path
        path = request.url.path

        if "/auth/" in path:
            config = RATE_LIMITS["auth"]
        elif "/posts" in path:
            config = RATE_LIMITS["posts"]
        elif "/comments" in path:
            config = RATE_LIMITS["comments"]
        elif "/admin" in path:
            config = RATE_LIMITS["admin"]
        else:
            config = RATE_LIMITS["default"]

        # Skip rate limiting for health checks
        if path in ["/health", "/docs", "/redoc", "/openapi.json"]:
            return await call_next(request)

        await check_rate_limit(
            request,
            max_requests=config["max_requests"],
            window_seconds=config["window_seconds"],
        )

        return await call_next(request)


app = FastAPI(
    title=settings.APP_NAME,
    description="የወላጆች - Ethiopian Parenting Community API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# Rate limiting middleware
app.add_middleware(RateLimitMiddleware)

# CORS middleware
origins = settings.CORS_ORIGINS.split(",") if settings.CORS_ORIGINS != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "app": settings.APP_NAME}


# API routes
app.include_router(v1_router, prefix="/api/v1")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8010, reload=settings.DEBUG)
