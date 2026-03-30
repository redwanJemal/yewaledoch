You are implementing task "Posts API — Feed, CRUD, Engagement" for the YeWaledoch (የወላጆች) Ethiopian Parenting Community platform.

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
  - post-feed-endpoint: pending
  - post-detail-endpoint: pending
  - post-create-endpoint: pending
  - post-update-endpoint: pending
  - post-delete-endpoint: pending
  - like-toggle: pending
  - save-toggle: pending
  - report-endpoint: pending
  - saved-posts-list: pending
  - pydantic-schemas: pending
  - register-routes: pending



## TASK SPECIFICATION

# Task 04: Posts API — Content Feed, CRUD, Engagement

## Summary
Implement the core content system: post feed with pagination/filtering, create/edit/delete posts, and engagement features (like, save, report).

## Reference Files
- `/home/redman/gebeya/backend/app/api/v1/listings.py` — CRUD + filtering pattern
- `/home/redman/parenting/YEWALEDOCH_PROJECT_SPEC.md` — Section 5: API Endpoints

## Required Changes

### 4.1 Posts API
**File:** `backend/app/api/v1/posts.py`

**Feed endpoint:**
- `GET /posts` — paginated content feed
  - Query params: `category`, `age_group`, `post_type`, `search`, `sort` (latest/popular/discussed), `page`, `limit`
  - Default sort: `published_at DESC`
  - Only return `status="published"` posts
  - Include author info (name, photo, role, expert badge)
  - For anonymous posts: hide author, show only parenting_role
  - Use `selectinload` for author relationship

**Detail endpoint:**
- `GET /posts/{id}` — full post with author info
  - Increment `view_count` (fire-and-forget, don't block response)
  - Include `is_liked` and `is_saved` for authenticated user

**Create endpoint:**
- `POST /posts` — create post (contributor+ only)
  - Validate: user.role in (contributor, expert, admin)
  - Required: title, body, category, post_type
  - Optional: age_group, tags, images, is_anonymous, discussion_prompt
  - Set status="published", published_at=now()
  - Increment user.post_count

**Update endpoint:**
- `PATCH /posts/{id}` — edit own post
  - Only author or admin can edit
  - Editable: title, body, category, tags, is_anonymous

**Delete endpoint:**
- `DELETE /posts/{id}` — soft delete (set status="removed")
  - Only author or admin can delete

### 4.2 Engagement Endpoints

**Like:**
- `POST /posts/{id}/like` — toggle like
  - If already liked → remove like, decrement count
  - If not liked → add like, increment count
  - Return `{ liked: bool, like_count: int }`

**Save/Bookmark:**
- `POST /posts/{id}/save` — toggle save
  - Same toggle pattern as like
  - Return `{ saved: bool }`

**Report:**
- `POST /posts/{id}/report` — report post
  - Body: `{ reason: str, details?: str }`
  - Create report record
  - Prevent duplicate reports from same user

**Saved posts:**
- `GET /saved` — list user's saved posts (paginated)

### 4.3 Pydantic Models
Create request/response schemas:
- `PostCreate`, `PostUpdate` — request models
- `PostResponse`, `PostListResponse` — response models (include author, engagement counts)
- `PostFeedParams` — query parameter model

### 4.4 Register Routes
Update `router.py`:
- Include posts_router at `/posts`
- Include saved_router at `/saved`

## Acceptance Criteria
- [ ] `GET /api/v1/posts` returns paginated feed with filters
- [ ] `GET /api/v1/posts/{id}` returns full post detail
- [ ] `POST /api/v1/posts` creates post (contributor+ enforced)
- [ ] `PATCH /api/v1/posts/{id}` edits own post
- [ ] `DELETE /api/v1/posts/{id}` soft-deletes
- [ ] Like/save toggle works correctly with counter updates
- [ ] Report prevents duplicates
- [ ] Anonymous posts hide author info
- [ ] Search works on title and body

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
   - Set `tasks.04-posts-api.status` to `"completed"`
   - Set each subtask to `"completed"` as you finish them
   - Set `tasks.04-posts-api.completed_at` to current ISO timestamp
   - Add any important notes to `tasks.04-posts-api.notes`
10. Finally, create a git commit with message: `feat: implement 04-posts-api — Posts API — Feed, CRUD, Engagement`

DO NOT skip any part of the task. Implement everything listed in the spec.
If you encounter a blocker, update progress.json notes field with the issue and set status to "failed".
