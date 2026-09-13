import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

from core.models import Achievement, User, UserAchievement
from services import achievements, database as db, geography


CONTINENT_POINTS = {
    "North America": (41.88, -87.63),
    "South America": (-15.8, -47.9),
    "Africa": (-1.29, 36.82),
    "Europe": (48.86, 2.35),
    "Asia": (35.68, 139.69),
    "Oceania": (-35.28, 149.13),
    "Antarctica": (-80, 0),
}


class GeographyTests(unittest.TestCase):
    def test_seven_continents_and_geographic_overseas_locations(self):
        for continent, point in CONTINENT_POINTS.items():
            with self.subTest(continent=continent):
                self.assertEqual(geography.continent_for_coordinates(*point), continent)
        for point, continent in (
            ((60, 100), "Asia"), ((55.75, 37.61), "Europe"),
            ((4, -53), "South America"), ((72, -40), "North America"),
            ((19.6, -155.5), "Oceania"), ((-45, 169), "Oceania"),
        ):
            with self.subTest(point=point):
                self.assertEqual(geography.continent_for_coordinates(*point), continent)

    def test_invalid_and_ocean_points_are_unknown(self):
        for point in ((None, 0), (0, None), (float("nan"), 0), (0, float("inf")),
                      (91, 0), (0, 181), ("48", 2), (True, 2), (0, 0), (0, -140)):
            with self.subTest(point=point):
                self.assertIsNone(geography.continent_for_coordinates(*point))


class HackathonAchievementTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        patcher = patch.object(db.connections, "DB_PATH", Path(temporary.name) / "test.db")
        patcher.start()
        self.addCleanup(patcher.stop)
        db.create_db()
        db.create_achievements_db()
        db.create_user_achievements_db()
        db.add_user(User(auth0_id="auth0|one"))
        db.add_user(User(auth0_id="auth0|two"))
        self.counter = 0

    def discover(self, count=1, user_id=1, category="NATURAL", sub_category="FOSSIL",
                 period="cambrian", point=(0, 0)):
        # Seed discovery rows directly: these tests exercise count rules, not file copying.
        with closing(sqlite3.connect(db.connections.DB_PATH)) as conn:
            conn.execute("PRAGMA foreign_keys=ON")
            with conn:
                for _ in range(count):
                    self.counter += 1
                    conn.execute("""
                        INSERT INTO heritage_items (user_id, name, category, sub_category,
                            image_path, latitude, longitude, time_period, confidence_score)
                        VALUES (?, 'Independent discovery', ?, ?, ?, ?, ?, ?, 'high')
                    """, (user_id, category, sub_category, f"image_{self.counter}.jpg", *point, period))

    def states(self, user_id=1):
        return {state["code"]: state for state in achievements.get_all_with_progress(user_id)}

    def test_exact_catalog_and_idempotent_seed(self):
        achievements.seed_defaults()
        achievements.seed_defaults()
        self.assertEqual([(a.code, a.threshold) for a in db.return_all_achievements()], [
            ("first_find", 1), ("small_collection", 5), ("medium_collection", 20),
            ("large_collection", 50), ("both_worlds", 2), ("time_traveler", 3),
            ("dino_hunter", 10), ("shiny", 10), ("world_traveler", 7),
            ("connoisseur", 10),
        ])
        self.assertIsNone(db.get_achievement_by_code("getting_serious"))

    def test_collection_threshold_boundaries(self):
        achievements.seed_defaults()
        for total, code in ((1, "first_find"), (5, "small_collection"),
                            (20, "medium_collection"), (50, "large_collection")):
            self.discover(total - 1 - self.counter)
            achievements.evaluate_and_unlock(1)
            self.assertFalse(self.states()[code]["unlocked"])
            self.discover()
            unlocked = achievements.evaluate_and_unlock(1)
            self.assertIn(code, [a["code"] for a in unlocked])
            self.assertTrue(self.states()[code]["unlocked"])

    def test_targeted_rules_categories_and_time_periods(self):
        achievements.seed_defaults()
        self.discover(9)
        self.discover(9, sub_category="GEOLOGY", period=" ")
        self.discover(category="CULTURAL", sub_category="ART", period="renaissance")
        achievements.evaluate_and_unlock(1)
        states = self.states()
        self.assertEqual(states["dino_hunter"]["progress"], 9)
        self.assertEqual(states["shiny"]["progress"], 9)
        self.assertTrue(states["both_worlds"]["unlocked"])
        self.assertFalse(states["time_traveler"]["unlocked"])
        self.assertEqual(states["time_traveler"]["progress"], 2)
        self.discover(period="jurassic")
        self.discover(sub_category="GEOLOGY")
        unlocked = {a["code"] for a in achievements.evaluate_and_unlock(1)}
        self.assertTrue({"dino_hunter", "shiny", "time_traveler"}.issubset(unlocked))
        for state in self.states(2).values():
            self.assertEqual(state["progress"], 0)
            self.assertFalse(state["unlocked"])

    def test_world_traveler_counts_distinct_continents_per_user(self):
        achievements.seed_defaults()
        points = list(CONTINENT_POINTS.values())
        for point in points[:-1]:
            self.discover(point=point)
        self.discover(point=points[0])
        self.discover(point=(0, -140))
        self.discover(point=(95, 0))
        self.discover(user_id=2, point=points[-1])
        achievements.evaluate_and_unlock(1)
        state = self.states()["world_traveler"]
        self.assertEqual(state["progress"], 6)
        self.assertFalse(state["unlocked"])
        definition = db.get_achievement_by_code("world_traveler")
        link = db.get_user_achievement(1, definition.achievement_id)
        self.assertEqual(link.progress, 85)
        self.assertIsNone(link.earned_at)
        self.discover(point=points[-1])
        self.assertIn("world_traveler", [a["code"] for a in achievements.evaluate_and_unlock(1)])
        link = db.get_user_achievement(1, definition.achievement_id)
        self.assertEqual(link.progress, 100)
        self.assertIsInstance(link.earned_at, int)
        original_time = link.earned_at
        db.delete_all_db(1)
        self.assertEqual(achievements.evaluate_and_unlock(1), [])
        self.assertEqual(db.get_user_achievement(1, definition.achievement_id).earned_at, original_time)
        self.assertEqual(self.states()["world_traveler"]["progress"], 7)

    def test_replace_placeholders_preserves_matching_ids_and_earned_times(self):
        old = [
            Achievement(1, "first_find", "First Find", "entry_count", 1),
            Achievement(2, "getting_serious", "Getting Serious", "entry_count", 10),
            Achievement(3, "both_worlds", "Both Worlds", "distinct_categories", 2),
            Achievement(4, "time_traveler", "Time Traveler", "distinct_time_periods", 3),
        ]
        for definition in old:
            db.add_achievement(definition)
            db.add_user_achievement(UserAchievement(1, definition.achievement_id, 100, 1, 123))
        db.add_achievement(Achievement(50, "custom", "Custom", "entry_count", 100))
        achievements.seed_defaults()
        achievements.seed_defaults()
        self.assertIsNone(db.get_achievement_by_code("getting_serious"))
        self.assertIsNone(db.get_user_achievement(1, 2))
        for code, item_id in (("first_find", 1), ("both_worlds", 3), ("time_traveler", 4)):
            self.assertEqual(db.get_achievement_by_code(code).achievement_id, item_id)
            self.assertEqual(db.get_user_achievement(1, item_id).earned_at, 123)
        self.assertEqual(db.get_achievement_by_code("custom").achievement_id, 50)
        expected = [definition.code for definition in achievements.DEFAULT_ACHIEVEMENTS]
        self.assertEqual(
            [state["code"] for state in achievements.get_all_with_progress(1)][:len(expected)],
            expected,
        )


if __name__ == "__main__":
    unittest.main()
