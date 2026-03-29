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
