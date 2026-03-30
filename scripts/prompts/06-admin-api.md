You are implementing task "Admin API — Dashboard, Drafts, Management" for the YeWaledoch (የወላጆች) Ethiopian Parenting Community platform.

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
  - dashboard-endpoint: pending
  - draft-queue-endpoints: pending
  - publish-draft: pending
  - content-management: pending
  - user-management: pending
  - reports-resolution: pending
  - scraper-trigger: pending
  - broadcast-endpoint: pending



## TASK SPECIFICATION

# Task 06: Admin API — Dashboard, Drafts, Content Management, Users

## Summary
Implement the admin backoffice API: dashboard stats, scraped draft queue management, content moderation, user management, and report resolution.

## Reference Files
- `/home/redman/parenting/YEWALEDOCH_PROJECT_SPEC.md` — Section 5: Admin endpoints

## Required Changes

### 6.1 Admin API
**File:** `backend/app/api/v1/admin.py`

All endpoints require `AdminUser` dependency.

**Dashboard:**
- `GET /admin/dashboard` — stats overview
  - Response: total_users, total_posts, total_comments, new_users_today, posts_today, comments_today, active_users_24h, pending_drafts, pending_reports

**Draft Queue:**
- `GET /admin/drafts` — list scraped drafts (filter by status, paginated)
- `PATCH /admin/drafts/{id}` — edit draft (translated_title, translated_body, category)
- `POST /admin/drafts/{id}/publish` — publish draft:
  - Create a new Post from the draft data (type="curated")
  - Set draft.status = "published"
  - Set draft.published_post_id = new post ID
  - Set draft.reviewed_by = current admin
- `DELETE /admin/drafts/{id}` — discard draft (set status="discarded")

**Content Management:**
- `GET /admin/posts` — all posts (including drafts, removed) with search/filter
- `PATCH /admin/posts/{id}` — admin edit any post (pin, feature, change status)
- `DELETE /admin/posts/{id}` — hard delete post

**User Management:**
- `GET /admin/users` — user list with search, filter by role
- `PATCH /admin/users/{id}/role` — change user role
- `POST /admin/users/{id}/ban` — ban user (set is_banned=True, ban_reason)
- `POST /admin/users/{id}/unban` — unban user

**Reports:**
- `GET /admin/reports` — pending reports
- `POST /admin/reports/{id}/action` — resolve report
  - Actions: "remove" (remove content + warn user), "dismiss" (dismiss report), "ban" (ban user + remove content)
  - Set report.status, resolved_by, resolved_at

**Scraper Control:**
- `POST /admin/scraper/run` — trigger scraper manually (runs in background)

**Broadcast:**
- `POST /admin/broadcast` — send Telegram notification to all users
  - Body: `{ title: str, body: str }`
  - Uses Telegram bot to send messages

### 6.2 Register Routes
Update `router.py`:
- Include admin_router at `/admin`

## Acceptance Criteria
- [ ] All admin endpoints return 403 for non-admin users
- [ ] Dashboard returns accurate real-time stats
- [ ] Draft queue: list, edit, publish, discard all work
- [ ] Publishing a draft creates a proper post record
- [ ] User role changes persist
- [ ] Ban/unban toggles user access
- [ ] Report resolution works with all three action types
- [ ] Scraper trigger runs in background

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
   - Set `tasks.06-admin-api.status` to `"completed"`
   - Set each subtask to `"completed"` as you finish them
   - Set `tasks.06-admin-api.completed_at` to current ISO timestamp
   - Add any important notes to `tasks.06-admin-api.notes`
10. Finally, create a git commit with message: `feat: implement 06-admin-api — Admin API — Dashboard, Drafts, Management`

DO NOT skip any part of the task. Implement everything listed in the spec.
If you encounter a blocker, update progress.json notes field with the issue and set status to "failed".
