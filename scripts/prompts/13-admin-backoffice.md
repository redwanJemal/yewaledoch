You are implementing task "Admin Backoffice — Dashboard, Drafts, Management" for the YeWaledoch (የወላጆች) Ethiopian Parenting Community platform.

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
  - admin-setup: pending
  - dashboard-page: pending
  - draft-queue-page: pending
  - draft-edit-page: pending
  - content-management-page: pending
  - user-management-page: pending
  - reports-page: pending
  - scraper-page: pending
  - admin-dockerfile: pending



## TASK SPECIFICATION

# Task 13: Admin Backoffice — Dashboard, Draft Queue, Content & User Management

## Summary
Build the admin backoffice as a separate React SPA. This is for managing scraped content, moderating the community, and viewing analytics.

## Required Changes

### 13.1 Admin Setup
**File:** `admin/package.json`
- Same deps as frontend: react, react-dom, react-router-dom, @tanstack/react-query, tailwindcss, lucide-react
- NO Telegram SDK (admin runs in browser, not Telegram)
- Vite dev server on port 5174

**File:** `admin/vite.config.ts`
- Proxy `/api` → `http://localhost:8012`

**File:** `admin/src/lib/api.ts`
- Admin API client (reuse pattern from frontend/src/lib/api.ts)
- Auth via JWT token stored in localStorage
- Admin-specific endpoints only

**File:** `admin/src/App.tsx`
- Sidebar navigation (not tabs):
  - 📊 Dashboard
  - 📝 Draft Queue
  - 📄 Content
  - 👥 Users
  - 🚩 Reports
  - ⚙️ Scraper
- Admin login: enter Telegram initData or JWT token manually
- Protected routes (redirect to login if no token)

### 13.2 Dashboard Page
**File:** `admin/src/pages/DashboardPage.tsx`
- Stat cards: Total Users, Total Posts, Total Comments, Active Today
- Line chart: new users over last 30 days (simple, use basic SVG or a light chart lib)
- Recent activity feed (last 10 posts/comments)
- Quick actions: Run Scraper, Broadcast Message

### 13.3 Draft Queue Page
**File:** `admin/src/pages/DraftQueuePage.tsx`
- Table/list of scraped drafts with status filter tabs: Pending, Published, Discarded
- Each draft row:
  - Translated title (Amharic)
  - Source: r/{subreddit} (link to original)
  - Original upvotes + comments
  - Auto-suggested category
  - Scraped date
  - Actions: [Edit] [Preview] [Publish] [Discard]
- Bulk actions: publish selected, discard selected
- Count badge on Pending tab

### 13.4 Draft Edit Page
**File:** `admin/src/pages/DraftEditPage.tsx`
- Side-by-side view: Original English | Amharic Translation
- Editable fields: translated_title, translated_body, category, discussion prompt
- Top comments: original + translated (editable)
- Preview panel: shows how post will look in the app
- Actions: [Save Draft] [Publish] [Discard] [Back]

### 13.5 Content Management Page
**File:** `admin/src/pages/ContentManagementPage.tsx`
- All published posts (table view)
- Search and filter: category, post_type, author, date range
- Per post actions: Pin/Unpin, Feature/Unfeature, Edit, Delete
- Click row → inline expansion with post content preview

### 13.6 User Management Page
**File:** `admin/src/pages/UserManagementPage.tsx`
- User table: name, telegram username, role, posts, comments, reputation, joined date
- Search by name/username
- Filter by role
- Per user actions: Change Role (dropdown), Ban, Unban
- Click row → user detail modal (full activity history)

### 13.7 Reports Page
**File:** `admin/src/pages/ReportsPage.tsx`
- Pending reports list
- Each report: reported content preview, reason, reporter, date, report count
- Actions: [View Content] [Remove Content] [Dismiss] [Ban User]
- Resolved reports tab (history)

### 13.8 Scraper Config Page
**File:** `admin/src/pages/ScraperPage.tsx`
- Subreddit sources list: name, min upvotes, status (enabled/disabled)
- [Run Scraper Now] button with loading state and result count
- Last run timestamp and status
- Simple config (display-only for now, editable in future)

### 13.9 Admin Dockerfile
**File:** `admin/Dockerfile`
- Node 20-alpine, build, serve with nginx

## Design Guidelines
- Clean admin design: white background, minimal colors
- Sidebar navigation (fixed left)
- Table-based layouts for lists
- No Telegram theme integration (runs in regular browser)
- Responsive but desktop-first

## Acceptance Criteria
- [ ] Admin panel loads at localhost:5174
- [ ] Dashboard shows real-time stats
- [ ] Draft queue: list, edit, preview, publish, discard all work
- [ ] Publishing a draft creates a visible post in the app
- [ ] Content management: pin, feature, edit, delete posts
- [ ] User management: change roles, ban/unban
- [ ] Reports queue with all action types
- [ ] Scraper trigger runs and shows results
- [ ] `npm run build` succeeds

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
   - Set `tasks.13-admin-backoffice.status` to `"completed"`
   - Set each subtask to `"completed"` as you finish them
   - Set `tasks.13-admin-backoffice.completed_at` to current ISO timestamp
   - Add any important notes to `tasks.13-admin-backoffice.notes`
10. Finally, create a git commit with message: `feat: implement 13-admin-backoffice — Admin Backoffice — Dashboard, Drafts, Management`

DO NOT skip any part of the task. Implement everything listed in the spec.
If you encounter a blocker, update progress.json notes field with the issue and set status to "failed".
