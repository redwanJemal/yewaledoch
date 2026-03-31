# YeWaledoch Deployment Guide

## Architecture

```
Internet → Traefik (Coolify) → yewaledoch-web (nginx:80)
                                  ├── /        → SPA (React)
                                  └── /api/    → proxy to yewaledoch-api:8000
                                yewaledoch-api (FastAPI/uvicorn:8000)
                                  ├── PostgreSQL (yewaledoch-db:5432)
                                  └── Redis (yewaledoch-redis:6379)
```

## Prerequisites

- Docker & Docker Compose
- Coolify (with `coolify` Docker network)
- Domain pointed to VPS (e.g. `fit.endlessmaker.com`)
- MinIO/S3 storage (e.g. `storage.endlessmaker.com`)
- Telegram Bot token from @BotFather

## Deployment (Manual on VPS)

### First time setup

```bash
cd /home/redman/yewaledoch

# Create the coolify external network if it doesn't exist
docker network create coolify 2>/dev/null || true

# Build all images
docker compose -f docker-compose.coolify.yml build

# Start all services
docker compose -f docker-compose.coolify.yml up -d

# Run database migrations
docker exec yewaledoch-api alembic upgrade head

# Seed initial data (categories, vaccines, milestones)
docker exec yewaledoch-api python -m scripts.seed
```

### Update deployment

```bash
cd /home/redman/yewaledoch

# Pull latest code
git pull origin master

# Rebuild changed services
docker compose -f docker-compose.coolify.yml build --no-cache yewaledoch-api yewaledoch-web

# Restart (migrations run automatically on startup)
docker compose -f docker-compose.coolify.yml up -d yewaledoch-api yewaledoch-web
```

### Rebuild everything (nuclear option)

```bash
docker compose -f docker-compose.coolify.yml build --no-cache
docker compose -f docker-compose.coolify.yml up -d
```

## Services

| Service | Container | Port | Notes |
|---------|-----------|------|-------|
| Frontend | yewaledoch-web | 80 | nginx SPA + API proxy |
| Backend | yewaledoch-api | 8000 | FastAPI + Alembic migrations on start |
| PostgreSQL | yewaledoch-db | 5432 | Persistent volume: `pgdata` |
| Redis | yewaledoch-redis | 6379 | Rate limiting, caching |

## Configuration

All config is in `docker-compose.coolify.yml` environment variables:

| Variable | Description |
|----------|-------------|
| `BOT_TOKEN` | Telegram Bot API token |
| `BOT_USERNAME` | Bot username (without @) |
| `MINI_APP_URL` | Public URL (e.g. `https://fit.endlessmaker.com`) |
| `SECRET_KEY` | App secret key |
| `JWT_SECRET` | JWT signing secret |
| `ADMIN_TELEGRAM_IDS` | Comma-separated Telegram user IDs for admin access |
| `MINIO_ENDPOINT` | MinIO/S3 endpoint URL |
| `MINIO_ACCESS_KEY` | MinIO access key |
| `MINIO_SECRET_KEY` | MinIO secret key |
| `MINIO_BUCKET` | Bucket name (default: `yewaledoch`) |
| `ANTHROPIC_API_KEY` | For AI translation (optional) |

## Networking

- `internal` network: backend ↔ db ↔ redis (isolated)
- `coolify` network: frontend + backend exposed to Traefik reverse proxy
- Traefik handles TLS/HTTPS termination

## Monitoring

```bash
# View logs
docker logs yewaledoch-api --tail 50 -f
docker logs yewaledoch-web --tail 50 -f

# Check health
docker compose -f docker-compose.coolify.yml ps
curl https://fit.endlessmaker.com/api/v1/resources/categories

# Database shell
docker exec -it yewaledoch-db psql -U yewaledoch

# Redis CLI
docker exec -it yewaledoch-redis redis-cli
```

## CI/CD (GitLab)

`.gitlab-ci.yml` builds Docker images on push to `master` and pushes to GitLab Container Registry. Deploy is manual — pull and restart on VPS.

Required GitLab CI/CD variables:
- `VITE_API_URL` — API URL baked into frontend build
- `VITE_BOT_USERNAME` — Bot username baked into frontend build

## Troubleshooting

**Images return 403 AccessDenied**: The MinIO bucket policy needs public read. It auto-sets on next upload, or run:
```bash
docker exec yewaledoch-api python3 -c "from app.services.storage import _get_client, _ensure_bucket; c = _get_client(); _ensure_bucket(c)"
```

**Bot webhook not receiving updates**: Check webhook is set:
```bash
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

**Database migrations**: Alembic runs automatically on container start. To run manually:
```bash
docker exec yewaledoch-api alembic upgrade head
```
