You are implementing task "Deployment — Docker, CI/CD, Bot Setup, Seed Data" for the YeWaledoch (የወላጆች) Ethiopian Parenting Community platform.

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
  - docker-compose-prod: pending
  - gitlab-cicd: pending
  - telegram-bot-guide: pending
  - seed-posts: pending
  - seed-script: pending
  - nginx-configs: pending
  - env-production: pending
  - integration-test: pending



## TASK SPECIFICATION

# Task 14: Deployment — Docker, CI/CD, Telegram Bot, Seed Data

## Summary
Set up production deployment: Docker Compose prod config, GitLab CI/CD pipeline, Telegram bot via BotFather, seed initial content, and do a final integration test.

## Reference Files
- `/home/redman/gebeya/docker-compose.prod.yml` — Production Docker setup
- `/home/redman/gebeya/.gitlab-ci.yml` — CI/CD pipeline

## Required Changes

### 14.1 Production Docker Compose
**File:** `docker-compose.prod.yml`
- Backend: pull from GitLab registry, internal network only
- Frontend: pull from registry, nginx serving built React app
- Admin: pull from registry, nginx serving built React app
- PostgreSQL 16: persistent volume, internal only
- Redis 7: internal only
- Coolify external network for reverse proxy
- Environment variable templating
- Health checks on all services

### 14.2 GitLab CI/CD
**File:** `.gitlab-ci.yml`
- **Build stage** (on main push):
  - Build backend Docker image → push to GitLab registry
  - Build frontend Docker image → push to registry
  - Build admin Docker image → push to registry
- **Deploy stage** (manual trigger):
  - SSH into production server
  - Pull latest images
  - Run migrations
  - Restart services via docker compose
- Required CI/CD variables: SSH_*, PROJECT_DIR, VITE_API_URL, VITE_BOT_USERNAME

### 14.3 Telegram Bot Setup Guide
**File:** `docs/telegram-bot-setup.md`
Document the steps:
1. Message @BotFather → /newbot → set name "YeWaledoch" / username
2. Get BOT_TOKEN
3. Set bot commands: /start, /help, /language
4. Enable Mini App: /newapp → set web app URL
5. Set bot description (Amharic)
6. Set bot about text

### 14.4 Seed Initial Content
**File:** `backend/seed_data/initial_posts.json`
Create 10-15 seed posts (pre-translated, ready to publish):
- 3 posts about sleep/bedtime (from Reddit research)
- 2 posts about screen time
- 2 posts about discipline/parenting style
- 2 posts about nutrition/Ethiopian baby food
- 2 posts about dad experiences
- 2 posts about mental health/burnout
- 1 welcome post explaining the community

Each post: title (Amharic), body (Amharic), category, post_type="curated", discussion prompt

**File:** `backend/scripts/seed.py`
- Script to load seed data into database:
  - Create categories
  - Create initial posts
  - Set posts to published status

### 14.5 Production Nginx Configs
**File:** `frontend/nginx.conf` — SPA routing, gzip, cache headers
**File:** `admin/nginx.conf` — same pattern

### 14.6 Environment Files
**File:** `.env.production.example`
- All production environment variables with placeholder values
- Documentation for each variable

### 14.7 Final Integration Checks
- [ ] Docker compose prod builds all 3 images
- [ ] Backend starts and connects to DB
- [ ] Frontend loads in browser
- [ ] Admin panel loads in browser
- [ ] Telegram auth flow works end-to-end
- [ ] Scraper fetches and stores drafts
- [ ] Admin can review and publish drafts
- [ ] Published posts appear in mini app feed
- [ ] Comments and likes work
- [ ] Notifications delivered via Telegram bot
- [ ] Seed data loads correctly

## Acceptance Criteria
- [ ] `docker compose -f docker-compose.prod.yml up` runs all services
- [ ] GitLab CI/CD pipeline configured
- [ ] Bot setup documented step-by-step
- [ ] 10-15 seed posts ready in Amharic
- [ ] Seed script populates database
- [ ] Nginx configs handle SPA routing
- [ ] Full end-to-end flow works: scrape → translate → admin review → publish → user reads → comments

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
   - Set `tasks.14-deployment.status` to `"completed"`
   - Set each subtask to `"completed"` as you finish them
   - Set `tasks.14-deployment.completed_at` to current ISO timestamp
   - Add any important notes to `tasks.14-deployment.notes`
10. Finally, create a git commit with message: `feat: implement 14-deployment — Deployment — Docker, CI/CD, Bot Setup, Seed Data`

DO NOT skip any part of the task. Implement everything listed in the spec.
If you encounter a blocker, update progress.json notes field with the issue and set status to "failed".
