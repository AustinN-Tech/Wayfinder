import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from core.models import User
from services import database as db, user_service


class UserServiceTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        patcher = patch.object(db.connections, "DB_PATH", Path(temporary.name) / "test.db")
        patcher.start()
        self.addCleanup(patcher.stop)
        db.create_users_db()
        self.user = User(auth0_id="auth0|first")
        self.other = User(auth0_id="auth0|second", username="unchanged")
        db.add_user(self.user)
        db.add_user(self.other)

    def test_updates_and_clears_profile_for_matching_user(self):
        updated = user_service.update_username(self.user.auth0_id, "new_username")
        self.assertEqual(updated.username, "new_username")
        self.assertEqual(db.get_user_by_id(self.user.user_id), updated)
        updated = user_service.update_user(self.user.auth0_id, "display_name", "New Name")
        self.assertEqual(updated.display_name, "New Name")
        self.assertEqual(updated.username, "new_username")
        updated = user_service.update_username(self.user.auth0_id, None)
        self.assertIsNone(updated.username)
        self.assertEqual(db.get_user_by_id(self.user.user_id), updated)
        self.assertEqual(db.get_user_by_id(self.other.user_id), self.other)

    def test_missing_and_invalid_auth0_ids_do_not_create_users(self):
        for auth0_id in ("auth0|missing", "", " ", None):
            with self.assertRaises(ValueError):
                user_service.update_username(auth0_id, "name")
        self.assertEqual(db.return_all_users(), [self.user, self.other])

    def test_invalid_changes_preserve_profile(self):
        for column in ("auth0_id", "user_id", "created_at", "unknown"):
            with self.assertRaises(ValueError):
                user_service.update_user(self.user.auth0_id, column, "changed")
        with self.assertRaises(TypeError):
            user_service.update_username(self.user.auth0_id, 123)
        self.assertEqual(db.get_user_by_id(self.user.user_id), self.user)


if __name__ == "__main__":
    unittest.main()
