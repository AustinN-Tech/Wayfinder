import sqlite3
from .connections import db_connection_handling
from utilities.util import error_handling


def _add_column_if_missing(conn: sqlite3.Connection, table: str, column: str, ddl: str) -> None:
    """Additive, idempotent migration - sqlite has no ADD COLUMN IF NOT EXISTS."""
    existing = {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}
    if column not in existing:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {ddl}")


@error_handling
@db_connection_handling
def create_items_db(conn: sqlite3.Connection) -> None:
    """Create the user-owned discoveries table and its owner index."""
    create_users_db()
    with conn:
        conn.execute("BEGIN IMMEDIATE")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS heritage_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                sub_category TEXT NOT NULL,
                image_path TEXT NOT NULL UNIQUE,
                latitude REAL,
                longitude REAL,
                time_taken INTEGER NOT NULL DEFAULT (strftime('%s','now')),
                time_period TEXT NOT NULL,
                description TEXT,
                confidence_score TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
            )
        """)
        _add_column_if_missing(conn, "heritage_items", "is_favorite", "is_favorite INTEGER NOT NULL DEFAULT 0")
        conn.execute("CREATE INDEX IF NOT EXISTS heritage_items_user_id ON heritage_items(user_id)") # basically makes it more efficient to reduce lookup time


@error_handling
@db_connection_handling
def create_achievements_db(conn: sqlite3.Connection) -> None:
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS achievements (
                achievement_id INT NOT NULL UNIQUE,
                code TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                description TEXT,
                category TEXT,
                rule_type TEXT NOT NULL,
                threshold INTEGER NOT NULL
            )
        """)


@error_handling
@db_connection_handling
def create_users_db(conn: sqlite3.Connection) -> None:
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY AUTOINCREMENT,

                auth0_id TEXT NOT NULL UNIQUE,

                username TEXT,
                display_name TEXT,

                created_at INTEGER NOT NULL
                    DEFAULT (strftime('%s','now'))
            )
        """)
        _add_column_if_missing(conn, "users", "avatar_url", "avatar_url TEXT")
        # NULLs don't collide in a unique index, so this is safe even though
        # existing rows may have no username claimed yet.
        conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS users_username ON users(username)")


@error_handling
@db_connection_handling
def create_friendships_db(conn: sqlite3.Connection) -> None:
    """Friendships are stored as one row per direction.

    A request is a single 'pending' row (requester -> target). Accepting it
    flips that row to 'accepted' and inserts the mirrored row the other way,
    so "am I friends with X" and "list my friends" are both a plain lookup
    on user_id with no self-join needed.
    """
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS friendships (
                user_id INTEGER NOT NULL,
                friend_id INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
                PRIMARY KEY (user_id, friend_id),
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                FOREIGN KEY (friend_id) REFERENCES users(user_id) ON DELETE CASCADE
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS friendships_friend_id ON friendships(friend_id)")


@error_handling
@db_connection_handling
def create_user_achievements_db(conn: sqlite3.Connection) -> None:
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_achievements (
                user_id INTEGER NOT NULL,
                achievement_id INT NOT NULL,
                progress INTEGER CHECK (progress BETWEEN 0 AND 100),
                completed INTEGER CHECK (completed IN (0, 1)),
                earned_at INTEGER,

                PRIMARY KEY (user_id, achievement_id),

                FOREIGN KEY (user_id)
                    REFERENCES users(user_id),

                FOREIGN KEY (achievement_id)
                    REFERENCES achievements(achievement_id)
            )
        """)


# Preserve the existing item-table initialization API.
create_db = create_items_db
create_user_db = create_users_db
