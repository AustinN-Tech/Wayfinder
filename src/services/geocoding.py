"""Turn discovery coordinates into a place name, via OpenStreetMap's Nominatim.

Looked up once, when an item is saved, and stored on the row - so browsing the
journal never waits on the network, and Nominatim never sees more than one
request per find. Their usage policy caps callers at a request a second and
asks that we identify ourselves, which the User-Agent below does.

Every failure here is soft: a find with no place name still has its
coordinates, and the UI falls back to those.
"""

import json
import logging
import urllib.parse
import urllib.request

logger = logging.getLogger(__name__)

ENDPOINT = "https://nominatim.openstreetmap.org/reverse"
USER_AGENT = "Wayfinder/1.0 (heritage journalling app)"
TIMEOUT_SECONDS = 5

# Town rather than street level - "Lubbock, Texas, United States", not a
# house number.
ZOOM = 10

# Nominatim names the most local thing it can, so the first of these a place
# has is the one worth showing.
LOCALITY_KEYS = ("city", "town", "village", "hamlet", "suburb", "municipality", "county")


def _format(address: dict) -> str | None:
    """City, region, country - skipping whichever of those a place lacks.

    Repeats are dropped: plenty of places sit in a region named after them
    ("Nairobi, Nairobi, Kenya"), and saying it twice reads like a bug.
    """
    locality = next((address[key] for key in LOCALITY_KEYS if address.get(key)), None)
    region = address.get("state") or address.get("region")
    country = address.get("country")

    parts = []
    for part in (locality, region, country):
        if part and part.casefold() not in {seen.casefold() for seen in parts}:
            parts.append(part)
    return ", ".join(parts) or None


def place_for_coordinates(latitude: float | None, longitude: float | None) -> str | None:
    if latitude is None or longitude is None:
        return None

    query = urllib.parse.urlencode({
        "lat": latitude,
        "lon": longitude,
        "format": "jsonv2",
        "zoom": ZOOM,
        "addressdetails": 1,
    })
    # Without this Nominatim answers in the local language - Tokyo comes back
    # as 杉並区, 日本 - which the rest of the journal isn't written in.
    request = urllib.request.Request(
        f"{ENDPOINT}?{query}",
        headers={"User-Agent": USER_AGENT, "Accept-Language": "en"},
    )

    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            payload = json.load(response)
    except Exception:
        # Offline, rate-limited, slow, malformed - none of it should cost
        # someone the find they just catalogued.
        logger.warning("Reverse geocoding failed for %s, %s", latitude, longitude, exc_info=True)
        return None

    return _format(payload.get("address") or {})
