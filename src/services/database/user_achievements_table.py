import sqlite3

from core.models import UserAchievement
from utilities.util import error_handling
from .connections import db_connection_handling

USER_ACHIEVEMENT_COLUMNS = "user_id, achievement_id, progress, completed, earned_at"
USER_ACHIEVEMENT_UPDATABLE_COLUMNS = {"progress", "completed", "earned_at"}


def row_to_user_achievement(row) -> UserAchievement:
    return UserAchievement(
        user_id=row[0], achievement_id=row[1], progress=row[2],
        completed=row[3], earned_at=row[4],
    )


def _validate_value(column: str, value: int | None) -> None:
    if column not in USER_ACHIEVEMENT_UPDATABLE_COLUMNS:
        raise ValueError(f"Invalid user achievement column: {column}")
    if value is None:
        return
    if type(value) is not int:
        raise TypeError(f"{column} must be an integer or None")
    if column == "progress" and not 0 <= value <= 100:
        raise ValueError("progress must be between 0 and 100")
    if column == "completed" and value not in (0, 1):
        raise ValueError("completed must be 0 or 1")


@error_handling
@db_connection_handling
def add_user_achievement(conn: sqlite3.Connection, user_achievement: UserAchievement) -> None:
    """Link an existing user and achievement; earned_at=None stores SQL NULL."""
    for column in USER_ACHIEVEMENT_UPDATABLE_COLUMNS:
        _validate_value(column, getattr(user_achievement, column))
    with conn:
        conn.execute(
            f"INSERT INTO user_achievements ({USER_ACHIEVEMENT_COLUMNS}) VALUES (?, ?, ?, ?, ?)",
            (user_achievement.user_id, user_achievement.achievement_id,
             user_achievement.progress, user_achievement.completed, user_achievement.earned_at),
        )


@error_handling
@db_connection_handling
def get_user_achievement(
    conn: sqlite3.Connection, user_id: int, achievement_id: int,
) -> UserAchievement | None:
    row = conn.execute(
        f"SELECT {USER_ACHIEVEMENT_COLUMNS} FROM user_achievements "
        "WHERE user_id = ? AND achievement_id = ?", (user_id, achievement_id),
    ).fetchone()
    return row_to_user_achievement(row) if row is not None else None


@error_handling
@db_connection_handling
def get_user_achievements_by_user_id(conn: sqlite3.Connection, user_id: int) -> list[UserAchievement]:
    rows = conn.execute(
        f"SELECT {USER_ACHIEVEMENT_COLUMNS} FROM user_achievements "
        "WHERE user_id = ? ORDER BY achievement_id", (user_id,),
    ).fetchall()
    return [row_to_user_achievement(row) for row in rows]


@error_handling
@db_connection_handling
def get_user_achievements_by_achievement_id(
    conn: sqlite3.Connection, achievement_id: int,
) -> list[UserAchievement]:
    rows = conn.execute(
        f"SELECT {USER_ACHIEVEMENT_COLUMNS} FROM user_achievements "
        "WHERE achievement_id = ? ORDER BY user_id", (achievement_id,),
    ).fetchall()
    return [row_to_user_achievement(row) for row in rows]


@error_handling
@db_connection_handling
def return_all_user_achievements(conn: sqlite3.Connection) -> list[UserAchievement]:
    rows = conn.execute(
        f"SELECT {USER_ACHIEVEMENT_COLUMNS} FROM user_achievements ORDER BY user_id, achievement_id"
    ).fetchall()
    return [row_to_user_achievement(row) for row in rows]


@error_handling
@db_connection_handling
def update_user_achievement(
    conn: sqlite3.Connection, user_achievement: UserAchievement,
    column: str, value: int | None,
) -> None:
    """Update a mutable field; earned_at accepts Unix seconds or None to clear.

    Progress, completion, and earned time are explicit, independent updates.
    Setting completed does not automatically generate an earned_at timestamp.
    """
    _validate_value(column, value)
    with conn:
        cursor = conn.execute(
            f"UPDATE user_achievements SET {column} = ? WHERE user_id = ? AND achievement_id = ?",
            (value, user_achievement.user_id, user_achievement.achievement_id),
        )
        if not cursor.rowcount:
            raise ValueError("User achievement does not exist")
    setattr(user_achievement, column, value)


@error_handling
@db_connection_handling
def delete_user_achievement(conn: sqlite3.Connection, user_achievement: UserAchievement) -> None:
    """Delete only this relationship. A missing row is a no-op."""
    with conn:
        conn.execute(
            "DELETE FROM user_achievements WHERE user_id = ? AND achievement_id = ?",
            (user_achievement.user_id, user_achievement.achievement_id),
        )
