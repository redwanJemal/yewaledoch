You are implementing task "Frontend Setup — React + Telegram Mini App" for the YeWaledoch (የወላጆች) Ethiopian Parenting Community platform.

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
  - package-setup: pending
  - vite-config: pending
  - tailwind-config: pending
  - telegram-sdk: pending
  - api-client: pending
  - i18n-setup: pending
  - auth-hook: pending
  - app-shell-tabs: pending
  - entry-files: pending
  - dockerfile: pending



## TASK SPECIFICATION

# Task 09: Frontend Setup — React + Telegram Mini App Foundation

## Summary
Set up the Telegram Mini App frontend: React 18, Vite, Tailwind, Telegram SDK, routing, auth, and API client. Fork patterns from Gebeya.

## Reference Files (READ THESE FIRST)
- `/home/redman/gebeya/frontend/package.json` — Dependencies
- `/home/redman/gebeya/frontend/vite.config.ts` — Vite configuration
- `/home/redman/gebeya/frontend/tailwind.config.js` — Tailwind with Telegram theme vars
- `/home/redman/gebeya/frontend/src/App.tsx` — Tab navigation, routing, deep links
- `/home/redman/gebeya/frontend/src/lib/telegram.tsx` — Telegram SDK context + hooks
- `/home/redman/gebeya/frontend/src/lib/api.ts` — API client pattern
- `/home/redman/gebeya/frontend/src/hooks/useAuth.ts` — Auth state management

## Required Changes

### 9.1 Package Setup
**File:** `frontend/package.json`
Same deps as Gebeya:
- react, react-dom, react-router-dom
- @tanstack/react-query, zustand
- @telegram-apps/sdk-react (1.1.3)
- lucide-react, sonner
- Dev: vite, typescript, tailwindcss, autoprefixer, postcss, @types/*

### 9.2 Vite Config
**File:** `frontend/vite.config.ts`
- React plugin
- Path alias: `@` → `./src`
- Dev server: port 5173
- Proxy `/api` → `http://localhost:8012`

### 9.3 Tailwind Config
**File:** `frontend/tailwind.config.js`
- Copy Gebeya's Telegram theme CSS variable integration
- Same animations (slide-in, slide-out, slide-up)
- Same color palette mapping to tg-* vars

### 9.4 Telegram SDK Context
**File:** `frontend/src/lib/telegram.tsx`
- Copy from Gebeya — TelegramProvider, useTelegram hook
- Back button, main button hooks
- Haptic feedback helpers
- Theme color injection

### 9.5 API Client
**File:** `frontend/src/lib/api.ts`
- Centralized request function with Bearer token auth
- TypeScript interfaces for all models:
  - User, Post, Comment, Like, Save, Notification, Child, Vaccination, Milestone
  - PostFeedParams, PostCreateRequest, CommentCreateRequest
- API modules:
  - `authApi` — telegram login
  - `usersApi` — me, update, getProfile
  - `postsApi` — feed, detail, create, update, delete, like, save, report
  - `commentsApi` — list, create, update, delete, like, report
  - `notificationsApi` — list, markRead, markAllRead
  - `childrenApi` — CRUD, vaccinations, milestones
  - `resourcesApi` — vaccines, milestones, categories
  - `adminApi` — dashboard, drafts, users, reports, scraper (only used by admin panel)

### 9.6 i18n Setup
**File:** `frontend/src/lib/i18n.ts`
- Simple translation system (key-value object, not a heavy library)
- Two language objects: `am` (Amharic) and `en` (English)
- `useTranslation()` hook that reads user's language preference
- Keys for: navigation labels, common buttons, post types, categories, empty states, error messages
- Default language: Amharic (`am`)

### 9.7 Auth Hook
**File:** `frontend/src/hooks/useAuth.ts`
- Fork from Gebeya's useAuth
- Same flow: check existing token → validate → or login via Telegram initData
- Dev mode mock user support
- Expose: user, isLoading, isAuthenticated, error, refreshUser

### 9.8 App Shell with Tab Navigation
**File:** `frontend/src/App.tsx`
- Tab-based navigation (same pattern as Gebeya):
  - 🏠 መነሻ (Home) — content feed
  - 📂 ርዕሶች (Topics) — browse by category
  - ➕ ጻፍ (Write) — create post (if contributor+)
  - 🔔 ማሳወቂያ (Alerts) — notifications
  - 👤 እኔ (Me) — profile
- Page-based routing overlay for detail views (PostDetail, Profile, Settings, etc.)
- Deep link support: `?startapp=p_{postId}` opens post detail
- Telegram Mini App detection (block non-Telegram in prod)
- Unread notification badge polling
- Bottom navigation bar

### 9.9 Entry Files
- `frontend/src/main.tsx` — React root, QueryClientProvider, TelegramProvider
- `frontend/src/styles/globals.css` — Tailwind imports, Telegram CSS vars
- `frontend/index.html` — HTML entry
- `frontend/tsconfig.json`, `frontend/postcss.config.js`

### 9.10 Frontend Dockerfile
**File:** `frontend/Dockerfile`
- Node 20-alpine, npm ci, npm run build, serve with nginx

## Acceptance Criteria
- [ ] `cd frontend && npm install && npm run dev` starts without errors
- [ ] Telegram SDK initializes (or falls back in dev mode)
- [ ] Auth flow works (Telegram login → JWT → stored)
- [ ] Tab navigation renders with 5 tabs
- [ ] API client can make authenticated requests
- [ ] i18n switches between Amharic and English
- [ ] Deep links parse correctly
- [ ] `npm run build` succeeds without TypeScript errors

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
   - Set `tasks.09-frontend-setup.status` to `"completed"`
   - Set each subtask to `"completed"` as you finish them
   - Set `tasks.09-frontend-setup.completed_at` to current ISO timestamp
   - Add any important notes to `tasks.09-frontend-setup.notes`
10. Finally, create a git commit with message: `feat: implement 09-frontend-setup — Frontend Setup — React + Telegram Mini App`

DO NOT skip any part of the task. Implement everything listed in the spec.
If you encounter a blocker, update progress.json notes field with the issue and set status to "failed".
