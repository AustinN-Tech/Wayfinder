"""Offline continent lookup for discovery coordinates.

Uses bundled Natural Earth land and geographic-region polygons. These are
generalized maps: tiny islands and locations very close to coasts/borders may
be unresolved. Unknown coordinates never contribute achievement progress.
"""

import json
import math
from functools import lru_cache
from pathlib import Path

CONTINENTS = frozenset({
    "Africa", "Antarctica", "Asia", "Europe", "North America", "South America", "Oceania",
})
DATA_PATH = Path(__file__).with_name("data") / "world_regions.json"


def _polygons(geometry):
    polygons = geometry["coordinates"]
    if geometry["type"] == "Polygon":
        polygons = [polygons]
    elif geometry["type"] != "MultiPolygon":
        raise ValueError("Unsupported geography geometry")
    for rings in polygons:
        exterior = rings[0]
        xs, ys = zip(*exterior)
        yield (min(xs), min(ys), max(xs), max(ys)), rings


@lru_cache(maxsize=1)
def _load_polygons():
    with DATA_PATH.open(encoding="utf-8-sig") as source:
        data = json.load(source)
    land = [polygon for geometry in data["land"] for polygon in _polygons(geometry)]
    regions = [
        (region["continent"], polygon)
        for region in data["regions"] if region["continent"] in CONTINENTS
        for polygon in _polygons(region["geometry"])
    ]
    return land, regions


def _inside_ring(x, y, ring):
    inside = False
    previous_x, previous_y = ring[-1]
    for current_x, current_y in ring:
        cross = (x - previous_x) * (current_y - previous_y) - (y - previous_y) * (current_x - previous_x)
        if (abs(cross) < 1e-10
                and min(previous_x, current_x) <= x <= max(previous_x, current_x)
                and min(previous_y, current_y) <= y <= max(previous_y, current_y)):
            return True
        if (current_y > y) != (previous_y > y):
            intersection = current_x + (y - current_y) * (previous_x - current_x) / (previous_y - current_y)
            if x < intersection:
                inside = not inside
        previous_x, previous_y = current_x, current_y
    return inside


def _contains(polygon, longitude, latitude):
    (west, south, east, north), rings = polygon
    if not (west <= longitude <= east and south <= latitude <= north):
        return False
    return (_inside_ring(longitude, latitude, rings[0])
            and not any(_inside_ring(longitude, latitude, hole) for hole in rings[1:]))


def continent_for_coordinates(latitude: float | None, longitude: float | None) -> str | None:
    """Resolve a valid land coordinate; missing, invalid, and ocean points return None."""
    if any(type(value) not in (int, float) or not math.isfinite(value)
           for value in (latitude, longitude)):
        return None
    if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
        return None
    land, regions = _load_polygons()
    if not any(_contains(polygon, longitude, latitude) for polygon in land):
        return None
    for continent, polygon in regions:
        if _contains(polygon, longitude, latitude):
            return continent
    return None
