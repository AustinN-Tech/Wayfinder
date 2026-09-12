"""Database API backed by separate schema, connection, and table modules.

Existing callers can continue using ``from services import database as db``.
Configure or patch the database location through ``connections.DB_PATH``.
"""

from . import connections
from .connections import db_connection_handling
from .schema import (
    create_db,
    create_items_db,
    create_achievements_db,
    create_user_db,
    create_user_achievements_db,
)
from .items_table import (
    ITEM_COLUMNS,
    UPDATABLE_COLUMNS,
    row_to_heritage_item,
    add_item,
    delete_item,
    delete_all_db,
    update_item,
    return_all_items,
    get_item_by_name,
    get_item_by_id,
    full_delete,
)
from .achievements_table import (
    ACHIEVEMENT_COLUMNS,
    ACHIEVEMENT_UPDATABLE_COLUMNS,
    row_to_achievement,
    add_achievement,
    get_achievement_by_id,
    get_achievement_by_code,
    return_all_achievements,
    update_achievement,
    delete_achievement,
)
