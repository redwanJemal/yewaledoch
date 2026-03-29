# Task 08: Notifications API & Telegram Bot Service

## Summary
Implement the notification system: in-app notifications, Telegram bot message delivery, and the children/resources endpoints.

## Reference Files
- `/home/redman/gebeya/backend/app/services/notifications.py` — Telegram bot notification pattern

## Required Changes

### 8.1 Notification API
**File:** `backend/app/api/v1/notifications.py`

- `GET /notifications` — list user's notifications (paginated, newest first)
  - Filter: unread only option
  - Include notification type, title, body, data (post_id, comment_id etc.)
- `POST /notifications/read` — mark specific notifications as read
  - Body: `{ ids: [uuid, ...] }`
- `POST /notifications/read-all` — mark all as read

### 8.2 Telegram Bot Notification Service
**File:** `backend/app/services/notification_service.py`

- `send_telegram_notification(telegram_id, text, data)` — send message via Telegram Bot API
  - Use httpx async client
  - Include inline keyboard button to open Mini App (deep link)
  - Handle errors gracefully (don't crash if notification fails)
- `notify_comment_reply(post_author, commenter, post)` — when someone comments on your post
- `notify_like(post_author, liker, post)` — when someone likes your post (batch/throttle these)
- `notify_expert_answer(post_author, expert, post)` — when an expert answers
- `broadcast_to_all(title, body)` — admin broadcast to all users
  - Fetch all user telegram_ids, send in batches (Telegram rate limit: 30 msgs/sec)
- Deep link format: `https://t.me/{BOT_USERNAME}?startapp=p_{postId}`

### 8.3 Children & Tracking API
**File:** `backend/app/api/v1/children.py`

- `GET /children` — list user's children
- `POST /children` — add child (name, date_of_birth, gender)
- `PATCH /children/{id}` — update child
- `DELETE /children/{id}` — remove child
- `GET /children/{id}/vaccinations` — vaccination schedule (pre-populated with Ethiopian EPI)
- `POST /children/{id}/vaccinations` — log vaccination (mark as completed)
- `GET /children/{id}/milestones` — milestone list
- `POST /children/{id}/milestones` — log milestone

### 8.4 Resources API
**File:** `backend/app/api/v1/resources.py`

- `GET /resources/vaccines` — Ethiopian EPI vaccination schedule reference
- `GET /resources/milestones` — milestone reference list by age
- `GET /resources/categories` — content categories list
- Serve from seed_data JSON files

### 8.5 Seed Data
**File:** `backend/seed_data/ethiopian_vaccines.json`
Ethiopian EPI schedule:
- At birth: BCG, OPV-0
- 6 weeks: Pentavalent-1, OPV-1, PCV-1, Rotavirus-1
- 10 weeks: Pentavalent-2, OPV-2, PCV-2, Rotavirus-2
- 14 weeks: Pentavalent-3, OPV-3, PCV-3, IPV
- 9 months: Measles-1, Vitamin A
- 15 months: Measles-2

**File:** `backend/seed_data/milestones.json`
Baby milestones by month (0-24 months): first smile, head control, rolls over, sits up, crawls, first word, first steps, etc.

### 8.6 Register Routes
Update `router.py`:
- Include notifications_router at `/notifications`
- Include children_router at `/children`
- Include resources_router at `/resources`

## Acceptance Criteria
- [ ] Notifications created when comments/likes happen
- [ ] Telegram bot sends messages with deep links
- [ ] Broadcast works (batched sending)
- [ ] Children CRUD works
- [ ] Vaccination schedule pre-populated per child based on DOB
- [ ] Resources endpoints return seed data
- [ ] Milestone logging works
