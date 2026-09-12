import functools
import logging
import sqlite3
from pathlib import Path

from core.models import HeritageItem
from services.storage import BASE_DIR, IMAGE_DIR, SRC_DIR
from utilities.util import error_handling

logger = logging.getLogger(__name__)
DB_PATH = SRC_DIR / "items.db"

ITEM_COLUMNS = (
    "id, name, category, sub_category, image_path, latitude, longitude, "
    "time_taken, time_period, description, confidence_score"
)

UPDATABLE_COLUMNS = {
    "name": "name",
    "category": "category",
    "sub_category": "sub_category",
    "image_path": "image_path",
    "latitude": "latitude",
    "longitude": "longitude",
    "time_taken": "time_taken",
    "time_period": "time_period",
    "description": "description",
    "confidence": "confidence_score",
    "confidence_score": "confidence_score",
}


def db_connection_handling(func):
    """Open a connection for a database operation and always close it."""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("PRAGMA foreign_keys = ON")
            return func(conn, *args, **kwargs)
        finally:
            conn.close()
    return wrapper


@error_handling
@db_connection_handling
def create_db(conn: sqlite3.Connection) -> None:
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                sub_category TEXT NOT NULL,
                image_path TEXT NOT NULL UNIQUE,
                latitude REAL,
                longitude REAL,
                time_taken INTEGER NOT NULL DEFAULT (strftime('%s','now')),
                time_period TEXT NOT NULL,
                description TEXT,
                confidence_score TEXT NOT NULL
            )
        """)


def row_to_heritage_item(row) -> HeritageItem:
    """Convert a row in ITEM_COLUMNS order to a heritage item."""
    return HeritageItem(
        id=row[0],
        name=row[1],
        category=row[2],
        sub_category=row[3],
        image_path=row[4],
        latitude=row[5],
        longitude=row[6],
        time_taken=row[7],
        time_period=row[8],
        description=row[9],
        confidence=row[10],
    )


@error_handling
@db_connection_handling
def add_item(conn: sqlite3.Connection, item: HeritageItem) -> None:
    """Insert an item, then populate its generated ID and capture timestamp."""
    with conn:
        c = conn.execute("""
            INSERT INTO items (
                name, category, sub_category, image_path, latitude, longitude,
                 time_period, description, confidence_score
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            item.name, item.category, item.sub_category, str(item.image_path),
            item.latitude, item.longitude, item.time_period,
            item.description, item.confidence,
        ))
        item_id = c.lastrowid # obtains last inserted id
        time_taken = conn.execute( # obtain new time from row just inserted
            "SELECT time_taken FROM items WHERE id = ?", (item_id,)
        ).fetchone()[0]
    # update object:
    item.id = item_id
    item.time_taken = time_taken
    logger.info("Added item: %s", item.name)


@error_handling
@db_connection_handling
def delete_item(conn: sqlite3.Connection, item: HeritageItem) -> None:
    """Delete an item's database row, retaining its image."""
    with conn:
        conn.execute("DELETE FROM items WHERE id = ?", (item.id,))
    logger.info("Deleted item from db: %s", item.name)


@error_handling
@db_connection_handling
def delete_all_db(conn: sqlite3.Connection) -> None:
    """Delete all item rows, retaining their images."""
    with conn:
        conn.execute("DELETE FROM items")
    logger.debug("All rows deleted from items.db")


@error_handling
@db_connection_handling
def update_item(
    conn: sqlite3.Connection,
    item: HeritageItem,
    column: str,
    value: str | int | float | None,
) -> None:
    """Update a permitted field, accepting confidence or confidence_score."""
    db_column = UPDATABLE_COLUMNS.get(column) # obtain column
    if db_column is None: # reject invalid
        raise ValueError(f"Invalid item column: {column}")
    with conn:
        c = conn.execute(
            f"UPDATE items SET {db_column} = ? WHERE id = ?", (value, item.id)
        )
    if c.rowcount:
        if db_column == "confidence_score":
            attribute = "confidence"
        else:
            attribute = db_column
        setattr(item, attribute, value) # lets you modify an object's attribute using a string containing the attribute's name (updating the HeritageItem object)
    logger.info("Updated item '%s', column %s", item.name, db_column)


@error_handling
@db_connection_handling
def return_all_items(conn: sqlite3.Connection) -> list[HeritageItem]:
    rows = conn.execute(f"SELECT {ITEM_COLUMNS} FROM items ORDER BY id").fetchall()
    return [row_to_heritage_item(row) for row in rows]


@error_handling
@db_connection_handling
def get_item_by_name(conn: sqlite3.Connection, name: str) -> HeritageItem | None:
    """Return the first matching item; names need not be unique."""
    row = conn.execute(
        f"SELECT {ITEM_COLUMNS} FROM items WHERE name = ? ORDER BY id LIMIT 1",
        (name,),
    ).fetchone()
    return row_to_heritage_item(row) if row is not None else None


@error_handling
@db_connection_handling
def get_item_by_id(conn: sqlite3.Connection, item_id: int) -> HeritageItem | None:
    row = conn.execute(
        f"SELECT {ITEM_COLUMNS} FROM items WHERE id = ?", (item_id,)
    ).fetchone()
    return row_to_heritage_item(row) if row is not None else None
