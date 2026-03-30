You are implementing task "Auth & Users API" for the YeWaledoch (የወላጆች) Ethiopian Parenting Community platform.

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
  - auth-dependencies: pending
  - auth-endpoint: pending
  - user-endpoints: pending
  - register-router: pending



## TASK SPECIFICATION

# Task 03: Auth & Users API

## Summary
Implement Telegram authentication and user profile endpoints. Fork directly from Gebeya's auth system.

## Reference Files
- `/home/redman/gebeya/backend/app/api/v1/auth.py` — Auth endpoint pattern
- `/home/redman/gebeya/backend/app/api/deps.py` — Dependency injection pattern
- `/home/redman/gebeya/backend/app/api/v1/users.py` — User endpoints pattern

## Required Changes

### 3.1 Auth Dependencies
**File:** `backend/app/api/deps.py`
- `get_current_user()` — validate JWT from Authorization header, return User
- `get_current_user_optional()` — same but returns None if no token
- `get_admin_user()` — requires user.role == "admin"
- Type aliases: `CurrentUser`, `OptionalUser`, `AdminUser`
- Support both `Authorization: Bearer <jwt>` and `X-Telegram-Init-Data` headers (same as Gebeya)

### 3.2 Auth Endpoint
**File:** `backend/app/api/v1/auth.py`
- `POST /auth/telegram` — validate Telegram initData, create/update user, return JWT + user data
- Request: `{ init_data: str }`
- Response: `{ access_token, token_type, user }`
- On first login: create user with role="member" (auto-upgraded from reader)
- On subsequent login: update user's telegram info (name, photo, username)
- Follow Gebeya's pattern exactly

### 3.3 User Endpoints
**File:** `backend/app/api/v1/users.py`
- `GET /users/me` — return current user profile
- `PATCH /users/me` — update profile (first_name, last_name, city, parenting_role, language, children JSONB)
- `GET /users/{id}` — public user profile (hide email/phone, show post_count, reputation)
- Pydantic response models for each endpoint

### 3.4 Register Router
**File:** `backend/app/api/v1/router.py`
- Include auth_router at `/auth`
- Include users_router at `/users`

## Acceptance Criteria
- [ ] `POST /api/v1/auth/telegram` validates initData and returns JWT
- [ ] `GET /api/v1/users/me` returns authenticated user
- [ ] `PATCH /api/v1/users/me` updates profile fields
- [ ] `GET /api/v1/users/{id}` returns public profile
- [ ] Admin check works via `AdminUser` dependency
- [ ] Swagger docs show all endpoints

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
   - Set `tasks.03-auth-and-users-api.status` to `"completed"`
   - Set each subtask to `"completed"` as you finish them
   - Set `tasks.03-auth-and-users-api.completed_at` to current ISO timestamp
   - Add any important notes to `tasks.03-auth-and-users-api.notes`
10. Finally, create a git commit with message: `feat: implement 03-auth-and-users-api — Auth & Users API`

DO NOT skip any part of the task. Implement everything listed in the spec.
If you encounter a blocker, update progress.json notes field with the issue and set status to "failed".
