import os
from dataclasses import asdict
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, g, jsonify, request, send_from_directory, abort
from flask_cors import CORS

load_dotenv()  # loads .env in local dev; no-op on Railway where vars are already set

from core.models import (
    CATEGORIES,
    CULTURAL_SUBCATEGORIES,
    NATURAL_SUBCATEGORIES,
    CULTURAL_TIME_PERIODS,
    NATURAL_TIME_PERIODS,
    HeritageItem,
)
from services import achievements
from services import database as db
from services import gemini_service
from services import storage
from services.auth import load_current_user
from services.storage import IMAGE_DIR
from utilities.util import initialize_logging, logger

initialize_logging()

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024  # 10 MB request cap
CORS(app, resources={r"/api/*": {"origins": os.environ.get("FRONTEND_ORIGIN") or "*"}})

SUBCATEGORIES_BY_CATEGORY = {
    "CULTURAL": CULTURAL_SUBCATEGORIES,
    "NATURAL": NATURAL_SUBCATEGORIES,
}

TIME_PERIODS_BY_CATEGORY = {
    "CULTURAL": CULTURAL_TIME_PERIODS,
    "NATURAL": NATURAL_TIME_PERIODS,
}


@app.before_request
def _ensure_db():
    db.create_db()
    db.create_achievements_db()
    db.create_user_achievements_db()
    db.create_friendships_db()
    achievements.seed_defaults()
    load_current_user()  # best-effort: sets g.user if a valid token was sent


@app.errorhandler(400)
@app.errorhandler(401)
@app.errorhandler(404)
@app.errorhandler(413)
@app.errorhandler(429)
@app.errorhandler(502)
@app.errorhandler(503)
def _json_error(err):
    return jsonify(error=err.description), err.code


@app.errorhandler(500)
def _json_server_error(err):
    logger.exception("Unhandled server error")
    return jsonify(error="Internal server error"), 500


def _item_to_dict(item):
    """Serialize a HeritageItem for the API - image_path becomes just the
    stored filename (not the server's absolute filesystem path)."""
    data = asdict(item)
    data["image_path"] = Path(item.image_path).name
    return data


def _current_user_id() -> int:
    """Auth middleware must set g.user from a verified Auth0 subject.

    Never derive ownership from request parameters, headers, or unverified JWTs.
    """
    user = getattr(g, "user", None)
    user_id = getattr(user, "user_id", None)
    if type(user_id) is not int or user_id <= 0:
        abort(401, description="Authentication required")
    persisted = db.get_user_by_id(user_id)
    if persisted is None or persisted.auth0_id != getattr(user, "auth0_id", None):
        abort(401, description="Authentication required")
    return user_id


@app.get("/health")
def health():
    return jsonify(status="ok")


@app.get("/api/categories")
def get_categories():
    return jsonify(
        categories=CATEGORIES,
        subcategories=SUBCATEGORIES_BY_CATEGORY,
        time_periods=TIME_PERIODS_BY_CATEGORY,
    )


@app.get("/api/items")
def list_items():
    return jsonify([_item_to_dict(item) for item in db.return_all_items(_current_user_id())])


@app.get("/api/items/<int:item_id>")
def get_item(item_id):
    item = db.get_item_by_id(item_id, user_id=_current_user_id())
    if item is None:
        abort(404, description="Item not found")
    return jsonify(_item_to_dict(item))


@app.post("/api/items/analyze")
def analyze_item():
    _current_user_id()
    if "image" not in request.files or request.files["image"].filename == "":
        abort(400, description="An 'image' file is required")

    image_file = request.files["image"]
    mime_type = image_file.mimetype or "image/jpeg"

    try:
        suggestions = gemini_service.analyze_image(image_file.read(), mime_type)
    except gemini_service.QuotaExceededError as exc:
        abort(429, description=str(exc))
    except RuntimeError as exc:
        abort(503, description=str(exc))
    except ValueError as exc:
        abort(502, description=str(exc))
    except Exception as exc:
        logger.exception("Gemini analysis failed")
        abort(502, description=f"{type(exc).__name__}: {exc}")

    return jsonify(suggestions=suggestions)


def _validate_category_fields(category, sub_category, time_period):
    if category not in CATEGORIES:
        abort(400, description=f"category must be one of {CATEGORIES}")
    if sub_category not in SUBCATEGORIES_BY_CATEGORY.get(category, []):
        abort(400, description=f"sub_category must be one of {SUBCATEGORIES_BY_CATEGORY.get(category, [])}")
    if time_period and time_period not in TIME_PERIODS_BY_CATEGORY.get(category, []):
        abort(400, description=f"time_period must be one of {TIME_PERIODS_BY_CATEGORY.get(category, [])}")


@app.post("/api/items")
def create_item():
    user_id = _current_user_id()
    form = request.form
    name = form.get("name")
    category = form.get("category")
    sub_category = form.get("sub_category")
    time_period = form.get("time_period")

    if not name or not category or not sub_category:
        abort(400, description="name, category, and sub_category are required")
    _validate_category_fields(category, sub_category, time_period)

    if "image" not in request.files or request.files["image"].filename == "":
        abort(400, description="An 'image' file is required - you have to record what you actually saw")

    try:
        tmp_image_path = storage.save_upload_to_tempfile(request.files["image"])
    except ValueError as exc:
        abort(400, description=str(exc))

    item = HeritageItem(
        user_id=user_id,
        name=name,
        category=category,
        sub_category=sub_category,
        image_path=tmp_image_path,
        latitude=form.get("latitude", type=float),
        longitude=form.get("longitude", type=float),
        time_period=time_period,
        description=form.get("description"),
        confidence=form.get("confidence", ""),
    )
    try:
        db.add_item(item)
    finally:
        tmp_image_path.unlink(missing_ok=True)  # add_item copies from this, never deletes it itself

    unlocked = achievements.evaluate_and_unlock(user_id)
    return jsonify(item=_item_to_dict(item), unlocked=unlocked), 201


@app.put("/api/items/<int:item_id>")
def update_item(item_id):
    user_id = _current_user_id()
    item = db.get_item_by_id(item_id, user_id=user_id)
    if item is None:
        abort(404, description="Item not found")

    form = request.form
    effective_category = form.get("category", item.category)
    effective_time_period = form.get("time_period", item.time_period)
    if "category" in form or "sub_category" in form:
        _validate_category_fields(
            effective_category,
            form.get("sub_category", item.sub_category),
            None,
        )
    if "time_period" in form and effective_time_period:
        if effective_time_period not in TIME_PERIODS_BY_CATEGORY.get(effective_category, []):
            abort(400, description=f"time_period must be one of {TIME_PERIODS_BY_CATEGORY.get(effective_category, [])}")

    updated_any = False
    try:
        for key in ("name", "category", "sub_category", "time_period", "description", "confidence"):
            if key in form:
                db.update_item(item, key, form.get(key), user_id=user_id)
                updated_any = True
        for key in ("latitude", "longitude"):
            if key in form:
                db.update_item(item, key, form.get(key, type=float), user_id=user_id)
                updated_any = True
        if "is_favorite" in form:
            db.update_item(item, "is_favorite", form.get("is_favorite", type=int) or 0, user_id=user_id)
            updated_any = True
    except ValueError:
        abort(404, description="Item not found")

    if "image" in request.files and request.files["image"].filename != "":
        try:
            tmp_image_path = storage.save_upload_to_tempfile(request.files["image"])
        except ValueError as exc:
            abort(400, description=str(exc))
        try:
            db.update_item(item, "image_path", tmp_image_path, user_id=user_id)
        except ValueError:
            abort(404, description="Item not found")
        finally:
            tmp_image_path.unlink(missing_ok=True)  # update_item copies from this, never deletes it itself
        updated_any = True

    if not updated_any:
        abort(400, description="No fields provided to update")

    return jsonify(_item_to_dict(item))


@app.delete("/api/items/<int:item_id>")
def remove_item(item_id):
    user_id = _current_user_id()
    item = db.get_item_by_id(item_id, user_id=user_id)
    if item is None:
        abort(404, description="Item not found")
    try:
        db.full_delete(item, user_id=user_id)
    except OSError as exc:
        # The image file was locked/in-use at this instant (e.g. still being
        # served to another request) - the DB change was rolled back, so the
        # item is untouched and safe to retry.
        logger.warning("Delete failed, image file was busy: %s", exc)
        abort(503, description="Could not delete right now - please try again")
    return "", 204


@app.get("/api/achievements")
def list_achievements():
    return jsonify(achievements.get_all_with_progress(_current_user_id()))


def _user_to_dict(user):
    return {
        "user_id": user.user_id,
        "username": user.username,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
    }


@app.get("/api/me")
def get_me():
    user = db.get_user_by_id(_current_user_id())
    return jsonify(_user_to_dict(user))


@app.put("/api/me/profile")
def update_my_profile():
    """Best-effort sync of display_name/avatar_url from the Auth0 profile.

    Called once after login - never touches username, which the user sets
    deliberately below since it's the public, shareable identifier.
    """
    user = db.get_user_by_id(_current_user_id())
    form = request.form
    for key in ("display_name", "avatar_url"):
        if form.get(key):
            db.update_user(user, key, form.get(key))
    return jsonify(_user_to_dict(user))


@app.put("/api/me/username")
def update_my_username():
    user = db.get_user_by_id(_current_user_id())
    username = (request.form.get("username") or "").strip().lower()
    if not (3 <= len(username) <= 24) or not username.replace("_", "").isalnum():
        abort(400, description="Username must be 3-24 characters: letters, numbers, underscores")
    try:
        db.update_user(user, "username", username)
    except Exception as exc:
        if "UNIQUE" in str(exc):
            abort(400, description="That username is already taken")
        raise
    return jsonify(_user_to_dict(user))


@app.get("/api/users/search")
def search_users():
    query = (request.args.get("q") or "").strip().lower()
    if len(query) < 2:
        return jsonify([])
    matches = db.search_users_by_username(query, exclude_user_id=_current_user_id())
    return jsonify([_user_to_dict(match) for match in matches])


@app.get("/api/friends")
def list_friends():
    user_id = _current_user_id()
    return jsonify(
        friends=[_user_to_dict(u) for u in db.list_friends(user_id)],
        incoming=[_user_to_dict(u) for u in db.list_incoming_requests(user_id)],
        outgoing=[_user_to_dict(u) for u in db.list_outgoing_requests(user_id)],
    )


@app.post("/api/friends/<int:target_user_id>")
def send_friend_request(target_user_id):
    user_id = _current_user_id()
    if db.get_user_by_id(target_user_id) is None:
        abort(404, description="User not found")
    try:
        db.send_friend_request(user_id, target_user_id)
    except ValueError as exc:
        abort(400, description=str(exc))
    return "", 201


@app.post("/api/friends/<int:requester_user_id>/accept")
def accept_friend_request(requester_user_id):
    user_id = _current_user_id()
    try:
        db.accept_friend_request(user_id, requester_user_id)
    except ValueError as exc:
        abort(400, description=str(exc))
    return "", 204


@app.delete("/api/friends/<int:other_user_id>")
def remove_friend(other_user_id):
    db.remove_friendship(_current_user_id(), other_user_id)
    return "", 204


@app.get("/api/users/<int:other_user_id>/profile")
def get_public_profile(other_user_id):
    """A friend's profile only - achievements, activity, favorite find. Never
    their full catalog of entries (location, descriptions, etc)."""
    user_id = _current_user_id()
    if not db.are_friends(user_id, other_user_id):
        abort(404, description="User not found")
    other = db.get_user_by_id(other_user_id)
    if other is None:
        abort(404, description="User not found")

    favorite = db.get_favorite_item(other_user_id)
    return jsonify(
        user=_user_to_dict(other),
        achievements=achievements.get_all_with_progress(other_user_id),
        activity=db.get_activity_by_day(other_user_id),
        favorite=_item_to_dict(favorite) if favorite else None,
    )


@app.get("/api/images/<path:filename>")
def get_image(filename):
    # Deliberately unauthenticated: a plain <img src="..."> (used everywhere
    # this is rendered - Entry, CategoryAlbum, Map popups) can't attach a
    # Bearer token, so requiring auth here just breaks every photo instead
    # of protecting anything. Filenames are random (uuid4-based, see
    # storage.py), so this relies on that unguessability rather than an
    # ownership check - the same privacy model as an unlisted link.
    return send_from_directory(IMAGE_DIR, filename)


if __name__ == "__main__":
    db.create_items_db()
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
