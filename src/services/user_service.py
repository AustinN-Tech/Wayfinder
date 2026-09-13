"""Local user profile operations for callers with an authenticated Auth0 ID."""

from core.models import User
from services.database import user_table, get_user_by_auth0_id, add_user, delete_user
from utilities.util import error_handling


@error_handling
def get_or_create_user(auth0_id: str) -> User:
    return user_table.get_or_create_user(auth0_id)

@error_handling
def update_user(auth0_id: str, column: str, value: str | None) -> User:
    """Update a local profile field and return the updated user.

    The caller supplies the Auth0 subject from its authenticated request.
    Only username and display_name are editable; None clears either field.
    This updates the local database, not the Auth0 account.
    """
    if not isinstance(auth0_id, str) or not auth0_id.strip():
        raise ValueError("auth0_id must be a non-empty string")
    user = user_table.get_user_by_auth0_id(auth0_id)
    if user is None:
        raise ValueError(f"No local user exists for Auth0 ID {auth0_id}")
    user_table.update_user(user, column, value)
    return user


def update_username(auth0_id: str, username: str | None) -> User:
    """Update or clear the local username and return the updated user."""
    return update_user(auth0_id, "username", username)


# to do
def delete_auth0_user(auth0_id: str):
    ...

def delete_account(user: User):
    delete_auth0_user(user.auth0_id)
    delete_user(user)
