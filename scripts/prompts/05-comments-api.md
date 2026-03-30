You are implementing task "Comments API" for the YeWaledoch (የወላጆች) Ethiopian Parenting Community platform.

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
  - list-comments: pending
  - create-comment: pending
  - edit-comment: pending
  - delete-comment: pending
  - like-comment: pending
  - report-comment: pending
  - auto-promote-contributor: pending
  - comment-notifications: pending



## TASK SPECIFICATION

# Task 05: Comments API

## Summary
Implement threaded comments on posts (one level deep), with likes and moderation.

## Reference Files
- `/home/redman/gebeya/backend/app/api/v1/chats.py` — Message pattern

## Required Changes

### 5.1 Comments API
**File:** `backend/app/api/v1/comments.py`

- `GET /posts/{id}/comments` — list comments for a post
  - Paginated, sorted by created_at ASC
  - Include nested replies (parent_id grouping)
  - Include author info (or "Anonymous" if is_anonymous)
  - Include `is_liked` for authenticated user
  - Show expert badge if author is expert

- `POST /posts/{id}/comments` — add comment (member+ only)
  - Body: `{ body: str, parent_id?: uuid, is_anonymous?: bool }`
  - If user.role == "expert": set `is_expert_answer = True`
  - Increment post.comment_count
  - Increment user.comment_count
  - Auto-promote: if user has 10+ comments AND role == "member", upgrade to "contributor"
  - Create notification for post author (unless self-comment)
  - If replying to comment, also notify parent comment author

- `PATCH /comments/{id}` — edit own comment
  - Only body is editable

- `DELETE /comments/{id}` — soft delete (status="removed")
  - Only author or admin

- `POST /comments/{id}/like` — toggle like on comment
  - Same pattern as post likes

- `POST /comments/{id}/report` — report comment

### 5.2 Register Routes
Update `router.py`:
- Include comments_router at `/comments` (for edit/delete/like)
- The GET/POST for comments are nested under posts routes

## Acceptance Criteria
- [ ] Comments display with threaded replies
- [ ] Member+ can comment, reader cannot
- [ ] Expert comments get `is_expert_answer` flag
- [ ] Auto-promotion to contributor after 10 comments
- [ ] Notifications created for post author and parent comment author
- [ ] Like toggle works on comments
- [ ] Anonymous comments hide author

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
   - Set `tasks.05-comments-api.status` to `"completed"`
   - Set each subtask to `"completed"` as you finish them
   - Set `tasks.05-comments-api.completed_at` to current ISO timestamp
   - Add any important notes to `tasks.05-comments-api.notes`
10. Finally, create a git commit with message: `feat: implement 05-comments-api — Comments API`

DO NOT skip any part of the task. Implement everything listed in the spec.
If you encounter a blocker, update progress.json notes field with the issue and set status to "failed".
