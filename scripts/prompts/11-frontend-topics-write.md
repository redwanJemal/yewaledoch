You are implementing task "Frontend — Topics & Create Post" for the YeWaledoch (የወላጆች) Ethiopian Parenting Community platform.

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
  - topics-page: pending
  - topic-feed-page: pending
  - create-post-page: pending
  - locked-write-page: pending
  - post-type-selector: pending
  - category-selector: pending



## TASK SPECIFICATION

# Task 11: Frontend — Topics Page & Create Post Page

## Summary
Build the Topics browsing page (category grid + filtered feed) and the Create Post page for contributors.

## Required Changes

### 11.1 Topics Page
**File:** `frontend/src/pages/TopicsPage.tsx`
- Grid of category cards (3 columns, 2 rows visible)
- Each card: icon (emoji), Amharic name, English subtitle, post count
- Categories from resourcesApi.categories()
- Tap category → navigate to TopicFeedPage

### 11.2 Topic Feed Page
**File:** `frontend/src/pages/TopicFeedPage.tsx`
- Category header: icon, name, description
- Sort tabs: ዘመናዊ (Latest), ተወዳጅ (Popular), ውይይት (Most Discussed)
- Filtered post feed (same PostCard, filtered by category)
- Infinite scroll
- Back button

### 11.3 Create Post Page
**File:** `frontend/src/pages/CreatePostPage.tsx`

**For Contributors+:**
- Post type selector (buttons): ❓ Question, 💡 Tip, 📖 Story, 💬 Discussion
- Title input (required, max 300 chars)
- Category dropdown (required, from categories list)
- Age group selector (optional): All, 0-1, 1-3, 4-12, 13-18
- Rich text body input (textarea, required)
- Image upload (optional, up to 3 images)
- Tags input (optional, comma-separated, max 5)
- Anonymous toggle: "Post anonymously / በስም ሳይገለጽ ጻፍ"
- Discussion prompt input (optional): "Ask a question to spark discussion"
- Preview button → shows how post will look
- Submit button with loading state
- Success → navigate to the new post

**For non-contributors (Readers/Members):**
- Show locked state: "Start commenting to earn posting privileges!"
- Show progress: "You have {n}/10 comments. Keep engaging!"
- Explain the contributor system

### 11.4 PostTypeSelector Component
**File:** `frontend/src/components/PostTypeSelector.tsx`
- Horizontal scrollable buttons
- Each button: icon + label (Amharic)
- Selected state with accent color

### 11.5 CategorySelector Component
**File:** `frontend/src/components/CategorySelector.tsx`
- Dropdown/bottom sheet with category list
- Each item: icon + Amharic name
- Selected state

## Acceptance Criteria
- [ ] Topics page shows category grid with icons and counts
- [ ] Tapping category shows filtered feed
- [ ] Sort by latest/popular/discussed works
- [ ] Create post form validates all required fields
- [ ] Contributors can submit posts
- [ ] Non-contributors see locked state with progress
- [ ] Anonymous toggle works
- [ ] Image upload works
- [ ] Post preview renders correctly

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
   - Set `tasks.11-frontend-topics-write.status` to `"completed"`
   - Set each subtask to `"completed"` as you finish them
   - Set `tasks.11-frontend-topics-write.completed_at` to current ISO timestamp
   - Add any important notes to `tasks.11-frontend-topics-write.notes`
10. Finally, create a git commit with message: `feat: implement 11-frontend-topics-write — Frontend — Topics & Create Post`

DO NOT skip any part of the task. Implement everything listed in the spec.
If you encounter a blocker, update progress.json notes field with the issue and set status to "failed".
