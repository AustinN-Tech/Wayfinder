import os
import json
import time
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


class TransientModelError(RuntimeError):
    """The model was reachable but couldn't answer right now - overloaded,
    rate limited, or timed out. Worth retrying; everything else isn't."""


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


# Most 503s from an overloaded model clear within a second or two, so these
# retries absorb the majority of them before anyone sees an error.
MAX_ATTEMPTS = 3
BACKOFF_SECONDS = (1, 2, 4)


def _is_transient(exc):
    """Overloaded, rate limited or timed out - not a request we got wrong."""
    if isinstance(exc, errors.ServerError):
        return True
    if isinstance(exc, errors.ClientError) and getattr(exc, "code", None) == 429:
        return True
    # the SDK surfaces transport timeouts from whatever HTTP client it uses,
    # so match on the name rather than importing httpx just for this
    return "timeout" in type(exc).__name__.lower()


def _generate(client, image_bytes, mime_type):
    return client.models.generate_content(
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


def analyze_image(image_bytes, mime_type):
    """Ask Gemini for 3 candidate classifications/descriptions for an item photo.

    Transient failures are retried with exponential backoff; anything else
    (a malformed request, a bad key) fails on the first attempt, since
    retrying it would only waste the caller's time.
    """
    client = _get_client()
    response = None

    for attempt in range(MAX_ATTEMPTS):
        try:
            response = _generate(client, image_bytes, mime_type)
            break
        except Exception as exc:
            if not _is_transient(exc):
                if isinstance(exc, errors.ClientError) and getattr(exc, "code", None) == 429:
                    raise QuotaExceededError("Gemini API quota exceeded") from exc
                logger.error("Gemini request failed: %s", exc)
                raise ValueError(f"Gemini request failed: {exc}") from exc

            last = attempt == MAX_ATTEMPTS - 1
            logger.warning(
                "Gemini unavailable (attempt %s/%s): %s", attempt + 1, MAX_ATTEMPTS, exc
            )
            if last:
                raise TransientModelError("The model is unavailable right now") from exc
            time.sleep(BACKOFF_SECONDS[attempt])

    try:
        parsed = json.loads(response.text)
    except (json.JSONDecodeError, TypeError) as exc:
        logger.error("Failed to parse Gemini response: %s", response.text)
        raise ValueError("Gemini returned an unparseable response") from exc

    return parsed.get("suggestions", [])
