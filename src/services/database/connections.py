import functools
import sqlite3

from services.storage import SRC_DIR

DB_PATH = SRC_DIR / "items.db"

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
