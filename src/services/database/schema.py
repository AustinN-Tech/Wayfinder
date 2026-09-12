import sqlite3
from .connections import db_connection_handling
from utilities.util import error_handling

@error_handling
@db_connection_handling
def create_items_db(conn: sqlite3.Connection) -> None:
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                sub_category TEXT NOT NULL,
                image_path TEXT NOT NULL UNIQUE,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                time_taken INTEGER NOT NULL DEFAULT (strftime('%s','now')),
                time_period TEXT NOT NULL,
                description TEXT,
                confidence_score TEXT NOT NULL
            )
        """)


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
