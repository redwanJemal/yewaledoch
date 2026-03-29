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
