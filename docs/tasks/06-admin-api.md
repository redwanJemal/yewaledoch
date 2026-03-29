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
