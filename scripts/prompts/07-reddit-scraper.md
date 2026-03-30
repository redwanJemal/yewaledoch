You are implementing task "Reddit Scraper & AI Translation Pipeline" for the YeWaledoch (የወላጆች) Ethiopian Parenting Community platform.

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
  - reddit-scraper: pending
  - ai-translator: pending
  - pipeline-orchestrator: pending
  - scraper-config: pending
  - seed-data-categories: pending
  - admin-notification: pending



## TASK SPECIFICATION

# Task 07: Reddit Scraper & AI Translation Pipeline

## Summary
Build the automated content pipeline: scrape top posts from parenting subreddits, translate to Amharic via AI, store as drafts for admin review.

## Required Changes

### 7.1 Reddit Scraper
**File:** `backend/scraper/reddit_scraper.py`

- Fetch posts from Reddit's public JSON API (no auth needed):
  - `https://www.reddit.com/r/Parenting/top/.json?t=day&limit=20`
  - `https://www.reddit.com/r/Mommit/top/.json?t=day&limit=10`
  - `https://www.reddit.com/r/daddit/top/.json?t=day&limit=10`
  - `https://www.reddit.com/r/toddlers/top/.json?t=day&limit=10`
- Set User-Agent header: `YeWaledoch/1.0 (content curation)`
- Filter posts: minimum upvotes threshold (configurable, default 300)
- Extract per post: title, selftext (body), author, upvotes, num_comments, permalink, subreddit, link_flair_text
- Fetch top 5 comments per qualifying post (fetch `{permalink}.json`)
- Skip posts that already exist in scraped_drafts (check reddit_post_id)
- Handle rate limiting (1 request per 2 seconds)
- Use httpx async client

### 7.2 AI Translator
**File:** `backend/scraper/translator.py`

- Translate English content to Amharic using Claude API (Anthropic SDK)
- Translation prompt must include cultural adaptation rules:
  - Convert Western food → Ethiopian equivalents (genfo, qinche, shiro)
  - Convert USD → ETB approximations
  - Replace American school/healthcare references with Ethiopian context
  - Replace "pediatrician" → "የሕፃናት ሐኪም"
  - Replace "daycare" → "ማቆያ"
  - Keep emotional tone intact
  - Make it natural Amharic, not literal translation
  - Add a discussion prompt at the end (Amharic question to spark engagement)
- Translate: title, body, and top comments
- Return structured result: { translated_title, translated_body, translated_comments, suggested_category }
- Fallback: if Anthropic API fails, log error and store with original English (admin can translate manually)
- Use environment variable `ANTHROPIC_API_KEY`

### 7.3 Pipeline Orchestrator
**File:** `backend/scraper/scheduler.py`

- `run_pipeline()` — main function:
  1. Call scraper to fetch new posts
  2. For each new post, translate via AI
  3. Save to `scraped_drafts` table with status="pending"
  4. Send Telegram notification to admin: "📝 {count} new drafts ready for review"
- Can be run:
  - Manually via `python -m scraper.scheduler`
  - Via admin API (`POST /admin/scraper/run`)
  - Via cron job
- Log all activity with structlog

### 7.4 Configuration
**File:** `backend/scraper/__init__.py`

Scraper config constants:
```python
SUBREDDIT_SOURCES = [
    {"name": "Parenting", "min_upvotes": 300, "limit": 20},
    {"name": "Mommit", "min_upvotes": 200, "limit": 10},
    {"name": "daddit", "min_upvotes": 200, "limit": 10},
    {"name": "toddlers", "min_upvotes": 200, "limit": 10},
]
MAX_COMMENTS_PER_POST = 5
REQUEST_DELAY = 2.0  # seconds between Reddit requests
```

### 7.5 Seed Data
**File:** `backend/seed_data/categories.json`
```json
[
  {"slug": "pregnancy", "name_am": "እርግዝና", "name_en": "Pregnancy", "icon": "🤰"},
  {"slug": "newborn", "name_am": "ሕፃናት", "name_en": "Newborn (0-1yr)", "icon": "👶"},
  {"slug": "toddler", "name_am": "ትንንሽ ልጆች", "name_en": "Toddler (1-3yr)", "icon": "���"},
  {"slug": "school_age", "name_am": "ት/ቤት ዕድሜ", "name_en": "School Age (4-12)", "icon": "📚"},
  {"slug": "teens", "name_am": "ታዳጊዎች", "name_en": "Teens (13-18)", "icon": "🧑"},
  {"slug": "health", "name_am": "ጤና", "name_en": "Health", "icon": "🏥"},
  {"slug": "nutrition", "name_am": "ምግብ", "name_en": "Nutrition", "icon": "🍲"},
  {"slug": "dads", "name_am": "አባቶች", "name_en": "Dads", "icon": "👨"},
  {"slug": "mental_health", "name_am": "የአእምሮ ጤና", "name_en": "Mental Health", "icon": "🧠"},
  {"slug": "special_needs", "name_am": "ልዩ ፍላጎት", "name_en": "Special Needs", "icon": "��"},
  {"slug": "education", "name_am": "ትምህርት", "name_en": "Education", "icon": "����"},
  {"slug": "fun_activities", "name_am": "መዝናኛ", "name_en": "Fun & Activities", "icon": "🎨"}
]
```

## Acceptance Criteria
- [ ] `python -m scraper.scheduler` fetches Reddit posts, translates, and saves drafts
- [ ] Duplicate posts are skipped (reddit_post_id uniqueness)
- [ ] Translation produces natural Amharic with cultural adaptation
- [ ] Admin receives Telegram notification with draft count
- [ ] Rate limiting respects Reddit's guidelines (2s between requests)
- [ ] Graceful error handling: API failures don't crash the pipeline
- [ ] Categories seed data file is created

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
   - Set `tasks.07-reddit-scraper.status` to `"completed"`
   - Set each subtask to `"completed"` as you finish them
   - Set `tasks.07-reddit-scraper.completed_at` to current ISO timestamp
   - Add any important notes to `tasks.07-reddit-scraper.notes`
10. Finally, create a git commit with message: `feat: implement 07-reddit-scraper — Reddit Scraper & AI Translation Pipeline`

DO NOT skip any part of the task. Implement everything listed in the spec.
If you encounter a blocker, update progress.json notes field with the issue and set status to "failed".
