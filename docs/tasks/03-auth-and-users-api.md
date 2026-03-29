# Task 03: Auth & Users API

## Summary
Implement Telegram authentication and user profile endpoints. Fork directly from Gebeya's auth system.

## Reference Files
- `/home/redman/gebeya/backend/app/api/v1/auth.py` — Auth endpoint pattern
- `/home/redman/gebeya/backend/app/api/deps.py` — Dependency injection pattern
- `/home/redman/gebeya/backend/app/api/v1/users.py` — User endpoints pattern

## Required Changes

### 3.1 Auth Dependencies
**File:** `backend/app/api/deps.py`
- `get_current_user()` — validate JWT from Authorization header, return User
- `get_current_user_optional()` — same but returns None if no token
- `get_admin_user()` — requires user.role == "admin"
- Type aliases: `CurrentUser`, `OptionalUser`, `AdminUser`
- Support both `Authorization: Bearer <jwt>` and `X-Telegram-Init-Data` headers (same as Gebeya)

### 3.2 Auth Endpoint
**File:** `backend/app/api/v1/auth.py`
- `POST /auth/telegram` — validate Telegram initData, create/update user, return JWT + user data
- Request: `{ init_data: str }`
- Response: `{ access_token, token_type, user }`
- On first login: create user with role="member" (auto-upgraded from reader)
- On subsequent login: update user's telegram info (name, photo, username)
- Follow Gebeya's pattern exactly

### 3.3 User Endpoints
**File:** `backend/app/api/v1/users.py`
- `GET /users/me` — return current user profile
- `PATCH /users/me` — update profile (first_name, last_name, city, parenting_role, language, children JSONB)
- `GET /users/{id}` — public user profile (hide email/phone, show post_count, reputation)
- Pydantic response models for each endpoint

### 3.4 Register Router
**File:** `backend/app/api/v1/router.py`
- Include auth_router at `/auth`
- Include users_router at `/users`

## Acceptance Criteria
- [ ] `POST /api/v1/auth/telegram` validates initData and returns JWT
- [ ] `GET /api/v1/users/me` returns authenticated user
- [ ] `PATCH /api/v1/users/me` updates profile fields
- [ ] `GET /api/v1/users/{id}` returns public profile
- [ ] Admin check works via `AdminUser` dependency
- [ ] Swagger docs show all endpoints
