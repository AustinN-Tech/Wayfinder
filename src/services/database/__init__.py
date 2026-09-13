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
    create_users_db,
    create_user_achievements_db,
    create_friendships_db,
)
from .items_table import (
    ITEM_COLUMNS,
    UPDATABLE_COLUMNS,
    row_to_heritage_item,
    add_item,
    delete_item,
    delete_all_db,
    update_item,
    update_item_fields,
    return_all_items,
    get_item_rule_counts,
    get_user_item_coordinates,
    get_item_by_name,
    get_item_by_id,
    get_favorite_item,
    get_activity_by_day,
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
    sync_achievement_definitions,
)
from .user_table import (
    USER_COLUMNS,
    USER_UPDATABLE_COLUMNS,
    row_to_user,
    add_user,
    get_user_by_id,
    get_user_by_auth0_id,
    get_user_by_username,
    search_users_by_username,
    return_all_users,
    update_user,
    delete_user,
)
from .friends_table import (
    get_friendship_status,
    send_friend_request,
    accept_friend_request,
    remove_friendship,
    list_friends,
    list_incoming_requests,
    list_outgoing_requests,
    are_friends,
)
from .user_achievements_table import (
    row_to_user_achievement,
    add_user_achievement,
    get_user_achievement,
    get_user_achievements_by_user_id,
    get_user_achievements_by_achievement_id,
    return_all_user_achievements,
    update_user_achievement,
    delete_user_achievement,
    record_user_achievement_progress,
)
