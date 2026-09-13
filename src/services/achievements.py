"""Evaluate achievement rules against each user's independent discoveries."""

import sqlite3

from core.models import Achievement
from services import database as db

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
] # placeholders for now until Luis sends entire achievement list


def seed_defaults() -> None:
    """Idempotently insert the placeholder definitions into the current schema."""
    for definition in DEFAULT_ACHIEVEMENTS:
        if db.get_achievement_by_code(definition["code"]) is not None:
            continue
        achievement = Achievement(
            achievement_id=definition["sort_order"], code=definition["code"],
            name=definition["name"], description=definition["description"],
            rule_type=definition["rule_type"], threshold=definition["threshold"],
        )
        try:
            db.add_achievement(achievement)
        except sqlite3.IntegrityError:
            # Another request may have seeded this same definition.
            if db.get_achievement_by_code(achievement.code) is None:
                raise


def evaluate_and_unlock(user_id: int) -> list[dict]:
    """Evaluate only this user's discoveries and persist their unlocks."""
    counts = db.get_item_rule_counts(user_id)
    newly_unlocked = []
    for achievement in db.return_all_achievements():
        if achievement.rule_type not in counts:
            continue
        count = counts[achievement.rule_type]
        completed = int(count >= achievement.threshold)
        progress = 100 if completed else int(100 * count / achievement.threshold)
        if db.record_user_achievement_progress(
            user_id, achievement.achievement_id, progress, completed,
        ):
            newly_unlocked.append({
                "code": achievement.code, "name": achievement.name,
                "description": achievement.description,
            })
    return newly_unlocked


def get_all_with_progress(user_id: int) -> list[dict]:
    """Definitions annotated with only this user's progress and earned state."""
    counts = db.get_item_rule_counts(user_id)
    links = {
        link.achievement_id: link
        for link in db.get_user_achievements_by_user_id(user_id)
    }
    results = []
    for achievement in db.return_all_achievements():
        link = links.get(achievement.achievement_id)
        results.append({
            "code": achievement.code, "name": achievement.name,
            "description": achievement.description, "rule_type": achievement.rule_type,
            "threshold": achievement.threshold, "sort_order": achievement.achievement_id,
            "progress": min(counts.get(achievement.rule_type, 0), achievement.threshold),
            "unlocked": bool(link and link.completed),
            "unlocked_at": link.earned_at if link and link.completed else None,
        })
    return results
