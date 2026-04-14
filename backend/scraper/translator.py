"""AI translator — translate Reddit content to Amharic.

Supports multiple LLM providers:
  - anthropic  (uses anthropic library)
  - openai     (uses openai library, standard OpenAI API)
  - deepseek   (uses openai library with DeepSeek base URL)
  - custom     (uses openai library with admin-supplied base URL)
"""

import json
from dataclasses import dataclass

import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)

# Valid categories
VALID_CATEGORIES = {
    "pregnancy", "newborn", "toddler", "school_age", "teens",
    "health", "nutrition", "dads", "mental_health", "special_needs",
    "education", "fun_activities",
}

# Default models per provider (shown as hints in the admin UI)
PROVIDER_DEFAULT_MODELS = {
    "anthropic": "claude-sonnet-4-20250514",
    "openai": "gpt-4o",
    "deepseek": "deepseek-chat",
    "custom": "",
}

# Default base URLs for OpenAI-compatible providers
PROVIDER_DEFAULT_BASE_URLS = {
    "deepseek": "https://api.deepseek.com/v1",
}

TRANSLATION_SYSTEM_PROMPT = """\
You are a professional translator specializing in English to Amharic (አማርኛ) translation \
for Ethiopian parenting content. Your translations must be culturally adapted for Ethiopian parents.

## Cultural Adaptation Rules

1. **Food references**: Convert Western food to Ethiopian equivalents:
   - Baby cereal/oatmeal → ገንፎ (genfo)
   - Porridge/grits → ቂንጬ (qinche)
   - Lentil soup → ሽሮ (shiro)
   - Keep specific brand names but add Ethiopian alternatives in parentheses

2. **Currency**: Convert USD to ETB approximations (1 USD ≈ 130 ETB)

3. **Healthcare**: Replace American healthcare references with Ethiopian context:
   - "pediatrician" → የሕፃናት ሐኪም
   - "daycare" → ማቆያ
   - "preschool" → መዋዕለ ሕፃናት
   - "health insurance" → የጤና ኢንሹራንስ
   - "ER/emergency room" → ድንገተኛ ክፍል

4. **Education**: Replace American school references with Ethiopian context:
   - "elementary school" → የመጀመሪያ ደረጃ ት/ቤት
   - "middle school" → መካከለኛ ደረጃ ት/ቤት
   - "high school" → ሁለተኛ ደረጃ ት/ቤት

5. **Tone**: Keep the emotional tone intact — supportive, warm, community-oriented
6. **Style**: Write natural Amharic, NOT literal/word-for-word translation
7. **Engagement**: Add a discussion prompt at the end — an Amharic question to spark community engagement

## Category Options
pregnancy, newborn, toddler, school_age, teens, health, nutrition, dads, mental_health, special_needs, education, fun_activities
"""

TRANSLATION_USER_PROMPT = """\
Translate the following Reddit parenting post and its comments from English to Amharic.

**Title:** {title}

**Body:**
{body}

**Top Comments:**
{comments}

---

Return your response as valid JSON with exactly this structure:
{{
  "translated_title": "...",
  "translated_body": "... (include a discussion prompt question at the end)",
  "translated_comments": [
    {{"author": "original_author", "body": "translated comment in Amharic"}},
    ...
  ],
  "suggested_category": "one of: pregnancy, newborn, toddler, school_age, teens, health, nutrition, dads, mental_health, special_needs, education, fun_activities"
}}

Return ONLY the JSON object, no other text.
"""


@dataclass
class LLMConfig:
    """Provider configuration passed to translate_post()."""

    provider: str  # "anthropic" | "openai" | "deepseek" | "custom"
    api_key: str
    model: str
    base_url: str | None = None  # For OpenAI-compatible providers

    @classmethod
    def from_env(cls) -> "LLMConfig | None":
        """Build config from environment variable (Anthropic only fallback)."""
        if not settings.ANTHROPIC_API_KEY:
            return None
        return cls(
            provider="anthropic",
            api_key=settings.ANTHROPIC_API_KEY,
            model=PROVIDER_DEFAULT_MODELS["anthropic"],
        )


def _parse_translation_response(response_text: str) -> dict | None:
    """Parse JSON from LLM response, stripping markdown code fences if present."""
    text = response_text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1])

    try:
        result = json.loads(text)
    except json.JSONDecodeError as e:
        logger.error("translation_json_parse_error", error=str(e))
        return None

    if not all(k in result for k in ("translated_title", "translated_body")):
        logger.error("translation_missing_fields", keys=list(result.keys()))
        return None

    if result.get("suggested_category") not in VALID_CATEGORIES:
        result["suggested_category"] = "health"

    if not isinstance(result.get("translated_comments"), list):
        result["translated_comments"] = []

    return result


async def _translate_with_anthropic(
    user_prompt: str,
    config: LLMConfig,
) -> str:
    """Call Anthropic API and return the raw text response."""
    import anthropic

    client = anthropic.AsyncAnthropic(api_key=config.api_key)
    message = await client.messages.create(
        model=config.model,
        max_tokens=4096,
        system=TRANSLATION_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return message.content[0].text


async def _translate_with_openai_compatible(
    user_prompt: str,
    config: LLMConfig,
) -> str:
    """Call any OpenAI-compatible API (OpenAI, DeepSeek, custom) and return raw text."""
    from openai import AsyncOpenAI

    base_url = config.base_url or PROVIDER_DEFAULT_BASE_URLS.get(config.provider)
    client = AsyncOpenAI(
        api_key=config.api_key,
        base_url=base_url,  # None means default OpenAI endpoint
    )
    response = await client.chat.completions.create(
        model=config.model,
        max_tokens=4096,
        messages=[
            {"role": "system", "content": TRANSLATION_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    )
    return response.choices[0].message.content or ""


async def translate_post(
    title: str,
    body: str,
    comments: list[dict],
    llm_config: LLMConfig | None = None,
) -> dict | None:
    """
    Translate a Reddit post and its comments to Amharic.

    Args:
        title: Original English title
        body: Original English body text
        comments: List of comment dicts with 'author' and 'body' keys
        llm_config: Provider configuration. If None, falls back to ANTHROPIC_API_KEY env var.

    Returns:
        Dict with translated_title, translated_body, translated_comments,
        suggested_category. Returns None if translation fails or no config available.
    """
    config = llm_config or LLMConfig.from_env()
    if config is None or not config.api_key:
        logger.warning("llm_config_not_available")
        return None

    comments_text = "\n".join(
        f"- u/{c['author']}: {c['body']}" for c in comments
    ) if comments else "(no comments)"

    user_prompt = TRANSLATION_USER_PROMPT.format(
        title=title,
        body=body,
        comments=comments_text,
    )

    try:
        if config.provider == "anthropic":
            raw = await _translate_with_anthropic(user_prompt, config)
        elif config.provider in ("openai", "deepseek", "custom"):
            raw = await _translate_with_openai_compatible(user_prompt, config)
        else:
            logger.error("unknown_llm_provider", provider=config.provider)
            return None

        result = _parse_translation_response(raw)
        if result:
            logger.info(
                "translation_complete",
                provider=config.provider,
                model=config.model,
                title_length=len(result["translated_title"]),
                body_length=len(result["translated_body"]),
                comments_translated=len(result["translated_comments"]),
                category=result["suggested_category"],
            )
        return result

    except Exception as e:
        logger.error(
            "translation_failed",
            provider=config.provider,
            error=str(e),
        )
        return None
