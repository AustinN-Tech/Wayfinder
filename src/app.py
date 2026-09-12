import os

from flask import Flask, jsonify, request, send_from_directory, abort
from flask_cors import CORS

from core.models import (
    CATEGORIES,
    CULTURAL_SUBCATEGORIES,
    NATURAL_SUBCATEGORIES,
    CULTURAL_TIME_PERIODS,
    NATURAL_TIME_PERIODS,
)
from services import database
from services import gemini_service
from services.storage import IMAGE_DIR, save_image, delete_image
from utilities.util import initialize_logging, logger

initialize_logging()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": os.environ.get("FRONTEND_ORIGIN", "*")}})

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
    database.create_db()


@app.errorhandler(400)
@app.errorhandler(404)
@app.errorhandler(502)
@app.errorhandler(503)
def _json_error(err):
    return jsonify(error=err.description), err.code


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
    return jsonify(database.get_all_items())


@app.get("/api/items/<int:item_id>")
def get_item(item_id):
    item = database.get_item(item_id)
    if item is None:
        abort(404, description="Item not found")
    return jsonify(item)


@app.post("/api/items/analyze")
def analyze_item():
    if "image" not in request.files or request.files["image"].filename == "":
        abort(400, description="An 'image' file is required")

    image_file = request.files["image"]
    mime_type = image_file.mimetype or "image/jpeg"

    try:
        suggestions = gemini_service.analyze_image(image_file.read(), mime_type)
    except RuntimeError as exc:
        abort(503, description=str(exc))
    except ValueError as exc:
        abort(502, description=str(exc))

    return jsonify(suggestions=suggestions)


@app.post("/api/items")
def create_item():
    form = request.form
    name = form.get("name")
    category = form.get("category")
    sub_category = form.get("sub_category")

    if not name or not category or not sub_category:
        abort(400, description="name, category, and sub_category are required")
    if category not in CATEGORIES:
        abort(400, description=f"category must be one of {CATEGORIES}")
    if sub_category not in SUBCATEGORIES_BY_CATEGORY.get(category, []):
        abort(400, description=f"sub_category must be one of {SUBCATEGORIES_BY_CATEGORY.get(category, [])}")

    time_period = form.get("time_period")
    if time_period and time_period not in TIME_PERIODS_BY_CATEGORY.get(category, []):
        abort(400, description=f"time_period must be one of {TIME_PERIODS_BY_CATEGORY.get(category, [])}")

    if "image" not in request.files or request.files["image"].filename == "":
        abort(400, description="An 'image' file is required - you have to record what you actually saw")

    try:
        image_path = save_image(request.files["image"])
    except ValueError as exc:
        abort(400, description=str(exc))

    item = {
        "name": name,
        "category": category,
        "sub_category": sub_category,
        "image_path": image_path,
        "latitude": form.get("latitude", type=float),
        "longitude": form.get("longitude", type=float),
        "time_period": time_period,
        "description": form.get("description"),
        "confidence": form.get("confidence", type=float),
    }
    item_id = database.insert_item(item)
    return jsonify(database.get_item(item_id)), 201


@app.put("/api/items/<int:item_id>")
def update_item(item_id):
    existing = database.get_item(item_id)
    if existing is None:
        abort(404, description="Item not found")

    form = request.form
    fields = {}
    for key in ("name", "category", "sub_category", "time_period", "description"):
        if key in form:
            fields[key] = form.get(key)
    for key in ("latitude", "longitude", "confidence"):
        if key in form:
            fields[key] = form.get(key, type=float)

    effective_category = fields.get("category", existing["category"])
    if "category" in fields and fields["category"] not in CATEGORIES:
        abort(400, description=f"category must be one of {CATEGORIES}")
    if "sub_category" in fields and fields["sub_category"] not in SUBCATEGORIES_BY_CATEGORY.get(effective_category, []):
        abort(400, description=f"sub_category must be one of {SUBCATEGORIES_BY_CATEGORY.get(effective_category, [])}")
    if fields.get("time_period") and fields["time_period"] not in TIME_PERIODS_BY_CATEGORY.get(effective_category, []):
        abort(400, description=f"time_period must be one of {TIME_PERIODS_BY_CATEGORY.get(effective_category, [])}")

    if "image" in request.files and request.files["image"].filename != "":
        try:
            new_image = save_image(request.files["image"])
        except ValueError as exc:
            abort(400, description=str(exc))
        if new_image:
            old_item = database.get_item(item_id)
            delete_image(old_item.get("image_path"))
            fields["image_path"] = new_image

    if not fields:
        abort(400, description="No fields provided to update")

    database.update_item(item_id, fields)
    return jsonify(database.get_item(item_id))


@app.delete("/api/items/<int:item_id>")
def remove_item(item_id):
    item = database.get_item(item_id)
    if item is None:
        abort(404, description="Item not found")
    delete_image(item.get("image_path"))
    database.delete_item(item_id)
    return "", 204


@app.get("/api/images/<path:filename>")
def get_image(filename):
    return send_from_directory(IMAGE_DIR, filename)


if __name__ == "__main__":
    database.create_db()
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
