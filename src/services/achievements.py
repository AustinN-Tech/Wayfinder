"""Achievement rule evaluation.

Each achievement is a row in the `achievements` table (code, name, description,
rule_type, threshold, sort_order) - adding a new one is an INSERT, not a code
change. `RULE_QUERIES` maps a rule_type to a single COUNT(...) query with no
params; a rule is satisfied once that count reaches the achievement's
threshold.

DEFAULT_ACHIEVEMENTS below are placeholders to prove the engine works end to
end - swap them out for whatever you actually want once you've decided.
"""

from services import database as db

# Every query is scoped to one user via a `user_id = ?` param, so achievements
# are earned per-account rather than shared across everyone using the app.
RULE_QUERIES = {
    # Total items logged.
    "entry_count": "SELECT COUNT(*) FROM items WHERE user_id = ?",
    # Items that have a photo attached (every item currently requires one,
    # but this stays useful if that ever becomes optional).
    "with_photo": "SELECT COUNT(*) FROM items WHERE user_id = ? AND image_path IS NOT NULL",
    # How many of the two top-level categories (CULTURAL/NATURAL) appear.
    "distinct_categories": "SELECT COUNT(DISTINCT category) FROM items WHERE user_id = ?",
    # How many distinct sub-categories (ART, FOSSIL, etc.) appear.
    "distinct_sub_categories": "SELECT COUNT(DISTINCT sub_category) FROM items WHERE user_id = ?",
    # How many distinct time periods (bronze age, jurassic, etc.) appear.
    "distinct_time_periods": (
        "SELECT COUNT(DISTINCT time_period) FROM items WHERE user_id = ? AND time_period IS NOT NULL"
    ),
}

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
        code="getting_serious",
        name="Getting Serious",
        description="Log 10 items.",
        rule_type="entry_count",
        threshold=10,
        sort_order=2,
    ),
    dict(
        code="both_worlds",
        name="Both Worlds",
        description="Log at least one CULTURAL item and one NATURAL item.",
        rule_type="distinct_categories",
        threshold=2,
        sort_order=3,
    ),
    dict(
        code="time_traveler",
        name="Time Traveler",
        description="Log items from 3 different time periods.",
        rule_type="distinct_time_periods",
        threshold=3,
        sort_order=4,
    ),
]


def seed_defaults() -> None:
    """Idempotently insert the placeholder achievement set."""
    for achievement in DEFAULT_ACHIEVEMENTS:
        db.seed_achievement(**achievement)


def evaluate_and_unlock(user_id: str) -> list[dict]:
    """Check every not-yet-unlocked achievement for this user and unlock any
    newly earned ones.

    Call this right after inserting an item. Returns the list of achievements
    unlocked by this call (empty if none) - feed that straight into the API
    response so the frontend can show a toast.
    """
    already_unlocked = db.get_unlocked_achievement_map(user_id)
    newly_unlocked = []

    for code, name, description, rule_type, threshold, _sort_order in db.get_all_achievements():
        if code in already_unlocked:
            continue
        query = RULE_QUERIES.get(rule_type)
        if query is None:
            continue
        progress = db.run_count_query(query, (user_id,))
        if progress >= threshold:
            db.unlock_achievement(user_id, code)
            newly_unlocked.append({"code": code, "name": name, "description": description})

    return newly_unlocked


def get_all_with_progress(user_id: str) -> list[dict]:
    """All achievement definitions, annotated with this user's progress/unlocked state."""
    unlocked = db.get_unlocked_achievement_map(user_id)
    results = []

    for code, name, description, rule_type, threshold, sort_order in db.get_all_achievements():
        query = RULE_QUERIES.get(rule_type)
        progress = db.run_count_query(query, (user_id,)) if query else 0
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
