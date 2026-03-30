You are implementing task "Project Setup — Backend Foundation" for the YeWaledoch (የወላጆች) Ethiopian Parenting Community platform.

## PROJECT CONTEXT

This is a Telegram Mini App for Ethiopian parents. Content-first community: scraped Reddit content translated to Amharic, with admin backoffice for review.

```
yewaledoch/
├── backend/          # Python FastAPI API
│   ├── app/
│   │   ├── main.py
│   │   ├── api/v1/   # Route handlers
│   │   ├── models/   # SQLAlchemy ORM models
│   │   ├── core/     # Config, DB, security, rate limiting
│   │   └── services/ # Business logic
│   ├── scraper/      # Reddit scraper + AI translator
│   └── alembic/      # Migrations
├── frontend/         # React Telegram Mini App (parents)
│   └── src/
│       ├── pages/    # Page components
│       ├── components/
│       ├── hooks/    # useAuth, usePosts
│       └── lib/      # api.ts, telegram.tsx, i18n.ts
├── admin/            # React admin backoffice (separate SPA)
├── docker-compose.yml
└── scripts/
```

**Tech Stack:**
- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0 (async), asyncpg, PostgreSQL 16, Redis 7, Alembic
- **Frontend**: React 18, TypeScript, Vite 5, Tailwind CSS 3, Zustand, TanStack React Query 5, @telegram-apps/sdk-react
- **Admin**: React 18, TypeScript, Vite 5, Tailwind CSS 3 (separate SPA, no Telegram SDK)
- **Auth**: Telegram initData (HMAC-SHA256) → JWT (HS256, 7-day expiry)
- **Scraper**: Reddit JSON API + Claude API for translation

**Key Conventions:**
- API prefix: `/api/v1`
- Database: UUID primary keys, async SQLAlchemy 2.0, `Mapped` type hints
- Auth: Telegram initData → HMAC-SHA256 validation → JWT token
- Dependencies: `CurrentUser = Annotated[User, Depends(get_current_user)]`
- Frontend: Zustand for auth, React Query for data, Tailwind CSS with Telegram theme vars
- i18n: Amharic-first (am), English fallback (en)
- User roles: reader → member → contributor → expert → admin
- Post types: curated (admin), question/tip/story/discussion (contributors)
- No downvotes — supportive community culture

**IMPORTANT — Fork from Gebeya where possible:**
- Reference project at `/home/redman/gebeya` — same tech stack, same Telegram Mini App pattern
- Copy and adapt: auth flow, Telegram SDK integration, API client, Tailwind config, Docker setup
- Match Gebeya's code style: imports, type hints, error handling, component patterns
- Read Gebeya files before writing new code to ensure consistency

## SUBTASK PROGRESS

These subtasks have already been tracked:
  - backend-requirements: pending
  - core-config: pending
  - core-database: pending
  - core-security: pending
  - core-rate-limit: pending
  - fastapi-main: pending
  - alembic-setup: pending
  - docker-compose: pending
  - env-files: pending
  - dockerfile: pending
  - init-files: pending



## TASK SPECIFICATION

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

## ERROR HANDLING POLICY (CRITICAL — NO WORKAROUNDS)

- NEVER use workarounds, hacks, or shortcuts to bypass errors
- NEVER use `// @ts-ignore`, `any` type, `--no-verify`, or `--force` to make things pass
- NEVER skip a failing step — fix the root cause
- If a build fails, read the FULL error, understand WHY, and fix the source
- Take your time. Research the issue. Read relevant source files. Fix it properly.

## INSTRUCTIONS

1. Read the task specification carefully. Read ALL referenced files before making changes.
2. Read existing project files to understand what's already built.
3. For backend: follow Gebeya patterns (read the reference files listed in the task).
4. For frontend: follow Gebeya's React/TypeScript patterns.
5. For backend changes: ensure `cd backend && python -c "from app.main import app"` succeeds.
6. For frontend changes: ensure `cd frontend && npm run build` succeeds.
7. For admin changes: ensure `cd admin && npm run build` succeeds.
8. For Alembic changes: create and apply migrations.
9. After ALL work is done, update the progress file at `docs/tasks/progress.json`:
   - Set `tasks.01-project-setup.status` to `"completed"`
   - Set each subtask to `"completed"` as you finish them
   - Set `tasks.01-project-setup.completed_at` to current ISO timestamp
   - Add any important notes to `tasks.01-project-setup.notes`
10. Finally, create a git commit with message: `feat: implement 01-project-setup — Project Setup — Backend Foundation`

DO NOT skip any part of the task. Implement everything listed in the spec.
If you encounter a blocker, update progress.json notes field with the issue and set status to "failed".
