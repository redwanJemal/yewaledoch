"""AI translator — translate Reddit content to Amharic using Claude API."""

import json

import anthropic
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)

# Valid categories for suggested_category
VALID_CATEGORIES = {
    "pregnancy", "newborn", "toddler", "school_age", "teens",
    "health", "nutrition", "dads", "mental_health", "special_needs",
    "education", "fun_activities",
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


async def translate_post(
    title: str,
    body: str,
    comments: list[dict],
) -> dict | None:
    """
    Translate a Reddit post and its comments to Amharic using Claude API.

    Args:
        title: Original English title
        body: Original English body text
        comments: List of comment dicts with 'author' and 'body' keys

    Returns:
        Dict with translated_title, translated_body, translated_comments,
        suggested_category. Returns None if translation fails.
    """
    if not settings.ANTHROPIC_API_KEY:
        logger.warning("anthropic_api_key_not_set")
        return None

    # Format comments for the prompt
    comments_text = "\n".join(
        f"- u/{c['author']}: {c['body']}" for c in comments
    ) if comments else "(no comments)"

    user_prompt = TRANSLATION_USER_PROMPT.format(
        title=title,
        body=body,
        comments=comments_text,
    )

    try:
        client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        message = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=TRANSLATION_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )

        response_text = message.content[0].text.strip()

        # Parse JSON response — handle possible markdown code fences
        if response_text.startswith("```"):
            # Strip ```json ... ``` wrapper
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1])

        result = json.loads(response_text)

        # Validate required fields
        if not all(k in result for k in ("translated_title", "translated_body")):
            logger.error("translation_missing_fields", keys=list(result.keys()))
            return None

        # Validate suggested category
        if result.get("suggested_category") not in VALID_CATEGORIES:
            result["suggested_category"] = "health"  # safe default

        # Ensure translated_comments is a list
        if not isinstance(result.get("translated_comments"), list):
            result["translated_comments"] = []

        logger.info(
            "translation_complete",
            title_length=len(result["translated_title"]),
            body_length=len(result["translated_body"]),
            comments_translated=len(result["translated_comments"]),
            category=result["suggested_category"],
        )

        return result

    except json.JSONDecodeError as e:
        logger.error("translation_json_parse_error", error=str(e))
        return None
    except anthropic.APIError as e:
        logger.error("anthropic_api_error", error=str(e))
        return None
    except Exception as e:
        logger.error("translation_unexpected_error", error=str(e))
        return None
