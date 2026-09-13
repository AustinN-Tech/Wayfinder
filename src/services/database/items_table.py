import logging
import sqlite3
from contextlib import nullcontext
from pathlib import Path

from core.models import HeritageItem
from services.storage import image_addition, image_replacement, image_deletion
from utilities.util import error_handling
from .connections import db_connection_handling

logger = logging.getLogger(__name__)


@error_handling
@db_connection_handling
def update_item_fields(conn: sqlite3.Connection, item: HeritageItem, changes: dict, *, user_id: int) -> None:
    """Commit an entire edit together, including replacement image rollback."""
    validate_user_id(user_id)
    if not changes or any(key not in UPDATABLE_COLUMNS for key in changes):
        raise ValueError("Invalid or empty item update")
    values = dict(changes)
    try:
        conn.execute("BEGIN IMMEDIATE")
        row = conn.execute(
            f"SELECT {ITEM_COLUMNS} FROM heritage_items WHERE id = ? AND user_id = ?",
            (item.id, user_id),
        ).fetchone()
        if row is None:
            raise ValueError(f"Item {item.id} does not exist")
        stored_item = row_to_heritage_item(row)
        replacement = (image_replacement(stored_item, values["image_path"])
                       if "image_path" in values else nullcontext())
        with replacement as image_path:
            if "image_path" in values:
                values["image_path"] = str(image_path)
            assignments = ", ".join(f"{UPDATABLE_COLUMNS[key]} = ?" for key in values)
            with conn:
                conn.execute(
                    f"UPDATE heritage_items SET {assignments} WHERE id = ? AND user_id = ?",
                    (*values.values(), item.id, user_id),
                )
    except Exception:
        conn.rollback()
        raise
    for key, value in values.items():
        setattr(item, "confidence" if key == "confidence_score" else key,
                Path(value) if key == "image_path" else value)
    logger.info("Updated item '%s'", item.name)


def validate_user_id(user_id: int) -> None:
    if type(user_id) is not int or user_id <= 0:
        raise ValueError("user_id must be a positive local user ID")

ITEM_COLUMNS = (
    "id, name, category, sub_category, image_path, latitude, longitude, "
    "time_taken, time_period, description, confidence_score, user_id, is_favorite, place_name"
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
    "is_favorite": "is_favorite",
    "place_name": "place_name",
}

def row_to_heritage_item(row) -> HeritageItem:
    """Convert a row in ITEM_COLUMNS order to a heritage item."""
    return HeritageItem(
        id=row[0],
        name=row[1],
        category=row[2],
        sub_category=row[3],
        image_path=Path(row[4]),
        latitude=row[5],
        longitude=row[6],
        time_taken=row[7],
        time_period=row[8],
        description=row[9],
        confidence=row[10],
        user_id=row[11],
        is_favorite=row[12],
        place_name=row[13],
    )


@error_handling
@db_connection_handling
def add_item(conn: sqlite3.Connection, item: HeritageItem) -> None:
    """Insert an item, then populate its generated ID and capture timestamp."""

    validate_user_id(item.user_id)
    if conn.execute("SELECT 1 FROM users WHERE user_id = ?", (item.user_id,)).fetchone() is None:
        raise ValueError(f"User {item.user_id} does not exist")
    with image_addition(item.image_path) as image_path:
        with conn:
            c = conn.execute("""
                INSERT INTO heritage_items (
                    name, category, sub_category, image_path, latitude, longitude,
                    time_period, description, confidence_score, user_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                item.name, item.category, item.sub_category, str(image_path),
                item.latitude, item.longitude, item.time_period,
                item.description, item.confidence, item.user_id,
            ))
            item_id = c.lastrowid
            time_taken = conn.execute(
                "SELECT time_taken FROM heritage_items WHERE id = ? AND user_id = ?", (item_id, item.user_id)
            ).fetchone()[0]
    # update object:
    item.id = item_id
    item.time_taken = time_taken
    item.image_path = image_path
    logger.info("Added item: %s", item.name)


@error_handling
@db_connection_handling
def delete_item(conn: sqlite3.Connection, item: HeritageItem, *, user_id: int) -> None:
    """Delete an item's database row, retaining its image."""
    validate_user_id(user_id)
    with conn:
        conn.execute("DELETE FROM heritage_items WHERE id = ? AND user_id = ?", (item.id, user_id))
    logger.info("Deleted item from db: %s", item.name)


@error_handling
@db_connection_handling
def delete_all_db(conn: sqlite3.Connection, user_id: int) -> None:
    """Delete this user's item rows, retaining their images."""
    validate_user_id(user_id)
    with conn:
        conn.execute("DELETE FROM heritage_items WHERE user_id = ?", (user_id,))
    logger.debug("All item rows deleted for user %s", user_id)


@error_handling
@db_connection_handling
def update_item(
    conn: sqlite3.Connection,
    item: HeritageItem,
    column: str,
    value: str | Path | int | float | None,
    *, user_id: int,
) -> None:
    """Update a field; for image_path, value is the replacement source file."""
    validate_user_id(user_id)
    db_column = UPDATABLE_COLUMNS.get(column) # obtain column
    if db_column is None: # reject invalid
        raise ValueError(f"Invalid item column: {column}")
    if db_column == "image_path":
        if not isinstance(value, (str, Path)):
            raise TypeError("image_path must be a string or Path")
        # Lock before reading so cleanup uses the current persisted image.
        try:
            conn.execute("BEGIN IMMEDIATE") # the write operation so that only the current function can write
            row = conn.execute(
                f"SELECT {ITEM_COLUMNS} FROM heritage_items WHERE id = ? AND user_id = ?", (item.id, user_id)
            ).fetchone()
            if row is None:
                raise ValueError(f"Item {item.id} does not exist")
            stored_item = row_to_heritage_item(row)
            with image_replacement(stored_item, value) as new_path:
                with conn:
                    conn.execute(
                        "UPDATE heritage_items SET image_path = ? WHERE id = ? AND user_id = ?",
                        (str(new_path), item.id, user_id),
                    )
        except Exception:
            conn.rollback() # if terrible things happen, undo them.
            raise
        item.image_path = new_path
        logger.info("Updated image for item '%s'", item.name)
        return
    with conn:
        c = conn.execute(
            f"UPDATE heritage_items SET {db_column} = ? WHERE id = ? AND user_id = ?", (value, item.id, user_id)
        )
        if not c.rowcount:
            raise ValueError(f"Item {item.id} does not exist")
    if c.rowcount:
        if db_column == "confidence_score":
            attribute = "confidence"
        else:
            attribute = db_column
        setattr(item, attribute, value) # lets you modify an object's attribute using a string containing the attribute's name (updating the HeritageItem object)
    logger.info("Updated item '%s', column %s", item.name, db_column)


@error_handling
@db_connection_handling
def return_all_items(conn: sqlite3.Connection, user_id: int) -> list[HeritageItem]:
    """Return only this local user's discoveries."""
    validate_user_id(user_id)
    rows = conn.execute(
        f"SELECT {ITEM_COLUMNS} FROM heritage_items WHERE user_id = ? ORDER BY id", (user_id,)
    ).fetchall()
    return [row_to_heritage_item(row) for row in rows]


@error_handling
@db_connection_handling
def get_item_rule_counts(conn: sqlite3.Connection, user_id: int) -> dict[str, int]:
    """Achievement counts derived exclusively from one user's discoveries."""
    validate_user_id(user_id)
    row = conn.execute("""
        SELECT COUNT(*), COUNT(image_path), COUNT(DISTINCT category),
               COUNT(DISTINCT sub_category), COUNT(DISTINCT NULLIF(TRIM(time_period), '')),
               COUNT(CASE WHEN category = 'NATURAL' AND sub_category = 'FOSSIL' THEN 1 END),
               COUNT(CASE WHEN category = 'NATURAL' AND sub_category = 'GEOLOGY' THEN 1 END),
               COUNT(CASE WHEN category = 'CULTURAL' AND sub_category = 'ART' THEN 1 END)
        FROM heritage_items WHERE user_id = ?
    """, (user_id,)).fetchone()
    return dict(zip(("entry_count", "with_photo", "distinct_categories",
                     "distinct_sub_categories", "distinct_time_periods", "fossil_count",
                     "geology_count", "art_count"), row))


@error_handling
@db_connection_handling
def get_user_item_coordinates(conn: sqlite3.Connection, user_id: int) -> list[tuple[float, float]]:
    """Return distinct recorded coordinates for this user's discoveries only."""
    validate_user_id(user_id)
    return conn.execute(
        "SELECT DISTINCT latitude, longitude FROM heritage_items "
        "WHERE user_id = ? AND latitude IS NOT NULL AND longitude IS NOT NULL",
        (user_id,),
    ).fetchall()


@error_handling
@db_connection_handling
def get_item_by_name(conn: sqlite3.Connection, name: str, *, user_id: int) -> HeritageItem | None:
    """Return the first matching item; names need not be unique."""
    validate_user_id(user_id)
    row = conn.execute(
        f"SELECT {ITEM_COLUMNS} FROM heritage_items WHERE name = ? AND user_id = ? ORDER BY id LIMIT 1",
        (name, user_id),
    ).fetchone()
    return row_to_heritage_item(row) if row is not None else None


@error_handling
@db_connection_handling
def get_favorite_item(conn: sqlite3.Connection, user_id: int) -> HeritageItem | None:
    validate_user_id(user_id)
    row = conn.execute(
        f"SELECT {ITEM_COLUMNS} FROM heritage_items WHERE user_id = ? AND is_favorite = 1 "
        "ORDER BY id DESC LIMIT 1",
        (user_id,),
    ).fetchone()
    return row_to_heritage_item(row) if row is not None else None


@error_handling
@db_connection_handling
def get_activity_by_day(conn: sqlite3.Connection, user_id: int) -> dict[str, int]:
    """Count of items logged per UTC day, for an activity heatmap."""
    validate_user_id(user_id)
    rows = conn.execute(
        "SELECT date(time_taken, 'unixepoch') AS day, COUNT(*) FROM heritage_items "
        "WHERE user_id = ? GROUP BY day",
        (user_id,),
    ).fetchall()
    return dict(rows)


@error_handling
@db_connection_handling
def get_item_by_id(conn: sqlite3.Connection, item_id: int, *, user_id: int) -> HeritageItem | None:
    validate_user_id(user_id)
    row = conn.execute(
        f"SELECT {ITEM_COLUMNS} FROM heritage_items WHERE id = ? AND user_id = ?", (item_id, user_id)
    ).fetchone()
    return row_to_heritage_item(row) if row is not None else None

@error_handling
@db_connection_handling
def full_delete(conn: sqlite3.Connection, item: HeritageItem, *, user_id: int) -> None:
    """Delete the persisted item and its image, allowing an already-missing file."""
    validate_user_id(user_id)
    try:
        conn.execute("BEGIN IMMEDIATE") # the write operation so that only the current function can write
        row = conn.execute(
            f"SELECT {ITEM_COLUMNS} FROM heritage_items WHERE id = ? AND user_id = ?", (item.id, user_id)
        ).fetchone()
        if row is None:
            conn.rollback() # if terrible things happen (try to delete something that doesn't exist), undo them
            return
        stored_item = row_to_heritage_item(row)
        with image_deletion(stored_item):
            with conn:
                conn.execute("DELETE FROM heritage_items WHERE id = ? AND user_id = ?", (item.id, user_id))
    except Exception:
        conn.rollback()
        raise
    logger.info("Deleted item and image: %s", stored_item.name)
