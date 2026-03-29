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
