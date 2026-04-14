# YeWaledoch (የወላጆች) — Ethiopian Parenting Community

Telegram Mini App for Ethiopian parents. Content-first community: scrape Reddit's best parenting content, translate to Amharic, publish via admin backoffice. Parents read, comment, engage. User-generated content opens after audience is built.

## Tech Stack

- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0 (async), asyncpg, PostgreSQL 16, Redis 7, Alembic
- **Frontend (Mini App)**: React 18, TypeScript, Vite 5, Tailwind CSS 3, Zustand, TanStack React Query 5, @telegram-apps/sdk-react
- **Admin Backoffice**: Embedded inside the Mini App (role-gated to `admin` users, no separate SPA)
- **Scraper**: Python, Reddit JSON API, Claude/Google Translate API
- **Auth**: Telegram initData (HMAC-SHA256) → JWT (HS256, 7-day expiry)
- **Deployment**: Docker Compose, Coolify, GitLab CI/CD
- **Storage**: MinIO (storage.endlessmaker.com)

## Architecture

```
yewaledoch/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, middleware, lifespan
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── router.py    # Route aggregator
│   │   │   │   ├── auth.py      # Telegram auth → JWT
│   │   │   │   ├── users.py     # Profile management
│   │   │   │   ├── posts.py     # Content feed, CRUD, likes, saves
│   │   │   │   ├── comments.py  # Comment CRUD, likes
│   │   │   │   ├── children.py  # Child profiles, vaccinations, milestones
│   │   │   │   ├── resources.py # Static resources (vaccines, recipes)
│   │   │   │   ├── notifications.py # User notifications
│   │   │   │   └── admin.py     # Admin backoffice API
│   │   │   └── deps.py          # Auth dependencies (CurrentUser, AdminUser)
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── core/
│   │   │   ├── config.py        # Pydantic settings
│   │   │   ├── database.py      # Async SQLAlchemy engine
│   │   │   ├── security.py      # Telegram validation, JWT
│   │   │   └── rate_limit.py    # Redis rate limiting
│   │   └── services/
│   │       ├── notification_service.py  # Telegram bot notifications
│   │       └── storage.py               # MinIO integration
│   ├── scraper/
│   │   ├── reddit_scraper.py    # Fetch Reddit posts
│   │   ├── translator.py        # AI translation to Amharic
│   │   └── scheduler.py         # Cron scheduling
│   ├── alembic/                 # Database migrations
│   ├── seed_data/               # Categories, vaccines, milestones JSON
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                    # Telegram Mini App (parents + admin panel)
│   ├── src/
│   │   ├── App.tsx              # Tab navigation, routing, deep links
│   │   ├── pages/               # Page components (incl. Admin* role-gated pages)
│   │   ├── components/          # Shared components
│   │   ├── hooks/               # useAuth, usePosts, useNotifications
│   │   ├── lib/
│   │   │   ├── api.ts           # API client, types, Bearer auth
│   │   │   ├── telegram.tsx     # Telegram SDK context + hooks
│   │   │   └── i18n.ts          # Amharic/English translations
│   │   └── styles/
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml           # Dev: backend + postgres + redis
├── docker-compose.prod.yml      # Prod: with Coolify network
├── .gitlab-ci.yml               # CI/CD pipeline
└── scripts/
    └── task-runner.sh           # Claude task orchestration
```

## Key Patterns (follow Gebeya conventions)

- **API prefix**: `/api/v1`
- **Auth**: Telegram initData → HMAC-SHA256 validation → JWT token
- **Database**: UUID primary keys, async SQLAlchemy, timezone-aware datetimes, JSONB for flexible data
- **Models**: Modern SQLAlchemy 2.0 with `Mapped` type hints, `server_default=func.now()`
- **Dependencies**: `CurrentUser = Annotated[User, Depends(get_current_user)]`
- **Frontend state**: Zustand for auth, React Query for API data
- **Telegram SDK**: `@telegram-apps/sdk-react` with TelegramProvider context
- **Styling**: Tailwind CSS with Telegram theme CSS variables (tg-*)
- **Rate limiting**: Redis sliding window, different limits per endpoint type
- **Security headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection
- **Images**: MinIO at storage.endlessmaker.com (bucket: yewaledoch)

## User Roles

- `reader` — can read + like (any Telegram user)
- `member` — can comment (Telegram auth verified)
- `contributor` — can create posts (earned or admin-approved)
- `expert` — verified professional, gets badge
- `admin` — full backoffice access

## Content Pipeline

```
Reddit (r/Parenting) → Scraper → AI Translation → Draft Queue → Admin Review → Published
```

## Post Types

- `curated` — scraped + translated content (admin only)
- `question` — ask the community (contributor+)
- `tip` — share advice (contributor+)
- `story` — personal experience (contributor+)
- `discussion` — open topic (contributor+)
- `expert_answer` — professional advice (expert only)

## Categories

pregnancy, newborn, toddler, school_age, teens, health, nutrition, dads, mental_health, special_needs, education, fun_activities

## Environment Variables

```
APP_NAME, APP_ENV, SECRET_KEY, DEBUG
DATABASE_URL (postgresql+asyncpg://...)
REDIS_URL
BOT_TOKEN, BOT_USERNAME, ADMIN_TELEGRAM_IDS, MINI_APP_URL
ANTHROPIC_API_KEY (for translation)
MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET
VITE_API_URL, VITE_BOT_USERNAME
```

## Commands

```bash
# Development
docker compose up -d                    # Start postgres + redis
cd backend && uvicorn app.main:app --reload --port 8010
cd frontend && npm run dev              # Port 5173, proxies to 8010

# Migrations
cd backend && alembic upgrade head
cd backend && alembic revision --autogenerate -m "description"

# Scraper
cd backend && python -m scraper.reddit_scraper

# Task runner
./scripts/task-runner.sh --status       # Show progress
./scripts/task-runner.sh --task 01      # Run specific task
./scripts/task-runner.sh --all          # Run all pending tasks
```

## Reference Projects

- **Gebeya** (`/home/redman/gebeya`) — Fork source. Same stack, same Telegram Mini App pattern.
- **Spec**: `/home/redman/parenting/YEWALEDOCH_PROJECT_SPEC.md` — Full project specification with DB schema, API endpoints, UI wireframes.
