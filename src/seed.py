#!/usr/bin/env python3
"""Populate a demo explorer, Mergo, with a believable back catalogue.

Run from this directory, the same working directory app.py uses:

    python seed.py            # create or top up Mergo
    python seed.py --reset    # wipe his finds and stamps first, then re-seed
    python seed.py --no-geocode   # skip the Nominatim lookups (offline demos)

Every find goes through the same services a real capture does - the image is
compressed by storage.save_upload_to_tempfile and copied in by db.add_item, the
place name comes from geocoding, and the stamps are computed from the finds by
achievements.evaluate_and_unlock. Nothing here writes a stamp directly: if a
find were removed the stamps would recompute honestly on the next evaluation.
"""

import argparse
import random
import sqlite3
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parent
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from werkzeug.datastructures import FileStorage

from core.models import (
    CATEGORIES,
    CULTURAL_SUBCATEGORIES,
    CULTURAL_TIME_PERIODS,
    NATURAL_SUBCATEGORIES,
    NATURAL_TIME_PERIODS,
    HeritageItem,
)
from services import achievements, database as db, geocoding, geography, storage
from services.database.connections import db_connection_handling
from services.database import user_table

SEED_IMAGES = SRC_DIR / "services" / "data" / "seed_images"

# Default subject: deliberately not a real Auth0 one, so a demo profile can
# never collide with an actual account. Nobody can sign in as this - it is only
# ever reached by opening Mergo's profile from the friends list.
#
# Once Mergo exists in Auth0 for real, pass that subject with --auth0-id to
# seed straight into it, or --migrate-to to move an already-seeded catalogue
# across. The subject is the token's `sub` claim: "auth0|68c3...",
# "google-oauth2|1003...".
DEMO_AUTH0_ID = "seed|mergo"
DEMO_USERNAME = "mergo"
DEMO_DISPLAY_NAME = "Mergo"

SUBCATEGORIES_BY_CATEGORY = {
    "CULTURAL": CULTURAL_SUBCATEGORIES,
    "NATURAL": NATURAL_SUBCATEGORIES,
}
TIME_PERIODS_BY_CATEGORY = {
    "CULTURAL": CULTURAL_TIME_PERIODS,
    "NATURAL": NATURAL_TIME_PERIODS,
}

# Nominatim asks for no more than a request a second. The app never needs to
# pace itself - it looks a place up once, when you save a find - but fourteen
# in a row does.
GEOCODE_INTERVAL_SECONDS = 1.1

# Which find Mergo has starred. The profile only shows a favourite when one is
# genuinely marked, so without this the card stays empty.
FAVORITE_INDEX = 5  # Gneiss cliff, dry valley - the standout of the fourteen


# Each row is one find. days_ago is measured from the moment the script runs,
# so the activity heatmap stays populated however long after seeding the demo
# happens: eight of these land inside its rolling seventeen-week window, and
# the rest give the journal a history behind that.
#
# Coordinates were each checked against geography.continent_for_coordinates -
# all seven continents are represented, which is what World Traveler needs.
# Images are reused across finds where the subject still makes sense in the
# new place; every find gets its own stored copy, exactly as two real captures
# of the same thing would.
FINDS = [
    # (image, name, category, sub_category, time_period, lat, lon, days_ago, hour, description)
    ("geology-3.png", "Folded schist outcrop", "NATURAL", "LANDFORM", "precambrian",
     57.27, -5.52, 706, 11,
     "Roadside cutting above the loch. The banding is buckled right over on "
     "itself, which the guidebook says took two continents colliding."),

    ("geology-1.png", "Banded agate nodule", "NATURAL", "GEOLOGY", "cretaceous",
     -30.40, -56.47, 631, 15,
     "Weathered out of the basalt and lying loose in the gravel. Cut face "
     "already polished smooth by the river."),

    ("art-1.png", "Evening landscape, oil on canvas", "CULTURAL", "ART", "early modern",
     52.36, 4.88, 574, 14,
     "Hung alone on the long wall. Unsigned, and the card beside it only "
     "offered a workshop and a decade."),

    ("aquatic-life-2.png", "Common starfish in a tide pool", "NATURAL", "AQUATIC", "quaternary",
     -42.00, 146.60, 498, 9,
     "Low tide, in the cold pool under the headland. Left where it was - it "
     "had a grip on the rock and I wasn't going to be the one to break it."),

    ("geology-2.png", "Obsidian from the flow front", "NATURAL", "GEOLOGY", "quaternary",
     43.72, -121.23, 421, 16,
     "The whole slope is glass. This piece had a fresh conchoidal break, "
     "sharp enough that I carried it in a fold of map."),

    ("geology-3.png", "Gneiss cliff, dry valley", "NATURAL", "GEOLOGY", "precambrian",
     -77.50, 161.90, 372, 13,
     "No snow here, no soil, nothing growing. Just the rock lying open with "
     "its layers showing, older than almost anything else I've written down."),

    ("aquatic-life-1.png", "Sunfish in the shallows", "NATURAL", "AQUATIC", "quaternary",
     46.00, -89.70, 318, 10,
     "Holding station in the weed at the lake edge, turning just enough to "
     "keep one eye on me. Gone the moment the shadow moved."),

    ("geology-1.png", "Agate from a dry riverbed", "NATURAL", "GEOLOGY", "neogene",
     -22.50, 15.90, 262, 17,
     "Picked out of a wash that only runs a few days a year. The banding "
     "goes right through - you can see it against the low sun."),

    ("art-1.png", "Painted panel, temple hall", "CULTURAL", "ART", "late middle ages",
     35.00, 135.78, 197, 11,
     "Screen panel at the back of the hall, behind rope. Gold ground gone "
     "brown, the landscape on it still reading clearly."),

    ("geology-2.png", "Volcanic glass, caldera rim", "NATURAL", "GEOLOGY", "quaternary",
     36.40, 138.50, 141, 8,
     "Scattered across the rim path among the pumice. Heavier in the hand "
     "than it looks."),

    ("geology-3.png", "Contorted gneiss, ridge line", "NATURAL", "LANDFORM", "precambrian",
     -49.30, -72.90, 98, 12,
     "Whole ridge is folded like cloth. Took the photograph from the moraine "
     "below because there was no getting closer in that wind."),

    ("geology-1.png", "Agate seam in basalt", "NATURAL", "GEOLOGY", "jurassic",
     31.05, -7.92, 64, 15,
     "Still in the parent rock, which I'd not seen before - every other one "
     "I've logged was already loose."),

    ("aquatic-life-2.png", "Starfish, rock shelf at low water", "NATURAL", "AQUATIC", "quaternary",
     -44.67, 167.92, 33, 7,
     "Second one of these in the journal and a hemisphere away from the "
     "first. Paler, and a good deal larger across."),

    ("geology-2.png", "Obsidian scatter, high desert", "NATURAL", "LANDFORM", "quaternary",
     38.30, -109.55, 9, 16,
     "Fragments worked loose across a whole terrace of red dirt. Catches the "
     "light from a long way off, which is how I found it."),
]


# The rest of the album. Every card on the Entries page is keyed by
# category + sub_category, so these fill in the eight pairs the seed
# photographs don't cover, and the Collection bars on the profile pick the
# counts up for free.
#
# No coordinates: these are entries logged without a location fix, which the
# map and the continent lookup both skip. The photographs are reused - the
# point of these rows is the category, not the picture.
#
# (category, sub_category, image, time periods to draw from, name pool)
FILLER = [
    ("CULTURAL", "ARCHITECTURE", "art-1.png",
     ("high middle ages", "renaissance", "early modern", "industrial era"),
     ["Cast-iron warehouse front", "Stepped gable row", "Timber-framed inn",
      "Cloister arcade", "Tiled dome, market hall", "Corbelled stone hut",
      "Iron footbridge", "Lime-washed farmstead", "Brick chimney stack"]),

    ("CULTURAL", "MONUMENT", "geology-3.png",
     ("ancient", "classical antiquity", "late middle ages", "modern"),
     ["Weathered obelisk", "Village war memorial", "Standing stone",
      "Boundary cross", "Bronze equestrian statue", "Memorial arch",
      "Carved gravestone", "Cairn on the summit", "Fountain, market square"]),

    ("CULTURAL", "ARTIFACT", "art-1.png",
     ("bronze age", "iron age", "ancient", "classical antiquity", "early middle ages"),
     ["Clay oil lamp", "Bronze fibula", "Glass trade bead", "Iron key",
      "Bone needle", "Flint scraper", "Pewter spoon", "Lead seal",
      "Ceramic sherd, glazed rim"]),

    ("CULTURAL", "HISTORICAL SITE", "geology-3.png",
     ("prehistoric", "stone age", "iron age", "ancient", "late middle ages"),
     ["Terraced field system", "Hillfort ditch", "Abandoned mine adit",
      "Kiln floor", "Drovers' road", "Ruined chapel", "Earthwork enclosure",
      "Quay wall, silted harbour", "Charcoal platform"]),

    ("CULTURAL", "OTHER", "art-1.png",
     ("industrial era", "modern", "contemporary"),
     ["Painted shop sign", "Milestone, old post road", "Carved lintel date",
      "Ferry bell", "Boundary marker plate", "Tiled street name",
      "Mason's mark", "Weather vane", "Cast date stone"]),

    ("NATURAL", "FOSSIL", "geology-1.png",
     ("ordovician", "devonian", "carboniferous", "jurassic", "cretaceous"),
     ["Ammonite in shale", "Crinoid stems", "Fern impression", "Brachiopod bed",
      "Trilobite fragment", "Belemnite guard", "Coral head, weathered out",
      "Petrified wood", "Shark tooth"]),

    ("NATURAL", "WILDLIFE", "aquatic-life-1.png",
     ("quaternary",),
     ["Red deer at the edge of the pines", "Kestrel over the ridge",
      "Common lizard on the wall", "Hare in stubble", "Treecreeper",
      "Roe deer tracks", "Grass snake, sunning", "Buzzard pair", "Badger sett"]),

    ("NATURAL", "OTHER", "geology-2.png",
     ("quaternary",),
     ["Lichen on slate", "Frost feathers on glass", "Sun pillar at dusk",
      "Hoar on bracken", "Fairy ring", "Dew pond", "Spring head, chalk",
      "Bracket fungus", "Rime on a fence wire"]),
]

# How many entries each filler category gets. Random within this range, but
# from a fixed seed - a demo that reshuffles every time it is re-seeded is
# harder to talk over than one that doesn't.
FILLER_COUNT_RANGE = (3, 9)
FILLER_SEED = 20260913


def build_filler_rows() -> list[tuple]:
    """Expand the FILLER table into rows shaped like FINDS, minus coordinates."""
    rng = random.Random(FILLER_SEED)
    rows = []
    for category, sub_category, image, periods, names in FILLER:
        count = rng.randint(*FILLER_COUNT_RANGE)
        for name in rng.sample(names, count):
            rows.append((
                image, name, category, sub_category, rng.choice(periods),
                None, None,                      # no location fix on these
                rng.randint(5, 700), rng.randint(7, 18),
                None,                            # and no field note
            ))
    return rows


def _validate_finds() -> None:
    """Reject anything the app's own POST /api/items would have rejected."""
    missing = {name for name, *_ in FINDS if not (SEED_IMAGES / name).is_file()}
    if missing:
        raise SystemExit(f"Missing seed images in {SEED_IMAGES}: {', '.join(sorted(missing))}")
    for _, name, category, sub_category, time_period, *_ in FINDS:
        if category not in CATEGORIES:
            raise SystemExit(f"{name}: category must be one of {CATEGORIES}")
        if sub_category not in SUBCATEGORIES_BY_CATEGORY[category]:
            raise SystemExit(f"{name}: {sub_category} is not a {category} sub-category")
        if time_period not in TIME_PERIODS_BY_CATEGORY[category]:
            raise SystemExit(f"{name}: {time_period} is not a {category} time period")

    for category, sub_category, image, periods, names in FILLER:
        label = f"{category}/{sub_category}"
        if not (SEED_IMAGES / image).is_file():
            raise SystemExit(f"{label}: missing seed image {image}")
        if sub_category not in SUBCATEGORIES_BY_CATEGORY[category]:
            raise SystemExit(f"{label} is not a real sub-category pair")
        for period in periods:
            if period not in TIME_PERIODS_BY_CATEGORY[category]:
                raise SystemExit(f"{label}: {period} is not a {category} time period")
        if len(names) < FILLER_COUNT_RANGE[1]:
            raise SystemExit(f"{label}: needs at least {FILLER_COUNT_RANGE[1]} names, has {len(names)}")

    # Every card on the Entries page should end up discovered.
    covered = {(category, sub_category) for _, _, category, sub_category, *_ in FINDS}
    covered |= {(category, sub_category) for category, sub_category, *_ in FILLER}
    everything = {(category, sub_category)
                  for category, subs in SUBCATEGORIES_BY_CATEGORY.items() for sub_category in subs}
    if everything - covered:
        raise SystemExit("No entries seeded for: " +
                         ", ".join(f"{c}/{s}" for c, s in sorted(everything - covered)))


@db_connection_handling
def _backdate_user_created_at(conn: sqlite3.Connection, user_id: int, created_at: int) -> None:
    """Move the profile's creation time back to the first find.

    The only write here that no service covers: created_at is deliberately not
    in USER_UPDATABLE_COLUMNS, because nothing in the running app should ever
    move it. A seeded journal that claims to have started this afternoon
    undercuts the whole demo, so the script reaches past that one guard - and
    only that one - using the app's own connection handling and database path.
    """
    with conn:
        conn.execute("UPDATE users SET created_at = ? WHERE user_id = ?", (created_at, user_id))


def get_demo_user(auth0_id: str = DEMO_AUTH0_ID):
    """Fetch or create Mergo through the real user service.

    Signing into the app with this subject creates the same row by the same
    call, so seeding first and signing in later lands on one profile, not two.
    """
    user = user_table.get_or_create_user(auth0_id)
    if user.username != DEMO_USERNAME:
        user_table.update_user(user, "username", DEMO_USERNAME)
    if user.display_name != DEMO_DISPLAY_NAME:
        user_table.update_user(user, "display_name", DEMO_DISPLAY_NAME)
    return user


@db_connection_handling
def _reassign_items(conn: sqlite3.Connection, from_user_id: int, to_user_id: int) -> int:
    """Move every find from one profile to another.

    The second write no service covers, for the same reason as created_at: the
    running app has no concept of an entry changing hands, and shouldn't. A
    migration does, so it reaches past that using the app's own connection.
    """
    with conn:
        cursor = conn.execute(
            "UPDATE heritage_items SET user_id = ? WHERE user_id = ?", (to_user_id, from_user_id),
        )
    return cursor.rowcount


def migrate(auth0_id: str) -> None:
    """Hand the seeded catalogue to a real Auth0 account, placeholder and all.

    Everything moves: finds keep their images, dates, places and favourite,
    stamps are recomputed on the far side, the journal-started date follows,
    and any friendship the placeholder had is rebuilt against the new profile.
    """
    placeholder = user_table.get_user_by_auth0_id(DEMO_AUTH0_ID)
    if placeholder is None:
        raise SystemExit(f"Nothing to migrate: no profile with auth0_id {DEMO_AUTH0_ID!r}. "
                         f"Seed first, or use --auth0-id to seed straight into the real account.")
    if placeholder.auth0_id == auth0_id:
        raise SystemExit("Source and target are the same profile")

    # Who was friends with the placeholder, so the same people follow it over.
    friends = [friend.user_id for friend in db.list_friends(placeholder.user_id)]

    # The username index is UNIQUE, so the placeholder has to let go of the
    # name before the real account can take it.
    user_table.update_user(placeholder, "username", None)

    target = user_table.get_or_create_user(auth0_id)
    if target.user_id == placeholder.user_id:
        raise SystemExit("Source and target resolved to the same row")
    user_table.update_user(target, "username", DEMO_USERNAME)
    user_table.update_user(target, "display_name", DEMO_DISPLAY_NAME)

    moved = _reassign_items(placeholder.user_id, target.user_id)

    # Stamps belong to the finds, so drop the placeholder's and recompute.
    for link in db.get_user_achievements_by_user_id(placeholder.user_id):
        db.delete_user_achievement(link)
    achievements.evaluate_and_unlock(target.user_id)

    items = db.return_all_items(target.user_id)
    if items:
        _backdate_user_created_at(target.user_id, min(item.time_taken for item in items))

    for friend_id in friends:
        db.remove_friendship(placeholder.user_id, friend_id)
        db.remove_friendship(target.user_id, friend_id)
        db.send_friend_request(target.user_id, friend_id)
        db.accept_friend_request(friend_id, target.user_id)

    user_table.delete_user(placeholder)

    print(f"Migrated {moved} finds from {DEMO_AUTH0_ID!r} (user_id {placeholder.user_id}) "
          f"to {auth0_id!r} (user_id {target.user_id})")
    if friends:
        print(f"Rebuilt {len(friends)} friendship(s) against the new profile")
    print("Placeholder profile removed. Signing in as this Auth0 account now lands on Mergo's journal.")


def reset(user) -> tuple[int, int]:
    """Drop Mergo's finds (and their images) and his stamp progress."""
    items = db.return_all_items(user.user_id)
    for item in items:
        db.full_delete(item, user_id=user.user_id)

    links = db.get_user_achievements_by_user_id(user.user_id)
    for link in links:
        db.delete_user_achievement(link)
    return len(items), len(links)


def link_friendship(user, username: str) -> None:
    """Put Mergo on someone's friends list, both directions accepted.

    A friend's profile is gated on db.are_friends, and Mergo has no real Auth0
    account to sign in and accept a request with - so without this he is only
    reachable by username search. Opt-in, because it writes to a real account's
    friends list.
    """
    other = user_table.get_user_by_username(username)
    if other is None:
        raise SystemExit(f"No user named '{username}' to befriend. "
                         f"Known usernames: {[u.username for u in db.return_all_users() if u.username]}")
    if other.user_id == user.user_id:
        raise SystemExit("Cannot befriend the demo user with itself")

    # Rebuilt rather than patched, so a half-finished request from an earlier
    # run can't leave the pair stuck pending.
    db.remove_friendship(user.user_id, other.user_id)
    db.send_friend_request(user.user_id, other.user_id)
    db.accept_friend_request(other.user_id, user.user_id)
    print(f"Friendship: {DEMO_DISPLAY_NAME} <-> @{other.username} (accepted both ways)")


def create_find(user, row, *, now, geocode: bool) -> HeritageItem:
    """Save one find exactly the way POST /api/items saves a real capture."""
    (image_name, name, category, sub_category, time_period,
     latitude, longitude, days_ago, hour, description) = row

    source = SEED_IMAGES / image_name
    with source.open("rb") as stream:
        # The same compression a phone upload gets: EXIF-rotated, capped to
        # MAX_DIMENSION, re-encoded as JPEG. Seeded rows are then byte-for-byte
        # the same kind of file as captured ones.
        upload = FileStorage(stream=stream, filename=source.name)
        tmp_image_path = storage.save_upload_to_tempfile(upload)

    item = HeritageItem(
        user_id=user.user_id,
        name=name,
        category=category,
        sub_category=sub_category,
        image_path=tmp_image_path,
        latitude=latitude,
        longitude=longitude,
        time_period=time_period,
        description=description,
        confidence="0.93",
    )
    try:
        db.add_item(item)
    finally:
        tmp_image_path.unlink(missing_ok=True)  # add_item copies from this, never deletes it

    # add_item lets the database stamp time_taken as now, which is right for a
    # real capture and wrong for a back catalogue. time_taken is the same value
    # the activity heatmap groups by, so moving it here moves the heatmap too -
    # there is no second set of dates anywhere.
    discovered = now - timedelta(days=days_ago)
    discovered = discovered.replace(hour=hour, minute=(days_ago * 7) % 60, second=0, microsecond=0)
    db.update_item(item, "time_taken", int(discovered.timestamp()), user_id=user.user_id)
    item.time_taken = int(discovered.timestamp())

    if geocode and latitude is not None and longitude is not None:
        place = geocoding.place_for_coordinates(item.latitude, item.longitude)
        if place:
            db.update_item(item, "place_name", place, user_id=user.user_id)
            item.place_name = place

    return item


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the Mergo demo profile.")
    parser.add_argument("--reset", action="store_true",
                        help="delete Mergo's existing finds and stamps before seeding")
    parser.add_argument("--no-geocode", action="store_true",
                        help="skip reverse geocoding; finds keep coordinates but get no place name")
    parser.add_argument("--auth0-id", metavar="SUBJECT", default=DEMO_AUTH0_ID,
                        help="seed into this Auth0 subject (the token's `sub` claim) instead of "
                             f"the {DEMO_AUTH0_ID!r} placeholder")
    parser.add_argument("--migrate-to", metavar="SUBJECT",
                        help=f"move an already-seeded catalogue off the {DEMO_AUTH0_ID!r} "
                             "placeholder onto this real Auth0 subject, then exit")
    parser.add_argument("--friend-with", metavar="USERNAME",
                        help="add Mergo to this account's friends list, so his profile "
                             "is reachable in the demo (friend profiles are gated on friendship)")
    args = parser.parse_args()

    if args.migrate_to:
        migrate(args.migrate_to)
        return

    _validate_finds()

    # The same bootstrap app.py runs before every request.
    db.create_db()
    db.create_achievements_db()
    db.create_user_achievements_db()
    db.create_friendships_db()
    achievements.seed_defaults()

    user = get_demo_user(args.auth0_id)
    print(f"Demo user: {DEMO_DISPLAY_NAME} (@{DEMO_USERNAME}, user_id={user.user_id}, "
          f"auth0_id={user.auth0_id!r})")

    if args.reset:
        finds_removed, stamps_removed = reset(user)
        print(f"Reset: removed {finds_removed} finds and {stamps_removed} stamp records")

    geocode = not args.no_geocode
    if geocode:
        print(f"Geocoding {len(FINDS)} coordinates via Nominatim "
              f"(~{GEOCODE_INTERVAL_SECONDS * len(FINDS):.0f}s, one request a second)...")

    now = datetime.now(timezone.utc)
    created = []
    for index, row in enumerate(FINDS):
        item = create_find(user, row, now=now, geocode=geocode)
        created.append(item)
        where = item.place_name or f"{item.latitude:.2f}, {item.longitude:.2f}"
        print(f"  {index + 1:2}. {item.name} - {where}")
        if geocode and index < len(FINDS) - 1:
            time.sleep(GEOCODE_INTERVAL_SECONDS)

    filler_rows = build_filler_rows()
    print(f"Filling in the remaining categories ({len(filler_rows)} entries, no location)...")
    filler = [create_find(user, row, now=now, geocode=False) for row in filler_rows]
    created.extend(filler)
    tally = {}
    for item in filler:
        key = f"{item.category}/{item.sub_category}"
        tally[key] = tally.get(key, 0) + 1
    for key, count in sorted(tally.items()):
        print(f"  {key}: {count}")

    # A starred find, so the profile's Favorite find card has something in it.
    favorite = created[FAVORITE_INDEX]
    db.update_item(favorite, "is_favorite", 1, user_id=user.user_id)
    print(f"Starred: {favorite.name}")

    if args.friend_with:
        link_friendship(user, args.friend_with)

    # Journal started reads user.created_at first, falling back to the earliest
    # find. Line the two up so it says the same thing either way.
    earliest = min(item.time_taken for item in created)
    _backdate_user_created_at(user.user_id, earliest)

    # Computed from the finds above, not written directly.
    achievements.evaluate_and_unlock(user.user_id)

    _summarize(user, created, earliest)


def _summarize(user, created, earliest: int) -> None:
    latest = max(item.time_taken for item in created)
    by_category = {}
    for item in created:
        by_category.setdefault(f"{item.category}/{item.sub_category}", 0)
        by_category[f"{item.category}/{item.sub_category}"] += 1

    continents = {}
    for item in created:
        if item.latitude is None or item.longitude is None:
            key = "unplaced"  # deliberately has no location fix
        else:
            key = geography.continent_for_coordinates(item.latitude, item.longitude) or "unresolved"
        continents[key] = continents.get(key, 0) + 1

    periods = sorted({item.time_period for item in created})
    days = sorted({datetime.fromtimestamp(item.time_taken, timezone.utc).date() for item in created})
    unlocked = [entry for entry in achievements.get_all_with_progress(user.user_id) if entry["unlocked"]]
    locked = [entry for entry in achievements.get_all_with_progress(user.user_id) if not entry["unlocked"]]

    def when(stamp: int) -> str:
        return datetime.fromtimestamp(stamp, timezone.utc).strftime("%d %b %Y")

    everything = {(category, sub_category)
                  for category, subs in SUBCATEGORIES_BY_CATEGORY.items() for sub_category in subs}
    located = [item for item in created if item.latitude is not None]

    print()
    print(f"Entries created    {len(created)} ({len(located)} with a location, "
          f"{len(created) - len(located)} without)")
    print(f"Album cards        {len(by_category)}/{len(everything)} discovered")
    for key, count in sorted(by_category.items()):
        print(f"                     {key:<24} {count}")
    print(f"Time periods       {len(periods)} - {', '.join(periods)}")
    print(f"Date range         {when(earliest)} to {when(latest)} "
          f"({len(days)} distinct days on the heatmap)")
    print(f"Journal started    {when(earliest)} (users.created_at aligned to the first find)")
    placed = {key: count for key, count in continents.items() if key != "unplaced"}
    print(f"Map regions        {len(placed)} - " +
          ", ".join(f"{key} x{count}" for key, count in sorted(placed.items())))
    print(f"Stamps unlocked    {len(unlocked)} - " +
          ", ".join(entry["name"] for entry in unlocked))
    if locked:
        print(f"Still locked       " +
              ", ".join(f"{entry['name']} ({entry['progress']}/{entry['threshold']})"
                        for entry in locked))

    if "unresolved" in continents:
        print()
        print(f"WARNING: {continents['unresolved']} coordinate(s) did not resolve to a "
              "continent, so World Traveler will not unlock. Move them further inland.")


if __name__ == "__main__":
    main()
