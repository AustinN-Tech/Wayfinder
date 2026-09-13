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


@error_handling
@db_connection_handling
def sync_achievement_definitions(
    conn: sqlite3.Connection,
    definitions: list[Achievement],
    retired_codes: tuple[str, ...] = (),
) -> None:
    """Upsert a catalog of achievement definitions by code.

    A definition whose code already exists gets its fields updated in place,
    keeping its existing achievement_id - so any earned user_achievements
    links stay attached to the right definition even if DEFAULT_ACHIEVEMENTS
    reorders codes to different ids. A new code is inserted using the id the
    caller assigned it, unless that id is already occupied by some other
    still-active code (e.g. a legacy seed kept an old id that a newer default
    list happens to reuse) - in that case it falls back to the next free id,
    since the caller's numbering is only a preference for a fresh database,
    not a guarantee. Codes in retired_codes are removed entirely (their
    user_achievements links first, then the definition itself, since there's
    no ON DELETE CASCADE on that foreign key). Anything already in the table
    that isn't mentioned in either list is left untouched.

    Runs as two passes - every update first, then every insert - so a
    preserved id from an update can never collide with a later insert's
    fallback choice.
    """
    with conn:
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("BEGIN IMMEDIATE")
        for code in retired_codes:
            row = conn.execute(
                "SELECT achievement_id FROM achievements WHERE code = ?", (code,)
            ).fetchone()
            if row is None:
                continue
            achievement_id = row[0]
            conn.execute(
                "DELETE FROM user_achievements WHERE achievement_id = ?", (achievement_id,)
            )
            conn.execute(
                "DELETE FROM achievements WHERE achievement_id = ?", (achievement_id,)
            )

        to_insert = []
        for definition in definitions:
            existing = conn.execute(
                "SELECT achievement_id FROM achievements WHERE code = ?", (definition.code,)
            ).fetchone()
            if existing is not None:
                conn.execute("""
                    UPDATE achievements
                    SET name = ?, description = ?, category = ?, rule_type = ?, threshold = ?
                    WHERE code = ?
                """, (
                    definition.name, definition.description, definition.category,
                    definition.rule_type, definition.threshold, definition.code,
                ))
            else:
                to_insert.append(definition)

        for definition in to_insert:
            taken = conn.execute(
                "SELECT 1 FROM achievements WHERE achievement_id = ?", (definition.achievement_id,)
            ).fetchone()
            achievement_id = definition.achievement_id
            if taken is not None:
                achievement_id = conn.execute(
                    "SELECT COALESCE(MAX(achievement_id), 0) + 1 FROM achievements"
                ).fetchone()[0]
            conn.execute(
                f"INSERT INTO achievements ({ACHIEVEMENT_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    achievement_id, definition.code, definition.name,
                    definition.description, definition.category,
                    definition.rule_type, definition.threshold,
                ),
            )
    logger.info(
        "Synced %d achievement definitions (%d retired)",
        len(definitions), len(retired_codes),
    )
