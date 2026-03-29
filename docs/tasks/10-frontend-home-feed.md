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
