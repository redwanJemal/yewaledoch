You are implementing task "Frontend — Profile, Notifications, Resources" for the YeWaledoch (የወላጆች) Ethiopian Parenting Community platform.

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
  - profile-page: pending
  - add-child-modal: pending
  - child-profile-page: pending
  - vaccination-checklist: pending
  - notifications-page: pending
  - my-posts-page: pending
  - saved-posts-page: pending
  - resources-page: pending
  - settings-page: pending



## TASK SPECIFICATION

# Task 12: Frontend — Profile, Notifications, Settings, Resources

## Summary
Build the Profile tab (user info, children, saved posts), Notifications tab, Settings page, and Resources section.

## Reference Files
- `/home/redman/gebeya/frontend/src/pages/ProfilePage.tsx` — Profile layout pattern

## Required Changes

### 12.1 Profile Page
**File:** `frontend/src/pages/ProfilePage.tsx`
- User avatar (from Telegram), name, role badge
- Stats row: posts count, comments count, reputation
- Parenting role indicator (mother/father/guardian/expecting)
- My Children section:
  - List of children (name, age calculated from DOB, gender icon)
  - [+ Add Child] button → opens AddChildModal
  - Tap child → opens ChildProfilePage
- Quick links grid:
  - 📝 My Posts
  - 🔖 Saved Posts
  - 📖 Resources
  - ⚙️ Settings
- Edit profile button → inline editing or separate page

### 12.2 Add Child Modal
**File:** `frontend/src/components/AddChildModal.tsx`
- Name input
- Date of birth picker
- Gender selector (Boy/Girl)
- Save button
- Uses Telegram's native confirm for cancel

### 12.3 Child Profile Page
**File:** `frontend/src/pages/ChildProfilePage.tsx`
- Child name, age, gender icon
- Tabs: Vaccinations | Milestones
- **Vaccinations tab:**
  - Ethiopian EPI schedule pre-populated based on child DOB
  - Each vaccine: name (Amharic), scheduled date (calculated from DOB), status
  - Tap to mark as completed (set administered_date)
  - Overdue vaccines highlighted in red
  - Upcoming vaccines highlighted in yellow
- **Milestones tab:**
  - Milestone checklist by age group
  - Tap to log (set date, optional notes/photo)
  - Completed milestones with checkmark + date

### 12.4 Vaccination Checklist Component
**File:** `frontend/src/components/VaccinationChecklist.tsx`
- List of vaccines grouped by age (At Birth, 6 weeks, 10 weeks, etc.)
- Each item: vaccine name, dose, scheduled date, status icon (✅/⏰/⬜/🔴)
- Tap completed → opens date picker to confirm
- Color coding: green=done, yellow=upcoming, red=overdue, gray=future

### 12.5 Notifications Page
**File:** `frontend/src/pages/NotificationsPage.tsx`
- Notification list grouped by date (Today, Yesterday, This Week, Earlier)
- Each notification: icon by type, title, body, time ago
- Unread notifications with blue dot/background
- Tap notification → navigate to relevant post
- "Mark all as read" button at top
- Empty state: "No notifications yet / ገና ማሳወቂያ የለም"
- Pull to refresh

### 12.6 My Posts Page
**File:** `frontend/src/pages/MyPostsPage.tsx`
- List of user's own posts
- Each post: title, status badge, like/comment counts, date
- Tap → navigate to post detail
- Empty state

### 12.7 Saved Posts Page
**File:** `frontend/src/pages/SavedPostsPage.tsx`
- List of saved/bookmarked posts
- Same PostCard layout
- Empty state: "No saved posts / የተቀመጡ ልጥፎች የሉም"

### 12.8 Resources Page
**File:** `frontend/src/pages/ResourcesPage.tsx`
- Card grid:
  - 💉 Vaccination Schedule
  - 🍼 Baby Food Recipes
  - 📞 Emergency Contacts
  - 📊 Milestone Guide
  - 🤰 Pregnancy Guide
- Tap card → shows detailed resource content (from resourcesApi)

### 12.9 Settings Page
**File:** `frontend/src/pages/SettingsPage.tsx`
- Language toggle: አማርኛ / English
- Notification preferences (toggles)
- Edit profile: name, city, parenting role
- About section
- Help/feedback link

## Acceptance Criteria
- [ ] Profile shows user info, stats, children
- [ ] Add/edit/delete children works
- [ ] Vaccination checklist displays based on child DOB
- [ ] Marking vaccination as completed persists
- [ ] Milestone tracking works
- [ ] Notifications display grouped by date
- [ ] Unread badge shows on tab
- [ ] Mark all as read works
- [ ] My Posts and Saved Posts pages work
- [ ] Resources pages display seed data
- [ ] Settings language toggle works
- [ ] All text defaults to Amharic

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
   - Set `tasks.12-frontend-profile-notifications.status` to `"completed"`
   - Set each subtask to `"completed"` as you finish them
   - Set `tasks.12-frontend-profile-notifications.completed_at` to current ISO timestamp
   - Add any important notes to `tasks.12-frontend-profile-notifications.notes`
10. Finally, create a git commit with message: `feat: implement 12-frontend-profile-notifications — Frontend — Profile, Notifications, Resources`

DO NOT skip any part of the task. Implement everything listed in the spec.
If you encounter a blocker, update progress.json notes field with the issue and set status to "failed".
