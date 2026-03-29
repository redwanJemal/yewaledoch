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
