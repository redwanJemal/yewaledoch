# Task 01: Project Setup — Backend Foundation

## Summary
Set up the backend foundation by forking patterns from Gebeya (`/home/redman/gebeya`). Create the FastAPI app, database connection, Telegram auth, JWT security, and Docker Compose for development.

## Reference Files (READ THESE FIRST)
- `/home/redman/gebeya/backend/app/main.py` — FastAPI app structure, middleware, lifespan
- `/home/redman/gebeya/backend/app/core/config.py` — Pydantic settings pattern
- `/home/redman/gebeya/backend/app/core/database.py` — Async SQLAlchemy setup
- `/home/redman/gebeya/backend/app/core/security.py` — Telegram HMAC validation + JWT
- `/home/redman/gebeya/backend/app/core/rate_limit.py` — Redis rate limiting
- `/home/redman/gebeya/backend/requirements.txt` — Python dependencies
- `/home/redman/gebeya/docker-compose.yml` — Docker dev setup
- `/home/redman/gebeya/.env.example` — Environment template

## Required Changes

### 1.1 Backend Dependencies
Create `backend/requirements.txt` with same deps as Gebeya:
- fastapi, uvicorn[standard], sqlalchemy[asyncio], asyncpg, alembic
- redis, python-jose[cryptography], passlib[bcrypt]
- pydantic, pydantic-settings, python-dotenv
- structlog, httpx, boto3

### 1.2 Core Configuration
**File:** `backend/app/core/config.py`
- Fork from Gebeya's config.py
- Add new settings: `ANTHROPIC_API_KEY`, `MINIO_*`, `ADMIN_TELEGRAM_IDS` (parse comma-separated)
- Keep: DATABASE_URL, REDIS_URL, BOT_TOKEN, BOT_USERNAME, SECRET_KEY, JWT settings

### 1.3 Database Setup
**File:** `backend/app/core/database.py`
- Copy from Gebeya — async engine, session factory, get_db dependency, Base class

### 1.4 Security (Telegram Auth + JWT)
**File:** `backend/app/core/security.py`
- Copy from Gebeya — `validate_telegram_init_data()`, JWT create/verify
- Same HMAC-SHA256 validation, same JWT HS256

### 1.5 Rate Limiting
**File:** `backend/app/core/rate_limit.py`
- Copy from Gebeya — Redis sliding window middleware
- Adjust rate limits: auth=10/min, posts=30/min, comments=60/min, admin=100/min

### 1.6 FastAPI Main App
**File:** `backend/app/main.py`
- Fork from Gebeya's main.py
- Same middleware stack: SecurityHeaders, RateLimit, CORS
- Health check endpoint
- Register v1 router (create empty router.py initially)
- Lifespan for startup/shutdown

### 1.7 Alembic Setup
- `backend/alembic.ini` — copy from Gebeya, update DB name
- `backend/alembic/env.py` — copy from Gebeya, import from app.models

### 1.8 Docker Compose (Dev)
**File:** `docker-compose.yml`
- PostgreSQL 16 (port 5436, db: yewaledoch)
- Redis 7 (port 6383)
- Backend service (port 8012, maps to 8000)
- Health checks, volumes, Coolify network

### 1.9 Environment
**File:** `.env.example`
- All required environment variables with defaults
- Copy `.env.example` to `.env` with dev values

### 1.10 Backend Dockerfile
**File:** `backend/Dockerfile`
- Python 3.12-slim, pip install, uvicorn CMD

### 1.11 Init Files
- `backend/app/__init__.py`
- `backend/app/api/__init__.py`
- `backend/app/api/v1/__init__.py`
- `backend/app/api/v1/router.py` — empty router with health check
- `backend/app/core/__init__.py`
- `backend/app/models/__init__.py`
- `backend/app/services/__init__.py`

## Acceptance Criteria
- [ ] `docker compose up -d` starts postgres + redis successfully
- [ ] `cd backend && uvicorn app.main:app --reload --port 8012` starts without errors
- [ ] `GET /health` returns 200
- [ ] `GET /docs` shows Swagger UI
- [ ] Alembic is configured and `alembic upgrade head` runs (even with no migrations)
- [ ] `.env.example` has all required variables documented
