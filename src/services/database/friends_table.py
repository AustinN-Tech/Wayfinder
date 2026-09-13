import logging
import sqlite3

from .connections import db_connection_handling
from .user_table import row_to_user, USER_COLUMNS
from utilities.util import error_handling

logger = logging.getLogger(__name__)


@error_handling
@db_connection_handling
def get_friendship_status(conn: sqlite3.Connection, user_id: int, other_id: int) -> str | None:
    """None, 'pending' (either direction) or 'accepted'."""
    row = conn.execute(
        "SELECT status FROM friendships WHERE user_id = ? AND friend_id = ?",
        (user_id, other_id),
    ).fetchone()
    if row is not None:
        return row[0]
    row = conn.execute(
        "SELECT status FROM friendships WHERE user_id = ? AND friend_id = ?",
        (other_id, user_id),
    ).fetchone()
    return row[0] if row is not None else None


@error_handling
@db_connection_handling
def send_friend_request(conn: sqlite3.Connection, user_id: int, target_id: int) -> None:
    if user_id == target_id:
        raise ValueError("Cannot friend yourself")
    with conn:
        conn.execute("BEGIN IMMEDIATE")
        existing = conn.execute(
            "SELECT status FROM friendships WHERE (user_id = ? AND friend_id = ?) "
            "OR (user_id = ? AND friend_id = ?)",
            (user_id, target_id, target_id, user_id),
        ).fetchone()
        if existing is not None:
            raise ValueError("A request already exists between these users")
        conn.execute(
            "INSERT INTO friendships (user_id, friend_id, status) VALUES (?, ?, 'pending')",
            (user_id, target_id),
        )
    logger.info("Friend request %s -> %s", user_id, target_id)


@error_handling
@db_connection_handling
def accept_friend_request(conn: sqlite3.Connection, user_id: int, requester_id: int) -> None:
    """user_id accepts a pending request that requester_id sent them."""
    with conn:
        cursor = conn.execute(
            "UPDATE friendships SET status = 'accepted' "
            "WHERE user_id = ? AND friend_id = ? AND status = 'pending'",
            (requester_id, user_id),
        )
        if not cursor.rowcount:
            raise ValueError("No pending request from that user")
        conn.execute(
            "INSERT OR REPLACE INTO friendships (user_id, friend_id, status) VALUES (?, ?, 'accepted')",
            (user_id, requester_id),
        )
    logger.info("Friend request accepted: %s <-> %s", user_id, requester_id)


@error_handling
@db_connection_handling
def remove_friendship(conn: sqlite3.Connection, user_id: int, other_id: int) -> None:
    """Covers declining a request, cancelling one you sent, and unfriending."""
    with conn:
        conn.execute(
            "DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) "
            "OR (user_id = ? AND friend_id = ?)",
            (user_id, other_id, other_id, user_id),
        )
    logger.info("Friendship removed: %s <-> %s", user_id, other_id)


_USER_COLUMNS_QUALIFIED = ", ".join(f"users.{col.strip()}" for col in USER_COLUMNS.split(","))


@error_handling
@db_connection_handling
def list_friends(conn: sqlite3.Connection, user_id: int):
    rows = conn.execute(
        f"SELECT {_USER_COLUMNS_QUALIFIED} FROM users JOIN friendships "
        "ON users.user_id = friendships.friend_id "
        "WHERE friendships.user_id = ? AND friendships.status = 'accepted' "
        "ORDER BY users.username",
        (user_id,),
    ).fetchall()
    return [row_to_user(row) for row in rows]


@error_handling
@db_connection_handling
def list_incoming_requests(conn: sqlite3.Connection, user_id: int):
    rows = conn.execute(
        f"SELECT {_USER_COLUMNS_QUALIFIED} FROM users JOIN friendships "
        "ON users.user_id = friendships.user_id "
        "WHERE friendships.friend_id = ? AND friendships.status = 'pending' "
        "ORDER BY friendships.created_at",
        (user_id,),
    ).fetchall()
    return [row_to_user(row) for row in rows]


@error_handling
@db_connection_handling
def list_outgoing_requests(conn: sqlite3.Connection, user_id: int):
    rows = conn.execute(
        f"SELECT {_USER_COLUMNS_QUALIFIED} FROM users JOIN friendships "
        "ON users.user_id = friendships.friend_id "
        "WHERE friendships.user_id = ? AND friendships.status = 'pending' "
        "ORDER BY friendships.created_at",
        (user_id,),
    ).fetchall()
    return [row_to_user(row) for row in rows]


@error_handling
@db_connection_handling
def are_friends(conn: sqlite3.Connection, user_id: int, other_id: int) -> bool:
    row = conn.execute(
        "SELECT 1 FROM friendships WHERE user_id = ? AND friend_id = ? AND status = 'accepted'",
        (user_id, other_id),
    ).fetchone()
    return row is not None
