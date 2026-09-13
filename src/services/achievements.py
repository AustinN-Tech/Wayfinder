"""Evaluate the hackathon achievement catalog using local user-owned discoveries."""

import logging

from core.models import Achievement
from services import database as db
from services import geography

logger = logging.getLogger(__name__)

# IDs establish order for a fresh database. Seeding matches by code and preserves
# existing IDs so user_achievements never gets attached to a different definition.
DEFAULT_ACHIEVEMENTS = [
    Achievement(1, "first_find", "First Find", "entry_count", 1,
                "Log your very first item."),
    Achievement(2, "small_collection", "Small Collection", "entry_count", 5,
                "Log 5 items."),
    Achievement(3, "medium_collection", "Medium Collection", "entry_count", 20,
                "Log 20 items."),
    Achievement(4, "large_collection", "Large Collection", "entry_count", 50,
                "Log 50 items."),
    Achievement(5, "both_worlds", "Both Worlds", "distinct_categories", 2,
                "Log at least one CULTURAL item and one NATURAL item."),
    Achievement(6, "time_traveler", "Time Traveler", "distinct_time_periods", 3,
                "Log items from 3 different time periods."),
    Achievement(7, "dino_hunter", "Dino Hunter", "fossil_count", 10,
                "Discover 10 fossils.", category="NATURAL"),
    Achievement(8, "shiny", "Shiny!", "geology_count", 10,
                "Discover 10 geology finds.", category="NATURAL"),
    Achievement(9, "world_traveler", "World Traveler", "distinct_continents", len(geography.CONTINENTS),
                "Log at least one item on every continent."),
]
_DISPLAY_ORDER = {definition.code: index for index, definition in enumerate(DEFAULT_ACHIEVEMENTS, 1)}


def seed_defaults() -> None:
    """Install the teammate's catalog and retire the old Getting Serious placeholder."""
    db.sync_achievement_definitions(DEFAULT_ACHIEVEMENTS, retired_codes=("getting_serious",))


def _counts_for_user(user_id: int, definitions: list[Achievement]) -> dict[str, int]:
    counts = db.get_item_rule_counts(user_id)
    if any(definition.rule_type == "distinct_continents" for definition in definitions):
        # Continents are derived geographic information, not a schema column.
        visited = set()
        for latitude, longitude in db.get_user_item_coordinates(user_id):
            continent = geography.continent_for_coordinates(latitude, longitude)
            if continent is not None:
                visited.add(continent)
        counts["distinct_continents"] = len(visited)
    return counts


def _definitions() -> list[Achievement]:
    return sorted(db.return_all_achievements(), key=lambda definition: (
        _DISPLAY_ORDER.get(definition.code, len(_DISPLAY_ORDER) + 1), definition.achievement_id,
    ))


def evaluate_and_unlock(user_id: int) -> list[dict]:
    """Persist this user's percentage progress and newly earned achievements."""
    definitions = _definitions()
    counts = _counts_for_user(user_id, definitions)
    newly_unlocked = []
    for achievement in definitions:
        if achievement.rule_type not in counts or achievement.threshold <= 0:
            logger.warning("Unsupported rule or threshold for achievement %s", achievement.code)
            continue
        count = counts[achievement.rule_type]
        completed = int(count >= achievement.threshold)
        progress = min(100, 100 * count // achievement.threshold)
        if db.record_user_achievement_progress(
            user_id, achievement.achievement_id, progress, completed,
        ):
            newly_unlocked.append({
                "code": achievement.code, "name": achievement.name,
                "description": achievement.description,
            })
    return newly_unlocked


def get_all_with_progress(user_id: int) -> list[dict]:
    """Return raw counts for the UI, alongside persisted completion/timestamps.

    Database progress remains a percentage (0-100). UI progress is a count
    toward threshold, preserving the existing API contract.
    """
    definitions = _definitions()
    counts = _counts_for_user(user_id, definitions)
    links = {link.achievement_id: link for link in db.get_user_achievements_by_user_id(user_id)}
    results = []
    for achievement in definitions:
        link = links.get(achievement.achievement_id)
        unlocked = bool(link and link.completed)
        threshold = max(0, achievement.threshold)
        results.append({
            "code": achievement.code, "name": achievement.name,
            "description": achievement.description, "rule_type": achievement.rule_type,
            "threshold": achievement.threshold,
            "sort_order": _DISPLAY_ORDER.get(achievement.code, len(_DISPLAY_ORDER) + achievement.achievement_id),
            "progress": threshold if unlocked else min(counts.get(achievement.rule_type, 0), threshold),
            "unlocked": unlocked,
            "unlocked_at": link.earned_at if unlocked else None,
        })
    return results
