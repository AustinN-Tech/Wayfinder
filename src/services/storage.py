import os
import uuid
import logging
from pathlib import Path
from werkzeug.utils import secure_filename

BASE_DIR = Path(__file__).resolve().parent.parent.parent # takes the absolute path of the parent folder of code file
SRC_DIR = Path(__file__).resolve().parent.parent # path to src directiory

# On Railway, mount a volume and set RAILWAY_VOLUME_MOUNT_PATH (Railway sets this
# automatically once a volume is attached to the service). Falls back to a local
# folder for development.
IMAGE_DIR = Path(os.environ.get("RAILWAY_VOLUME_MOUNT_PATH", BASE_DIR / "image_storage"))
IMAGE_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}

logger = logging.getLogger(__name__)


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def save_image(file_storage):
    """Save an uploaded werkzeug FileStorage to IMAGE_DIR and return its stored filename."""
    if not file_storage or file_storage.filename == "":
        return None
    if not allowed_file(file_storage.filename):
        raise ValueError("Unsupported file type")

    ext = file_storage.filename.rsplit(".", 1)[1].lower()
    stored_name = f"{uuid.uuid4().hex}.{ext}"
    safe_name = secure_filename(stored_name)
    file_storage.save(IMAGE_DIR / safe_name)
    return safe_name


def delete_image(filename):
    if not filename:
        return
    path = IMAGE_DIR / filename
    if path.exists():
        path.unlink()