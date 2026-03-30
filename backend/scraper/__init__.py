"""Reddit scraper and AI translation pipeline for YeWaledoch."""

# Subreddit sources with per-subreddit configuration
SUBREDDIT_SOURCES = [
    {"name": "Parenting", "min_upvotes": 300, "limit": 20},
    {"name": "Mommit", "min_upvotes": 200, "limit": 10},
    {"name": "daddit", "min_upvotes": 200, "limit": 10},
    {"name": "toddlers", "min_upvotes": 200, "limit": 10},
]

# Maximum number of top comments to fetch per qualifying post
MAX_COMMENTS_PER_POST = 5

# Seconds between Reddit API requests (respect rate limits)
REQUEST_DELAY = 2.0

# Reddit API user agent
USER_AGENT = "YeWaledoch/1.0 (content curation)"
