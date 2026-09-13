import functools
import sqlite3

from services.storage import IMAGE_DIR

# On Railway, IMAGE_DIR resolves to the mounted Volume (see storage.py), so
# putting the database there too means it survives redeploys - the container
# filesystem itself is wiped every deploy, only the Volume persists. Locally
# (no volume), IMAGE_DIR falls back to a project folder, so this still works
# without a volume.
DB_PATH = IMAGE_DIR / "items.db"

def db_connection_handling(func):
    """Open a connection for a database operation and always close it."""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("PRAGMA foreign_keys = ON") # enable foreign keys
            return func(conn, *args, **kwargs)
        finally:
            conn.close()
    return wrapper
