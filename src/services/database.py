import sqlite3
import functools
import logging
from storage import SRC_DIR, BASE_DIR

"""
item_table

item_id
name
category
sub_category
image_path
latitude
longitude
time_taken
time_period
description
confidence

"""


DB_PATH = SRC_DIR / "items.db"

def create_db():
    conn = sqlite3.connect(DB_PATH)
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
    conn.commit()
    conn.close()