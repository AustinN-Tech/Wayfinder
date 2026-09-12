import logging
import sqlite3

from core.models import Achievement
from utilities.util import error_handling
from .connections import db_connection_handling

logger = logging.getLogger(__name__)


# --- Achievements ---------------------------------------------------------

ACHIEVEMENT_COLUMNS = (
    "achievement_id, code, name, description, category, rule_type, threshold"
)
ACHIEVEMENT_UPDATABLE_COLUMNS = {
    "code", "name", "description", "category", "rule_type", "threshold"
}


def row_to_achievement(row) -> Achievement:
    """Convert a row in ACHIEVEMENT_COLUMNS order."""
    return Achievement(
        achievement_id=row[0], code=row[1], name=row[2],
        description=row[3], category=row[4], rule_type=row[5], threshold=row[6],
    )

@error_handling
@db_connection_handling
def add_achievement(conn: sqlite3.Connection, achievement: Achievement) -> None:
    """Insert a definition with an explicitly assigned unique ID and code."""
    with conn:
        conn.execute(
            f"INSERT INTO achievements ({ACHIEVEMENT_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (achievement.achievement_id, achievement.code, achievement.name,
             achievement.description, achievement.category, achievement.rule_type,
             achievement.threshold),
        )
    logger.info("Added achievement: %s", achievement.code)


@error_handling
@db_connection_handling
def get_achievement_by_id(
    conn: sqlite3.Connection, achievement_id: int,
) -> Achievement | None:
    row = conn.execute(
        f"SELECT {ACHIEVEMENT_COLUMNS} FROM achievements WHERE achievement_id = ?",
        (achievement_id,),
    ).fetchone()
    return row_to_achievement(row) if row is not None else None


@error_handling
@db_connection_handling
def get_achievement_by_code(conn: sqlite3.Connection, code: str) -> Achievement | None:
    row = conn.execute(
        f"SELECT {ACHIEVEMENT_COLUMNS} FROM achievements WHERE code = ?", (code,),
    ).fetchone()
    return row_to_achievement(row) if row is not None else None


@error_handling
@db_connection_handling
def return_all_achievements(conn: sqlite3.Connection) -> list[Achievement]:
    rows = conn.execute(
        f"SELECT {ACHIEVEMENT_COLUMNS} FROM achievements ORDER BY achievement_id"
    ).fetchall()
    return [row_to_achievement(row) for row in rows]


@error_handling
@db_connection_handling
def update_achievement(
    conn: sqlite3.Connection, achievement: Achievement,
    column: str, value: str | int | None,
) -> None:
    """Update a definition field; keep its ID stable for user achievement links."""
    if column not in ACHIEVEMENT_UPDATABLE_COLUMNS:
        raise ValueError(f"Invalid achievement column: {column}")
    with conn:
        cursor = conn.execute(
            f"UPDATE achievements SET {column} = ? WHERE achievement_id = ?",
            (value, achievement.achievement_id),
        )
        if not cursor.rowcount:
            raise ValueError(f"Achievement {achievement.achievement_id} does not exist")
    setattr(achievement, column, value)
    logger.info("Updated achievement %s: %s", achievement.achievement_id, column)


@error_handling
@db_connection_handling
def delete_achievement(conn: sqlite3.Connection, achievement: Achievement) -> None:
    """Delete a definition; existing user links prevent deletion via foreign keys.

    Deleting a missing definition is a no-op, matching delete_item.
    """
    with conn:
        conn.execute(
            "DELETE FROM achievements WHERE achievement_id = ?",
            (achievement.achievement_id,),
        )
    logger.info("Deleted achievement: %s", achievement.achievement_id)
