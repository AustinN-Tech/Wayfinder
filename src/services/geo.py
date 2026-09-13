"""Rough continent classification from lat/lng.

This is a coarse bounding-box approximation, not a real GIS lookup - good
enough to tell "which of the 7 continents is this roughly in" for an
achievement, not accurate at borders (e.g. Russia/Turkey/Egypt near
continent boundaries may be misclassified). No external service or API key
needed, which matters since this runs on every item + every achievement
progress check.
"""

CONTINENTS = [
    "AFRICA",
    "ANTARCTICA",
    "ASIA",
    "EUROPE",
    "NORTH AMERICA",
    "OCEANIA",
    "SOUTH AMERICA",
]


def continent_for(latitude: float | None, longitude: float | None) -> str | None:
    """Best-effort continent for a coordinate pair, or None if not classifiable."""
    if latitude is None or longitude is None:
        return None
    lat, lng = latitude, longitude

    if lat <= -60:
        return "ANTARCTICA"
    # Australia / NZ / Pacific islands - checked early since it overlaps
    # Asia's longitude range but sits in the southern hemisphere.
    if -50 <= lat <= 0 and 110 <= lng <= 180:
        return "OCEANIA"
    if 35 <= lat <= 81 and -25 <= lng <= 45:
        return "EUROPE"
    if -35 <= lat <= 38 and -20 <= lng <= 52:
        return "AFRICA"
    if 5 <= lat <= 84 and -170 <= lng <= -50:
        return "NORTH AMERICA"
    if -56 <= lat <= 13 and -82 <= lng <= -34:
        return "SOUTH AMERICA"
    if -10 <= lat <= 81 and 40 <= lng <= 180:
        return "ASIA"

    return None
