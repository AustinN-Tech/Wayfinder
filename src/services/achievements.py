"""Achievement rule evaluation.

Each achievement is a row in the `achievements` table (code, name, description,
rule_type, threshold, sort_order, target_value) - adding a new one is an
INSERT, not a code change. `RULE_QUERIES` maps a rule_type to a query; a rule
is satisfied once its count reaches the achievement's threshold.

Every query takes at least `user_id` as its first param, so achievements are
earned per-account. Rule types that end in `_count` for a specific value
(e.g. "10 fossils logged", not just "10 items logged") also take
`target_value` as a second param - that's what lets one generic rule type
back both "Dino Hunter" (target_value="FOSSIL") and "Shiny!"
(target_value="GEOLOGY") without new code for each.

`distinct_continents` is the one rule that can't be expressed as a flat SQL
query - "which continent" isn't a stored column, so it's derived from each
item's lat/lng in Python (see geo.py) and handled as a special case.
"""

from services import database as db
from services import geo

RULE_QUERIES = {
    # Total items logged.
    "entry_count": "SELECT COUNT(*) FROM items WHERE user_id = ?",
    # How many of the two top-level categories (CULTURAL/NATURAL) appear.
    "distinct_categories": "SELECT COUNT(DISTINCT category) FROM items WHERE user_id = ?",
    # How many distinct sub-categories (ART, FOSSIL, etc.) appear.
    "distinct_sub_categories": "SELECT COUNT(DISTINCT sub_category) FROM items WHERE user_id = ?",
    # How many distinct time periods (bronze age, jurassic, etc.) appear.
    "distinct_time_periods": (
        "SELECT COUNT(DISTINCT time_period) FROM items WHERE user_id = ? AND time_period IS NOT NULL"
    ),
    # Items logged in one specific category - needs target_value (e.g. "CULTURAL").
    "category_count": "SELECT COUNT(*) FROM items WHERE user_id = ? AND category = ?",
    # Items logged in one specific sub-category - needs target_value (e.g. "FOSSIL").
    "sub_category_count": "SELECT COUNT(*) FROM items WHERE user_id = ? AND sub_category = ?",
    # Handled specially in _progress_for - see below. Kept here (mapped to
    # None) just so it shows up as a recognized rule_type, not a silently
    # skipped one.
    "distinct_continents": None,
}

# rule_types that need a target_value alongside user_id.
_TARGETED_RULE_TYPES = {"category_count", "sub_category_count"}

DEFAULT_ACHIEVEMENTS = [
    dict(
        code="first_find",
        name="First Find",
        description="Log your very first item.",
        rule_type="entry_count",
        threshold=1,
        sort_order=1,
    ),
    dict(
        code="small_collection",
        name="Small Collection",
        description="Log 5 items.",
        rule_type="entry_count",
        threshold=5,
        sort_order=2,
    ),
    dict(
        code="medium_collection",
        name="Medium Collection",
        description="Log 20 items.",
        rule_type="entry_count",
        threshold=20,
        sort_order=3,
    ),
    dict(
        code="large_collection",
        name="Large Collection",
        description="Log 50 items.",
        rule_type="entry_count",
        threshold=50,
        sort_order=4,
    ),
    dict(
        code="both_worlds",
        name="Both Worlds",
        description="Log at least one CULTURAL item and one NATURAL item.",
        rule_type="distinct_categories",
        threshold=2,
        sort_order=5,
    ),
    dict(
        code="time_traveler",
        name="Time Traveler",
        description="Log items from 3 different time periods.",
        rule_type="distinct_time_periods",
        threshold=3,
        sort_order=6,
    ),
    dict(
        code="dino_hunter",
        name="Dino Hunter",
        description="Discover 10 fossils.",
        rule_type="sub_category_count",
        threshold=10,
        sort_order=7,
        target_value="FOSSIL",
    ),
    dict(
        code="shiny",
        name="Shiny!",
        description="Discover 10 geology finds.",
        rule_type="sub_category_count",
        threshold=10,
        sort_order=8,
        target_value="GEOLOGY",
    ),
    dict(
        code="world_traveler",
        name="World Traveler",
        description="Log at least one item on every continent.",
        rule_type="distinct_continents",
        threshold=len(geo.CONTINENTS),
        sort_order=9,
    ),
]


def seed_defaults() -> None:
    """Idempotently insert the default achievement set."""
    for achievement in DEFAULT_ACHIEVEMENTS:
        db.seed_achievement(**achievement)


def _progress_for(user_id: str, rule_type: str, target_value: str | None) -> int:
    """Current progress count for one rule, for one user."""
    if rule_type == "distinct_continents":
        coordinates = db.get_user_coordinates(user_id)
        continents = {geo.continent_for(lat, lng) for lat, lng in coordinates}
        continents.discard(None)
        return len(continents)

    query = RULE_QUERIES.get(rule_type)
    if query is None:
        return 0
    params = (user_id, target_value) if rule_type in _TARGETED_RULE_TYPES else (user_id,)
    return db.run_count_query(query, params)


def evaluate_and_unlock(user_id: str) -> list[dict]:
    """Check every not-yet-unlocked achievement for this user and unlock any
    newly earned ones.

    Call this right after inserting an item. Returns the list of achievements
    unlocked by this call (empty if none) - feed that straight into the API
    response so the frontend can show a toast.
    """
    already_unlocked = db.get_unlocked_achievement_map(user_id)
    newly_unlocked = []

    for code, name, description, rule_type, threshold, _sort_order, target_value in db.get_all_achievements():
        if code in already_unlocked:
            continue
        progress = _progress_for(user_id, rule_type, target_value)
        if progress >= threshold:
            db.unlock_achievement(user_id, code)
            newly_unlocked.append({"code": code, "name": name, "description": description})

    return newly_unlocked


def get_all_with_progress(user_id: str) -> list[dict]:
    """All achievement definitions, annotated with this user's progress/unlocked state."""
    unlocked = db.get_unlocked_achievement_map(user_id)
    results = []

    for code, name, description, rule_type, threshold, sort_order, target_value in db.get_all_achievements():
        progress = _progress_for(user_id, rule_type, target_value)
        results.append({
            "code": code,
            "name": name,
            "description": description,
            "rule_type": rule_type,
            "threshold": threshold,
            "sort_order": sort_order,
            "progress": min(progress, threshold),
            "unlocked": code in unlocked,
            "unlocked_at": unlocked.get(code),
        })

    return results
