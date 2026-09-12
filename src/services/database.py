import sqlite3
import functools
import logging
from services.storage import SRC_DIR, BASE_DIR

DB_PATH = SRC_DIR / "items.db"


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def create_db():
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
    CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT UNIQUE NOT NULL,
        author TEXT NOT NULL DEFAULT 'Unknown',
        genre TEXT NOT NULL,
        date_added INTEGER NOT NULL DEFAULT (strftime('%s','now')),
        file_key TEXT NOT NULL UNIQUE,
        cover_path TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        bookmark_page INT
    )
    """)
    c.execute("""
    CREATE TABLE IF NOT EXISTS items (
        item_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        sub_category TEXT NOT NULL,
        image_path TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        time_taken INTEGER NOT NULL DEFAULT (strftime('%s','now')),
        time_period TEXT,
        description TEXT,
        confidence REAL
    )
    """)
    conn.commit()
    conn.close()


def insert_item(item):
    conn = get_connection()
    cur = conn.execute("""
        INSERT INTO items (name, category, sub_category, image_path, latitude, longitude, time_period, description, confidence)
        VALUES (:name, :category, :sub_category, :image_path, :latitude, :longitude, :time_period, :description, :confidence)
    """, item)
    conn.commit()
    item_id = cur.lastrowid
    conn.close()
    return item_id


def get_item(item_id):
    conn = get_connection()
    row = conn.execute("SELECT * FROM items WHERE item_id = ?", (item_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_all_items():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM items ORDER BY time_taken DESC").fetchall()
    conn.close()
    return [dict(row) for row in rows]


def update_item(item_id, fields):
    if not fields:
        return False
    conn = get_connection()
    columns = ", ".join(f"{key} = :{key}" for key in fields)
    params = dict(fields)
    params["item_id"] = item_id
    cur = conn.execute(f"UPDATE items SET {columns} WHERE item_id = :item_id", params)
    conn.commit()
    updated = cur.rowcount > 0
    conn.close()
    return updated


def delete_item(item_id):
    conn = get_connection()
    cur = conn.execute("DELETE FROM items WHERE item_id = ?", (item_id,))
    conn.commit()
    deleted = cur.rowcount > 0
    conn.close()
    return deleted