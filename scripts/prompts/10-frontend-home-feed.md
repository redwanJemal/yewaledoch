You are implementing task "Frontend — Home Feed & Post Detail" for the YeWaledoch (የወላጆች) Ethiopian Parenting Community platform.

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
  - post-card-component: pending
  - home-page: pending
  - post-detail-page: pending
  - comment-thread-component: pending
  - comment-input-component: pending
  - common-components: pending



## TASK SPECIFICATION

# Task 10: Frontend — Home Feed & Post Detail Pages

## Summary
Build the main content experience: home feed with post cards, search, pull-to-refresh, and the post detail page with full content + comments.

## Reference Files
- `/home/redman/gebeya/frontend/src/pages/HomePage.tsx` — Feed layout pattern
- `/home/redman/gebeya/frontend/src/pages/ListingDetailPage.tsx` — Detail page pattern

## Required Changes

### 10.1 PostCard Component
**File:** `frontend/src/components/PostCard.tsx`
- Displays: category icon/tag, title (2 lines max), body preview (3 lines), author avatar + name (or "Anonymous" + parenting role)
- Engagement bar: ❤️ like_count, 💬 comment_count, time ago
- Expert badge 🏥 if author is expert
- Pinned indicator 📌 if is_pinned
- Tap → navigates to PostDetail
- Like button with haptic feedback
- Skeleton loading state

### 10.2 Home Page
**File:** `frontend/src/pages/HomePage.tsx`
- Search bar at top (search posts by title/body)
- Pinned/featured post at top (if any)
- Infinite scroll feed of PostCards
- Pull-to-refresh
- Empty state: "No posts yet. Check back soon! / ገና ምንም ልጥፍ የለም"
- Loading: skeleton cards (3-4 shimmer cards)
- Error state with retry button
- Use React Query for data fetching with infinite query

### 10.3 Post Detail Page
**File:** `frontend/src/pages/PostDetailPage.tsx`
- Full post content (title, body, images if any)
- Author info (avatar, name, role badge, reputation) or Anonymous
- Category tag, age group tag, time ago
- Discussion prompt highlighted at bottom of content
- Engagement row: Like button (animated), Save/Bookmark button, Share button (Telegram share)
- Source attribution for curated posts: "Translated from r/{subreddit}"
- Comment section below:
  - Comment count header
  - Comment input (if member+) with anonymous toggle
  - Threaded comment list (CommentThread component)
  - Each comment: author, body, time ago, like button, reply button
  - Expert answers highlighted with blue background + 🏥 badge
  - Replies indented under parent comment
- Back button (Telegram back button hook)
- Share via Telegram deep link

### 10.4 CommentThread Component
**File:** `frontend/src/components/CommentThread.tsx`
- Renders a comment + its replies
- Author avatar, name (or Anonymous), time ago
- Comment body
- Like button + count
- Reply button → shows inline reply input
- Expert badge for expert comments
- Report button (⚑ icon)

### 10.5 Comment Input Component
**File:** `frontend/src/components/CommentInput.tsx`
- Text input with send button
- Anonymous toggle checkbox: "Post anonymously / በስም ሳይገለጽ ጻፍ"
- Loading state while submitting
- Auto-focus when replying

### 10.6 Common Components
**File:** `frontend/src/components/LoadingScreen.tsx` — Full screen spinner
**File:** `frontend/src/components/EmptyState.tsx` — Icon + message + optional action
**File:** `frontend/src/components/CategoryBadge.tsx` — Colored category tag with icon

## Design Guidelines
- Follow Gebeya's visual style: clean, white background, Telegram theme colors
- Card-based layout with subtle shadows
- Amharic text should use proper font rendering (system fonts handle Ge'ez script)
- Haptic feedback on like, save, share actions
- Toast notifications for actions (sonner library)

## Acceptance Criteria
- [ ] Home feed loads with infinite scroll
- [ ] Search filters posts in real-time
- [ ] Pull-to-refresh works
- [ ] PostCard shows all required info
- [ ] Post detail shows full content + comments
- [ ] Like/save toggles work with animation
- [ ] Comments display threaded
- [ ] Comment input works (with anonymous option)
- [ ] Share generates Telegram deep link
- [ ] Loading and empty states render correctly
- [ ] All text is Amharic by default

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
   - Set `tasks.10-frontend-home-feed.status` to `"completed"`
   - Set each subtask to `"completed"` as you finish them
   - Set `tasks.10-frontend-home-feed.completed_at` to current ISO timestamp
   - Add any important notes to `tasks.10-frontend-home-feed.notes`
10. Finally, create a git commit with message: `feat: implement 10-frontend-home-feed — Frontend — Home Feed & Post Detail`

DO NOT skip any part of the task. Implement everything listed in the spec.
If you encounter a blocker, update progress.json notes field with the issue and set status to "failed".
