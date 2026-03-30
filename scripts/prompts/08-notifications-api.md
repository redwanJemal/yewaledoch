You are implementing task "Notifications, Children & Resources API" for the YeWaledoch (የወላጆች) Ethiopian Parenting Community platform.

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
  - notification-endpoints: pending
  - telegram-bot-service: pending
  - children-crud: pending
  - vaccination-api: pending
  - milestone-api: pending
  - resources-api: pending
  - seed-data-vaccines: pending
  - seed-data-milestones: pending



## TASK SPECIFICATION

# Task 08: Notifications API & Telegram Bot Service

## Summary
Implement the notification system: in-app notifications, Telegram bot message delivery, and the children/resources endpoints.

## Reference Files
- `/home/redman/gebeya/backend/app/services/notifications.py` — Telegram bot notification pattern

## Required Changes

### 8.1 Notification API
**File:** `backend/app/api/v1/notifications.py`

- `GET /notifications` — list user's notifications (paginated, newest first)
  - Filter: unread only option
  - Include notification type, title, body, data (post_id, comment_id etc.)
- `POST /notifications/read` — mark specific notifications as read
  - Body: `{ ids: [uuid, ...] }`
- `POST /notifications/read-all` — mark all as read

### 8.2 Telegram Bot Notification Service
**File:** `backend/app/services/notification_service.py`

- `send_telegram_notification(telegram_id, text, data)` — send message via Telegram Bot API
  - Use httpx async client
  - Include inline keyboard button to open Mini App (deep link)
  - Handle errors gracefully (don't crash if notification fails)
- `notify_comment_reply(post_author, commenter, post)` — when someone comments on your post
- `notify_like(post_author, liker, post)` — when someone likes your post (batch/throttle these)
- `notify_expert_answer(post_author, expert, post)` — when an expert answers
- `broadcast_to_all(title, body)` — admin broadcast to all users
  - Fetch all user telegram_ids, send in batches (Telegram rate limit: 30 msgs/sec)
- Deep link format: `https://t.me/{BOT_USERNAME}?startapp=p_{postId}`

### 8.3 Children & Tracking API
**File:** `backend/app/api/v1/children.py`

- `GET /children` — list user's children
- `POST /children` — add child (name, date_of_birth, gender)
- `PATCH /children/{id}` — update child
- `DELETE /children/{id}` — remove child
- `GET /children/{id}/vaccinations` — vaccination schedule (pre-populated with Ethiopian EPI)
- `POST /children/{id}/vaccinations` — log vaccination (mark as completed)
- `GET /children/{id}/milestones` — milestone list
- `POST /children/{id}/milestones` — log milestone

### 8.4 Resources API
**File:** `backend/app/api/v1/resources.py`

- `GET /resources/vaccines` — Ethiopian EPI vaccination schedule reference
- `GET /resources/milestones` — milestone reference list by age
- `GET /resources/categories` — content categories list
- Serve from seed_data JSON files

### 8.5 Seed Data
**File:** `backend/seed_data/ethiopian_vaccines.json`
Ethiopian EPI schedule:
- At birth: BCG, OPV-0
- 6 weeks: Pentavalent-1, OPV-1, PCV-1, Rotavirus-1
- 10 weeks: Pentavalent-2, OPV-2, PCV-2, Rotavirus-2
- 14 weeks: Pentavalent-3, OPV-3, PCV-3, IPV
- 9 months: Measles-1, Vitamin A
- 15 months: Measles-2

**File:** `backend/seed_data/milestones.json`
Baby milestones by month (0-24 months): first smile, head control, rolls over, sits up, crawls, first word, first steps, etc.

### 8.6 Register Routes
Update `router.py`:
- Include notifications_router at `/notifications`
- Include children_router at `/children`
- Include resources_router at `/resources`

## Acceptance Criteria
- [ ] Notifications created when comments/likes happen
- [ ] Telegram bot sends messages with deep links
- [ ] Broadcast works (batched sending)
- [ ] Children CRUD works
- [ ] Vaccination schedule pre-populated per child based on DOB
- [ ] Resources endpoints return seed data
- [ ] Milestone logging works

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
   - Set `tasks.08-notifications-api.status` to `"completed"`
   - Set each subtask to `"completed"` as you finish them
   - Set `tasks.08-notifications-api.completed_at` to current ISO timestamp
   - Add any important notes to `tasks.08-notifications-api.notes`
10. Finally, create a git commit with message: `feat: implement 08-notifications-api — Notifications, Children & Resources API`

DO NOT skip any part of the task. Implement everything listed in the spec.
If you encounter a blocker, update progress.json notes field with the issue and set status to "failed".
