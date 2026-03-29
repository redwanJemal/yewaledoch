# Task 05: Comments API

## Summary
Implement threaded comments on posts (one level deep), with likes and moderation.

## Reference Files
- `/home/redman/gebeya/backend/app/api/v1/chats.py` — Message pattern

## Required Changes

### 5.1 Comments API
**File:** `backend/app/api/v1/comments.py`

- `GET /posts/{id}/comments` — list comments for a post
  - Paginated, sorted by created_at ASC
  - Include nested replies (parent_id grouping)
  - Include author info (or "Anonymous" if is_anonymous)
  - Include `is_liked` for authenticated user
  - Show expert badge if author is expert

- `POST /posts/{id}/comments` — add comment (member+ only)
  - Body: `{ body: str, parent_id?: uuid, is_anonymous?: bool }`
  - If user.role == "expert": set `is_expert_answer = True`
  - Increment post.comment_count
  - Increment user.comment_count
  - Auto-promote: if user has 10+ comments AND role == "member", upgrade to "contributor"
  - Create notification for post author (unless self-comment)
  - If replying to comment, also notify parent comment author

- `PATCH /comments/{id}` — edit own comment
  - Only body is editable

- `DELETE /comments/{id}` — soft delete (status="removed")
  - Only author or admin

- `POST /comments/{id}/like` — toggle like on comment
  - Same pattern as post likes

- `POST /comments/{id}/report` — report comment

### 5.2 Register Routes
Update `router.py`:
- Include comments_router at `/comments` (for edit/delete/like)
- The GET/POST for comments are nested under posts routes

## Acceptance Criteria
- [ ] Comments display with threaded replies
- [ ] Member+ can comment, reader cannot
- [ ] Expert comments get `is_expert_answer` flag
- [ ] Auto-promotion to contributor after 10 comments
- [ ] Notifications created for post author and parent comment author
- [ ] Like toggle works on comments
- [ ] Anonymous comments hide author
