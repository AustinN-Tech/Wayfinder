import sqlite3
import logging
from core.models import User
from .connections import db_connection_handling
from utilities.util import error_handling

logger = logging.getLogger(__name__)
USER_COLUMNS = "user_id, auth0_id, username, display_name, created_at"
USER_UPDATABLE_COLUMNS = {"username", "display_name"}


def row_to_user(row) -> User:
    """Convert a row in USER_COLUMNS order to a user."""
    return User(
        user_id=row[0], auth0_id=row[1], username=row[2],
        display_name=row[3], created_at=row[4],
    )


@error_handling
@db_connection_handling
def add_user(conn: sqlite3.Connection, user: User) -> None:
    """Insert a local profile and populate its generated ID and creation time.

    auth0_id is the authenticated subject supplied by the caller. This function
    does not create an Auth0 account or authenticate a request.
    """
    if not isinstance(user.auth0_id, str) or not user.auth0_id.strip():
        raise ValueError("auth0_id must be a non-empty string")
    with conn:
        cursor = conn.execute(
            "INSERT INTO users (auth0_id, username, display_name) VALUES (?, ?, ?)",
            (user.auth0_id, user.username, user.display_name),
        )
        user_id = cursor.lastrowid
        created_at = conn.execute(
            "SELECT created_at FROM users WHERE user_id = ?", (user_id,),
        ).fetchone()[0]
    user.user_id = user_id
    user.created_at = created_at
    logger.info("Added user: %s", user_id)


@error_handling
@db_connection_handling
def get_user_by_id(conn: sqlite3.Connection, user_id: int) -> User | None:
    row = conn.execute(
        f"SELECT {USER_COLUMNS} FROM users WHERE user_id = ?", (user_id,),
    ).fetchone()
    return row_to_user(row) if row is not None else None


@error_handling
@db_connection_handling
def get_user_by_auth0_id(conn: sqlite3.Connection, auth0_id: str) -> User | None:
    row = conn.execute(
        f"SELECT {USER_COLUMNS} FROM users WHERE auth0_id = ?", (auth0_id,),
    ).fetchone()
    return row_to_user(row) if row is not None else None


@error_handling
@db_connection_handling
def return_all_users(conn: sqlite3.Connection) -> list[User]:
    rows = conn.execute(f"SELECT {USER_COLUMNS} FROM users ORDER BY user_id").fetchall()
    return [row_to_user(row) for row in rows]


@error_handling
@db_connection_handling
def update_user(
    conn: sqlite3.Connection, user: User, column: str, value: str | None,
) -> None:
    """Update profile fields, keeping identity and creation time unchanged."""
    if column not in USER_UPDATABLE_COLUMNS:
        raise ValueError(f"Invalid user column: {column}")
    if value is not None and not isinstance(value, str):
        raise TypeError("User profile values must be strings or None")
    with conn:
        cursor = conn.execute(
            f"UPDATE users SET {column} = ? WHERE user_id = ?", (value, user.user_id),
        )
        if not cursor.rowcount:
            raise ValueError(f"User {user.user_id} does not exist")
    setattr(user, column, value)
    logger.info("Updated user %s: %s", user.user_id, column)


@error_handling
@db_connection_handling
def delete_user(conn: sqlite3.Connection, user: User) -> None:
    """Delete only the local profile; user-achievement links prevent deletion.

    A missing row is a no-op. The Auth0 account is not affected.
    """
    with conn:
        conn.execute("DELETE FROM users WHERE user_id = ?", (user.user_id,))
    logger.info("Deleted user: %s", user.user_id)

@error_handling
def get_or_create_user(auth0_id: str) -> User:
    user = get_user_by_auth0_id(auth0_id)

    if user is None:
        user = User(auth0_id=auth0_id)
        add_user(user)

    return user
