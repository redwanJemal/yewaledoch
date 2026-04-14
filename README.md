# YeWaledoch (የወላጆች)

Ethiopian Parenting Community — a Telegram Mini App for Ethiopian parents.

Content-first approach: scrape Reddit's best parenting content, translate to Amharic, publish via the built-in admin panel. Parents read, comment, and engage. User-generated content unlocks after audience is built.

---

## Tech Stack

| Layer | Stack |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 (async), asyncpg, PostgreSQL 16, Redis 7, Alembic |
| Frontend (Mini App) | React 18, TypeScript, Vite 5, Tailwind CSS 3, Zustand, TanStack React Query 5, @telegram-apps/sdk-react |
| Scraper | Python, Reddit JSON API, Claude / Google Translate |
| Auth | Telegram initData (HMAC-SHA256) → JWT (HS256, 7-day expiry) |
| Deployment | Docker Compose, Coolify, GitLab CI/CD |
| Storage | MinIO (storage.endlessmaker.com) |

---

## Architecture

```
yewaledoch/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, middleware, lifespan
│   │   ├── api/v1/
│   │   │   ├── auth.py          # Telegram auth → JWT
│   │   │   ├── users.py         # Profile management
│   │   │   ├── posts.py         # Feed, CRUD, likes, saves
│   │   │   ├── comments.py      # Comment CRUD, likes
│   │   │   ├── children.py      # Child profiles, vaccinations, milestones
│   │   │   ├── resources.py     # Static resources (vaccines, recipes)
│   │   │   ├── notifications.py # User notifications
│   │   │   └── admin.py         # Full admin API
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── core/                # Config, database, security, rate limiting
│   │   └── services/            # Notification service, MinIO storage
│   ├── scraper/                 # Reddit scraper + AI translator + scheduler
│   ├── alembic/                 # Database migrations
│   ├── seed_data/               # Categories, vaccines, milestones JSON
│   └── Dockerfile
├── frontend/                    # Telegram Mini App (parents + admin panel)
│   ├── src/
│   │   ├── App.tsx              # Tab navigation, routing, deep links
│   │   ├── pages/               # All pages including role-gated admin pages
│   │   ├── components/          # Shared components
│   │   ├── hooks/               # useAuth, usePosts, useNotifications
│   │   └── lib/
│   │       ├── api.ts           # API client + types
│   │       ├── telegram.tsx     # Telegram SDK context + hooks
│   │       └── i18n.ts          # Amharic/English translations
│   └── Dockerfile
├── docker-compose.yml           # Dev: backend + postgres + redis
├── docker-compose.coolify.yml   # Production (Coolify)
├── docker-compose.prod.yml      # Production (generic)
└── .gitlab-ci.yml               # CI/CD: build + push backend & frontend images
```

> **Note:** There is no separate admin SPA. The admin backoffice is fully embedded inside the Mini App and is role-gated to `admin` users.

---

## User Roles

| Role | Permissions |
|---|---|
| `reader` | Read + like posts |
| `member` | + Comment |
| `contributor` | + Create posts (unlocked after 5 comments) |
| `expert` | + Expert-answer posts, verified badge (granted by admin) |
| `admin` | Full backoffice access inside the Mini App |

---

## Content Pipeline

```
Reddit (r/Parenting) → Scraper → AI Translation → Draft Queue → Admin Review → Published
```

## Post Types

`curated` · `question` · `tip` · `story` · `discussion` · `expert_answer`

## Categories

`pregnancy` · `newborn` · `toddler` · `school_age` · `teens` · `health` · `nutrition` · `dads` · `mental_health` · `special_needs` · `education` · `fun_activities`

---

## Development

```bash
# Start postgres + redis
docker compose up -d

# Backend (port 8010)
cd backend && uvicorn app.main:app --reload --port 8010

# Frontend Mini App (port 5173, proxies /api → 8010)
cd frontend && npm run dev

# Database migrations
cd backend && alembic upgrade head
cd backend && alembic revision --autogenerate -m "description"

# Run scraper manually
cd backend && python -m scraper.reddit_scraper
```

## Environment Variables

```env
APP_NAME=YeWaledoch
SECRET_KEY=
DATABASE_URL=postgresql+asyncpg://...
REDIS_URL=redis://localhost:6379/0
BOT_TOKEN=
BOT_USERNAME=
ADMIN_TELEGRAM_IDS=   # comma-separated Telegram IDs
MINI_APP_URL=
ANTHROPIC_API_KEY=    # for AI translation
MINIO_ENDPOINT=
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_BUCKET=yewaledoch
VITE_API_URL=
VITE_BOT_USERNAME=
```

## Production Deploy

CI/CD (GitLab) builds and pushes Docker images to the registry on every push to `master`.

Manual deploy on the VPS:

```bash
cd /home/redman/yewaledoch
docker compose -f docker-compose.coolify.yml build --no-cache yewaledoch-api yewaledoch-web
docker compose -f docker-compose.coolify.yml up -d yewaledoch-api yewaledoch-web
```
