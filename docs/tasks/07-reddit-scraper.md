# Task 07: Reddit Scraper & AI Translation Pipeline

## Summary
Build the automated content pipeline: scrape top posts from parenting subreddits, translate to Amharic via AI, store as drafts for admin review.

## Required Changes

### 7.1 Reddit Scraper
**File:** `backend/scraper/reddit_scraper.py`

- Fetch posts from Reddit's public JSON API (no auth needed):
  - `https://www.reddit.com/r/Parenting/top/.json?t=day&limit=20`
  - `https://www.reddit.com/r/Mommit/top/.json?t=day&limit=10`
  - `https://www.reddit.com/r/daddit/top/.json?t=day&limit=10`
  - `https://www.reddit.com/r/toddlers/top/.json?t=day&limit=10`
- Set User-Agent header: `YeWaledoch/1.0 (content curation)`
- Filter posts: minimum upvotes threshold (configurable, default 300)
- Extract per post: title, selftext (body), author, upvotes, num_comments, permalink, subreddit, link_flair_text
- Fetch top 5 comments per qualifying post (fetch `{permalink}.json`)
- Skip posts that already exist in scraped_drafts (check reddit_post_id)
- Handle rate limiting (1 request per 2 seconds)
- Use httpx async client

### 7.2 AI Translator
**File:** `backend/scraper/translator.py`

- Translate English content to Amharic using Claude API (Anthropic SDK)
- Translation prompt must include cultural adaptation rules:
  - Convert Western food → Ethiopian equivalents (genfo, qinche, shiro)
  - Convert USD → ETB approximations
  - Replace American school/healthcare references with Ethiopian context
  - Replace "pediatrician" → "የሕፃናት ሐኪም"
  - Replace "daycare" → "ማቆያ"
  - Keep emotional tone intact
  - Make it natural Amharic, not literal translation
  - Add a discussion prompt at the end (Amharic question to spark engagement)
- Translate: title, body, and top comments
- Return structured result: { translated_title, translated_body, translated_comments, suggested_category }
- Fallback: if Anthropic API fails, log error and store with original English (admin can translate manually)
- Use environment variable `ANTHROPIC_API_KEY`

### 7.3 Pipeline Orchestrator
**File:** `backend/scraper/scheduler.py`

- `run_pipeline()` — main function:
  1. Call scraper to fetch new posts
  2. For each new post, translate via AI
  3. Save to `scraped_drafts` table with status="pending"
  4. Send Telegram notification to admin: "📝 {count} new drafts ready for review"
- Can be run:
  - Manually via `python -m scraper.scheduler`
  - Via admin API (`POST /admin/scraper/run`)
  - Via cron job
- Log all activity with structlog

### 7.4 Configuration
**File:** `backend/scraper/__init__.py`

Scraper config constants:
```python
SUBREDDIT_SOURCES = [
    {"name": "Parenting", "min_upvotes": 300, "limit": 20},
    {"name": "Mommit", "min_upvotes": 200, "limit": 10},
    {"name": "daddit", "min_upvotes": 200, "limit": 10},
    {"name": "toddlers", "min_upvotes": 200, "limit": 10},
]
MAX_COMMENTS_PER_POST = 5
REQUEST_DELAY = 2.0  # seconds between Reddit requests
```

### 7.5 Seed Data
**File:** `backend/seed_data/categories.json`
```json
[
  {"slug": "pregnancy", "name_am": "እርግዝና", "name_en": "Pregnancy", "icon": "🤰"},
  {"slug": "newborn", "name_am": "ሕፃናት", "name_en": "Newborn (0-1yr)", "icon": "👶"},
  {"slug": "toddler", "name_am": "ትንንሽ ልጆች", "name_en": "Toddler (1-3yr)", "icon": "���"},
  {"slug": "school_age", "name_am": "ት/ቤት ዕድሜ", "name_en": "School Age (4-12)", "icon": "📚"},
  {"slug": "teens", "name_am": "ታዳጊዎች", "name_en": "Teens (13-18)", "icon": "🧑"},
  {"slug": "health", "name_am": "ጤና", "name_en": "Health", "icon": "🏥"},
  {"slug": "nutrition", "name_am": "ምግብ", "name_en": "Nutrition", "icon": "🍲"},
  {"slug": "dads", "name_am": "አባቶች", "name_en": "Dads", "icon": "👨"},
  {"slug": "mental_health", "name_am": "የአእምሮ ጤና", "name_en": "Mental Health", "icon": "🧠"},
  {"slug": "special_needs", "name_am": "ልዩ ፍላጎት", "name_en": "Special Needs", "icon": "��"},
  {"slug": "education", "name_am": "ትምህርት", "name_en": "Education", "icon": "����"},
  {"slug": "fun_activities", "name_am": "መዝናኛ", "name_en": "Fun & Activities", "icon": "🎨"}
]
```

## Acceptance Criteria
- [ ] `python -m scraper.scheduler` fetches Reddit posts, translates, and saves drafts
- [ ] Duplicate posts are skipped (reddit_post_id uniqueness)
- [ ] Translation produces natural Amharic with cultural adaptation
- [ ] Admin receives Telegram notification with draft count
- [ ] Rate limiting respects Reddit's guidelines (2s between requests)
- [ ] Graceful error handling: API failures don't crash the pipeline
- [ ] Categories seed data file is created
