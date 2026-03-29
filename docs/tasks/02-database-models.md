# Task 02: Database Models & Migrations

## Summary
Create all SQLAlchemy models for the YeWaledoch platform and generate the initial Alembic migration. Follow Gebeya's model patterns exactly (UUID PKs, Mapped types, timezone-aware datetimes).

## Reference Files
- `/home/redman/gebeya/backend/app/models/user.py` — User model pattern
- `/home/redman/gebeya/backend/app/models/listing.py` — Model with enums, JSONB, arrays
- `/home/redman/gebeya/backend/app/models/chat.py` — Relationships pattern
- `/home/redman/parenting/YEWALEDOCH_PROJECT_SPEC.md` — Full schema specification (Section 4)

## Required Models

### 2.1 User Model
**File:** `backend/app/models/user.py`
- `id` — UUID primary key
- `telegram_id` — BigInteger, unique, indexed
- `first_name`, `last_name`, `username` — String, nullable
- `photo_url` — Text, nullable
- `phone` — String(20), nullable
- `phone_verified` — Boolean, default False
- `role` — String(20), default "reader" (reader/member/contributor/expert/admin)
- `parenting_role` — String(20), nullable (mother/father/guardian/expecting)
- `children` — JSONB, default []
- `city` — String(100), nullable
- `reputation` — Integer, default 0
- `post_count`, `comment_count` — Integer, default 0
- `expert_specialty`, `expert_license`, `expert_bio` — nullable
- `expert_verified` — Boolean, default False
- `is_banned` — Boolean, default False
- `ban_reason` — Text, nullable
- `language` — String(5), default "am"
- `settings` — JSONB, default {}
- `created_at`, `updated_at` — DateTime(timezone=True)
- Relationships: posts, comments, likes, saves, children, notifications
- Helper: `update_from_telegram(tg_user: dict)`

### 2.2 Post Model
**File:** `backend/app/models/post.py`
- `id` — UUID PK
- `author_id` — FK to users
- `title` — String(300), not null
- `body` — Text, not null
- `post_type` — String(20), not null (curated/question/tip/story/discussion/expert_answer)
- `category` — String(50), not null
- `age_group` — String(20), nullable
- `tags` — ARRAY(String(50)), default []
- `language` — String(5), default "am"
- `images` — ARRAY(Text), default []
- `is_anonymous` — Boolean, default False
- `is_pinned`, `is_featured` — Boolean, default False
- `discussion_prompt` — Text, nullable
- `source_url`, `source_subreddit` — for scraped content
- `source_upvotes` — Integer, nullable
- `like_count`, `comment_count`, `save_count`, `view_count` — Integer, default 0
- `status` — String(20), default "draft" (draft/published/removed/archived)
- `published_at` — DateTime, nullable
- `created_at`, `updated_at`
- Indexes: (status, published_at DESC), (category), (author_id)
- Relationships: author, comments, likes, saves

### 2.3 Comment Model
**File:** `backend/app/models/comment.py`
- `id` — UUID PK
- `post_id` — FK to posts (ON DELETE CASCADE)
- `author_id` — FK to users
- `parent_id` — FK to comments (self-referential, nullable for top-level)
- `body` — Text, not null
- `is_anonymous` — Boolean, default False
- `is_expert_answer` — Boolean, default False
- `like_count` — Integer, default 0
- `status` — String(20), default "active" (active/removed/hidden)
- `created_at`, `updated_at`
- Index: (post_id, created_at)

### 2.4 Like Model
**File:** `backend/app/models/like.py`
- `id` — UUID PK
- `user_id` — FK to users
- `post_id` — FK to posts, nullable
- `comment_id` — FK to comments, nullable
- `created_at`
- Constraints: CHECK (post_id XOR comment_id), UNIQUE(user_id, post_id), UNIQUE(user_id, comment_id)

### 2.5 Save Model
**File:** `backend/app/models/save.py`
- `id` — UUID PK
- `user_id` — FK to users
- `post_id` — FK to posts
- `created_at`
- UNIQUE(user_id, post_id)

### 2.6 Report Model
**File:** `backend/app/models/report.py`
- `id` — UUID PK
- `reporter_id` — FK to users
- `post_id`, `comment_id` — nullable FKs
- `reason` — String(50) (spam/inappropriate/misinformation/harassment/other)
- `details` — Text, nullable
- `status` — String(20), default "pending" (pending/resolved/dismissed)
- `resolved_by` — FK to users, nullable
- `resolved_at` — DateTime, nullable
- `created_at`

### 2.7 ScrapedDraft Model
**File:** `backend/app/models/scraped_draft.py`
- `id` — UUID PK
- `reddit_post_id` — String(20), unique
- `reddit_url`, `subreddit`, `original_title`, `original_body` — source data
- `original_upvotes`, `original_comments` — Integer
- `top_comments` — JSONB, default []
- `translated_title`, `translated_body` — translated content
- `translated_comments` — JSONB, default []
- `status` — String(20), default "pending" (pending/reviewed/published/discarded)
- `category` — String(50), nullable
- `reviewed_by` — FK to users, nullable
- `published_post_id` — FK to posts, nullable
- `notes` — Text, nullable
- `scraped_at`, `reviewed_at`
- Index: (status, scraped_at DESC)

### 2.8 Child Model
**File:** `backend/app/models/child.py`
- `id` — UUID PK
- `user_id` — FK to users
- `name` — String(100), not null
- `date_of_birth` — Date, not null
- `gender` — String(1), nullable
- `photo_url` — Text, nullable
- `created_at`

### 2.9 Vaccination Model
**File:** `backend/app/models/vaccination.py`
- `id` — UUID PK
- `child_id` — FK to children (ON DELETE CASCADE)
- `vaccine_name` — String(100), not null
- `dose_number` — Integer, default 1
- `scheduled_date`, `administered_date` — Date, nullable
- `facility` — String(200), nullable
- `status` — String(20), default "pending" (pending/completed/overdue)
- `notes` — Text, nullable
- `created_at`

### 2.10 Milestone Model
**File:** `backend/app/models/milestone.py`
- `id` — UUID PK
- `child_id` — FK to children (ON DELETE CASCADE)
- `milestone_type` — String(50), not null
- `completed_at` — Date, nullable
- `notes` — Text, nullable
- `photo_url` — Text, nullable
- `created_at`

### 2.11 Notification Model
**File:** `backend/app/models/notification.py`
- `id` — UUID PK
- `user_id` — FK to users
- `type` — String(30) (comment_reply/post_like/expert_answer/system/vaccination_reminder)
- `title`, `body` — Text
- `data` — JSONB, default {}
- `is_read` — Boolean, default False
- `created_at`
- Index: (user_id, is_read, created_at DESC)

### 2.12 Models __init__.py
**File:** `backend/app/models/__init__.py`
- Import all models so Alembic sees them
- `from app.models.user import User` etc.

### 2.13 Alembic Migration
- Run `alembic revision --autogenerate -m "initial schema"`
- Run `alembic upgrade head` to apply
- Verify all tables created

## Acceptance Criteria
- [ ] All 11 model files created with proper types, constraints, relationships
- [ ] `backend/app/models/__init__.py` imports all models
- [ ] Initial Alembic migration generated
- [ ] `alembic upgrade head` creates all tables without errors
- [ ] Foreign keys, indexes, and constraints all in place
