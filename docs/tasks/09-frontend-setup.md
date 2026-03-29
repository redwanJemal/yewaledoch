# Task 09: Frontend Setup — React + Telegram Mini App Foundation

## Summary
Set up the Telegram Mini App frontend: React 18, Vite, Tailwind, Telegram SDK, routing, auth, and API client. Fork patterns from Gebeya.

## Reference Files (READ THESE FIRST)
- `/home/redman/gebeya/frontend/package.json` — Dependencies
- `/home/redman/gebeya/frontend/vite.config.ts` — Vite configuration
- `/home/redman/gebeya/frontend/tailwind.config.js` — Tailwind with Telegram theme vars
- `/home/redman/gebeya/frontend/src/App.tsx` — Tab navigation, routing, deep links
- `/home/redman/gebeya/frontend/src/lib/telegram.tsx` — Telegram SDK context + hooks
- `/home/redman/gebeya/frontend/src/lib/api.ts` — API client pattern
- `/home/redman/gebeya/frontend/src/hooks/useAuth.ts` — Auth state management

## Required Changes

### 9.1 Package Setup
**File:** `frontend/package.json`
Same deps as Gebeya:
- react, react-dom, react-router-dom
- @tanstack/react-query, zustand
- @telegram-apps/sdk-react (1.1.3)
- lucide-react, sonner
- Dev: vite, typescript, tailwindcss, autoprefixer, postcss, @types/*

### 9.2 Vite Config
**File:** `frontend/vite.config.ts`
- React plugin
- Path alias: `@` → `./src`
- Dev server: port 5173
- Proxy `/api` → `http://localhost:8012`

### 9.3 Tailwind Config
**File:** `frontend/tailwind.config.js`
- Copy Gebeya's Telegram theme CSS variable integration
- Same animations (slide-in, slide-out, slide-up)
- Same color palette mapping to tg-* vars

### 9.4 Telegram SDK Context
**File:** `frontend/src/lib/telegram.tsx`
- Copy from Gebeya — TelegramProvider, useTelegram hook
- Back button, main button hooks
- Haptic feedback helpers
- Theme color injection

### 9.5 API Client
**File:** `frontend/src/lib/api.ts`
- Centralized request function with Bearer token auth
- TypeScript interfaces for all models:
  - User, Post, Comment, Like, Save, Notification, Child, Vaccination, Milestone
  - PostFeedParams, PostCreateRequest, CommentCreateRequest
- API modules:
  - `authApi` — telegram login
  - `usersApi` — me, update, getProfile
  - `postsApi` — feed, detail, create, update, delete, like, save, report
  - `commentsApi` — list, create, update, delete, like, report
  - `notificationsApi` — list, markRead, markAllRead
  - `childrenApi` — CRUD, vaccinations, milestones
  - `resourcesApi` — vaccines, milestones, categories
  - `adminApi` — dashboard, drafts, users, reports, scraper (only used by admin panel)

### 9.6 i18n Setup
**File:** `frontend/src/lib/i18n.ts`
- Simple translation system (key-value object, not a heavy library)
- Two language objects: `am` (Amharic) and `en` (English)
- `useTranslation()` hook that reads user's language preference
- Keys for: navigation labels, common buttons, post types, categories, empty states, error messages
- Default language: Amharic (`am`)

### 9.7 Auth Hook
**File:** `frontend/src/hooks/useAuth.ts`
- Fork from Gebeya's useAuth
- Same flow: check existing token → validate → or login via Telegram initData
- Dev mode mock user support
- Expose: user, isLoading, isAuthenticated, error, refreshUser

### 9.8 App Shell with Tab Navigation
**File:** `frontend/src/App.tsx`
- Tab-based navigation (same pattern as Gebeya):
  - 🏠 መነሻ (Home) — content feed
  - 📂 ርዕሶች (Topics) — browse by category
  - ➕ ጻፍ (Write) — create post (if contributor+)
  - 🔔 ማሳወቂያ (Alerts) — notifications
  - 👤 እኔ (Me) — profile
- Page-based routing overlay for detail views (PostDetail, Profile, Settings, etc.)
- Deep link support: `?startapp=p_{postId}` opens post detail
- Telegram Mini App detection (block non-Telegram in prod)
- Unread notification badge polling
- Bottom navigation bar

### 9.9 Entry Files
- `frontend/src/main.tsx` — React root, QueryClientProvider, TelegramProvider
- `frontend/src/styles/globals.css` — Tailwind imports, Telegram CSS vars
- `frontend/index.html` — HTML entry
- `frontend/tsconfig.json`, `frontend/postcss.config.js`

### 9.10 Frontend Dockerfile
**File:** `frontend/Dockerfile`
- Node 20-alpine, npm ci, npm run build, serve with nginx

## Acceptance Criteria
- [ ] `cd frontend && npm install && npm run dev` starts without errors
- [ ] Telegram SDK initializes (or falls back in dev mode)
- [ ] Auth flow works (Telegram login → JWT → stored)
- [ ] Tab navigation renders with 5 tabs
- [ ] API client can make authenticated requests
- [ ] i18n switches between Amharic and English
- [ ] Deep links parse correctly
- [ ] `npm run build` succeeds without TypeScript errors
