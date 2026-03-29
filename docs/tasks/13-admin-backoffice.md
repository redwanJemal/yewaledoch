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
