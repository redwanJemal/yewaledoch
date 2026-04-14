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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    logger.info("application_starting", app_name=settings.APP_NAME)
    await rate_limiter.connect()

    # Register Telegram bot webhook
    if settings.BOT_TOKEN and settings.MINI_APP_URL:
        webhook_url = f"{settings.MINI_APP_URL}/api/v1/bot/webhook"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"https://api.telegram.org/bot{settings.BOT_TOKEN}/setWebhook",
                    json={"url": webhook_url, "allowed_updates": ["message"]},
                )
                bot_logger.info("Webhook set: %s", resp.json())
        except Exception as e:
            bot_logger.warning("Failed to set webhook: %s", e)

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
