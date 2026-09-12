import os
import json
import logging

from google import genai
from google.genai import errors, types

from core.models import (
    CATEGORIES,
    CULTURAL_SUBCATEGORIES,
    NATURAL_SUBCATEGORIES,
    CULTURAL_TIME_PERIODS,
    NATURAL_TIME_PERIODS,
)

logger = logging.getLogger(__name__)

MODEL_NAME = os.environ.get("GEMINI_MODEL", "gemini-3.1-flash-lite")


class QuotaExceededError(RuntimeError):
    """Raised when Gemini's rate limit or daily quota has been hit."""

ALL_SUBCATEGORIES = sorted(set(CULTURAL_SUBCATEGORIES) | set(NATURAL_SUBCATEGORIES))
ALL_TIME_PERIODS = CULTURAL_TIME_PERIODS + NATURAL_TIME_PERIODS

_client = None


def _get_client():
    global _client
    if _client is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY environment variable is not set")
        _client = genai.Client(api_key=api_key)
    return _client


SUGGESTION_SCHEMA = types.Schema(
    type=types.Type.OBJECT,
    properties={
        "suggestions": types.Schema(
            type=types.Type.ARRAY,
            min_items=3,
            max_items=3,
            items=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "name": types.Schema(type=types.Type.STRING),
                    "category": types.Schema(type=types.Type.STRING, enum=CATEGORIES),
                    "sub_category": types.Schema(type=types.Type.STRING, enum=ALL_SUBCATEGORIES),
                    "time_period": types.Schema(type=types.Type.STRING, enum=ALL_TIME_PERIODS),
                    "description": types.Schema(type=types.Type.STRING),
                    "confidence": types.Schema(type=types.Type.NUMBER),
                },
                required=["name", "category", "sub_category", "time_period", "description", "confidence"],
            ),
        )
    },
    required=["suggestions"],
)

PROMPT = f"""You are helping catalog cultural and natural heritage items (artifacts, paintings,
monuments, fossils, plants, animals, landmarks, etc.) from a photo.

Look at the image and propose exactly 3 distinct, plausible identifications, ordered from most to
least likely. For each one give:
- name: a short specific name/title for the item
- category: one of {CATEGORIES}
- sub_category: the matching sub-category — CULTURAL items use one of {CULTURAL_SUBCATEGORIES},
  NATURAL items use one of {NATURAL_SUBCATEGORIES}
- time_period: your best guess at the era, chosen from a fixed list — CULTURAL items use one of
  {CULTURAL_TIME_PERIODS}, NATURAL items use one of {NATURAL_TIME_PERIODS}
- description: 1-2 sentences describing what it is
- confidence: your confidence in this specific identification, from 0.0 to 1.0

Return only the structured data.
"""


def analyze_image(image_bytes, mime_type):
    """Ask Gemini for 3 candidate classifications/descriptions for an item photo."""
    client = _get_client()
    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                PROMPT,
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=SUGGESTION_SCHEMA,
            ),
        )
    except errors.ClientError as exc:
        if getattr(exc, "code", None) == 429:
            logger.warning("Gemini quota/rate limit hit: %s", exc)
            raise QuotaExceededError(
                "Gemini API quota exceeded - wait a bit and try again, or check "
                "your plan/billing at https://ai.google.dev/gemini-api/docs/rate-limits"
            ) from exc
        logger.error("Gemini client error: %s", exc)
        raise ValueError(f"Gemini request failed: {exc}") from exc
    except errors.APIError as exc:
        logger.error("Gemini API error: %s", exc)
        raise ValueError(f"Gemini request failed: {exc}") from exc

    try:
        parsed = json.loads(response.text)
    except (json.JSONDecodeError, TypeError) as exc:
        logger.error("Failed to parse Gemini response: %s", response.text)
        raise ValueError("Gemini returned an unparseable response") from exc

    return parsed.get("suggestions", [])
