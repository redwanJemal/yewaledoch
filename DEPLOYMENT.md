# YeWaledoch Deployment Guide

## Architecture

```
Internet → Traefik (Coolify) → yewaledoch-web (nginx:80)
                                  ├── /        → SPA (React Mini App)
                                  └── /api/    → proxy to yewaledoch-api:8010
                                yewaledoch-api (FastAPI/uvicorn:8010)
                                  ├── PostgreSQL (yewaledoch-db:5432)
                                  └── Redis (yewaledoch-redis:6379)
```

## Prerequisites

- Docker & Docker Compose
- Coolify running on VPS (with `coolify` external Docker network)
- Domain pointed to VPS (e.g. `fit.endlessmaker.com`)
- MinIO/S3 instance for image storage
- Telegram Bot token from @BotFather

---

## First-Time Setup

### 1. Configure environment

```bash
cd /home/redman/yewaledoch
cp .env.production.example .env
# Edit .env — fill in all CHANGE_ME values
nano .env
```

Required values to fill in:
| Variable | Where to get it |
|---|---|
| `POSTGRES_PASSWORD` | Generate: `openssl rand -hex 32` |
| `SECRET_KEY` | Generate: `openssl rand -hex 32` |
| `JWT_SECRET` | Generate: `openssl rand -hex 32` |
| `BOT_TOKEN` | @BotFather → `/newbot` |
| `BOT_USERNAME` | @BotFather (without @) |
| `BOT_NAME` | Display name shown in chat |
| `BOT_DESCRIPTION` | Shown on bot profile page |
| `BOT_SHORT_DESCRIPTION` | Shown before /start |
| `MINI_APP_URL` | Your public domain (e.g. `https://fit.endlessmaker.com`) |
| `ADMIN_TELEGRAM_IDS` | Your Telegram user ID (get from @userinfobot) |
| `MINIO_*` | Your MinIO instance credentials |
| `ANTHROPIC_API_KEY` | Anthropic console (optional, for AI translation) |
| `VITE_API_URL` | `https://your-domain.com/api/v1` |

### 2. Create external network

```bash
docker network create coolify 2>/dev/null || true
```

### 3. Build and start

```bash
docker compose -f docker-compose.coolify.yml build
docker compose -f docker-compose.coolify.yml up -d
```

### What happens automatically on first start:
- Alembic runs all database migrations
- Seed script loads initial posts and system user (idempotent — safe to re-run)
- API registers the Telegram bot webhook, commands, menu button, name, and description

---

## Update Deployment

```bash
cd /home/redman/yewaledoch
git pull origin master
docker compose -f docker-compose.coolify.yml build --no-cache yewaledoch-api yewaledoch-web
docker compose -f docker-compose.coolify.yml up -d yewaledoch-api yewaledoch-web --remove-orphans
```

---

## Services

| Service | Container | Port | Notes |
|---|---|---|---|
| Frontend (Mini App) | `yewaledoch-web` | 80 | nginx — serves React SPA + proxies `/api` |
| Backend | `yewaledoch-api` | 8010 | FastAPI — runs migrations + seed on start |
| PostgreSQL | `yewaledoch-db` | 5432 | Persistent volume: `pgdata` |
| Redis | `yewaledoch-redis` | 6379 | Rate limiting |

---

## Bot Auto-Configuration

On every API startup the following are sent to the Telegram Bot API (all non-fatal — failures are logged as warnings):

| Call | Effect |
|---|---|
| `setWebhook` | Points Telegram to `/api/v1/bot/webhook` |
| `setMyCommands` | `/start` and `/help` commands in the menu |
| `setChatMenuButton` | Mini App button in every chat with the bot |
| `setMyName` | Display name from `BOT_NAME` env |
| `setMyDescription` | Profile description from `BOT_DESCRIPTION` env |
| `setMyShortDescription` | Pre-start description from `BOT_SHORT_DESCRIPTION` env |

To verify webhook is active:
```bash
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

---

## Networking

- `internal` network: api ↔ db ↔ redis (isolated, not exposed)
- `coolify` network: web + api exposed to Traefik reverse proxy

Traefik handles TLS/HTTPS termination automatically via Coolify.

---

## Monitoring

```bash
# Live logs
docker logs yewaledoch-api --tail 50 -f
docker logs yewaledoch-web --tail 50 -f

# Container health
docker compose -f docker-compose.coolify.yml ps

# Quick API health check
curl https://fit.endlessmaker.com/health

# Database shell
docker exec -it yewaledoch-db psql -U yewaledoch

# Redis CLI
docker exec -it yewaledoch-redis redis-cli
```

---

## CI/CD (GitLab)

`.gitlab-ci.yml` builds and pushes Docker images to GitLab Container Registry on every push to `master`.

Required CI/CD variables (set in GitLab project settings):
| Variable | Value |
|---|---|
| `VITE_API_URL` | API URL baked into the frontend build |
| `VITE_BOT_USERNAME` | Bot username baked into the frontend build |

Deploy is manual — pull and restart on VPS after CI builds.

---

## Troubleshooting

**Images return 403 AccessDenied (MinIO)**
The bucket policy needs public read. It auto-sets on next upload, or force it:
```bash
docker exec yewaledoch-api python3 -c "
from app.services.storage import _get_client, _ensure_bucket
import asyncio; asyncio.run(_ensure_bucket(_get_client()))
"
```

**Bot webhook not receiving updates**
```bash
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
# If wrong URL, restart the API container — it re-registers on startup
docker restart yewaledoch-api
```

**Database migration issues**
```bash
docker exec yewaledoch-api alembic upgrade head
docker exec yewaledoch-api alembic current
```

**Re-run seed data manually**
```bash
docker exec yewaledoch-api python -m scripts.seed
```
