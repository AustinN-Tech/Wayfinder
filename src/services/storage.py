import os
import uuid
import logging
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps
from werkzeug.utils import secure_filename

BASE_DIR = Path(__file__).resolve().parent.parent.parent # takes the absolute path of the parent folder of code file
SRC_DIR = Path(__file__).resolve().parent.parent # path to src directiory

# On Railway, mount a volume and set RAILWAY_VOLUME_MOUNT_PATH (Railway sets this
# automatically once a volume is attached to the service). Falls back to a local
# folder for development.
IMAGE_DIR = Path(os.environ.get("RAILWAY_VOLUME_MOUNT_PATH", BASE_DIR / "image_storage"))
IMAGE_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}

# Every saved image is re-encoded as a JPEG capped to this size, so a multi-MB
# phone photo doesn't eat the Railway volume or slow down the feed/map.
MAX_DIMENSION = 1600
JPEG_QUALITY = 80

logger = logging.getLogger(__name__)


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def _compress_to_jpeg(file_storage):
    image = Image.open(file_storage.stream)
    image = ImageOps.exif_transpose(image)  # respect phone camera orientation
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")

    image.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.LANCZOS)

    buffer = BytesIO()
    image.save(buffer, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    buffer.seek(0)
    return buffer


def save_image(file_storage):
    """Compress and save an uploaded werkzeug FileStorage to IMAGE_DIR, returning its stored filename."""
    if not file_storage or file_storage.filename == "":
        return None
    if not allowed_file(file_storage.filename):
        raise ValueError("Unsupported file type")

    try:
        compressed = _compress_to_jpeg(file_storage)
    except Exception as exc:
        raise ValueError("Could not process image") from exc

    stored_name = secure_filename(f"{uuid.uuid4().hex}.jpg")
    with open(IMAGE_DIR / stored_name, "wb") as f:
        f.write(compressed.read())
    return stored_name


def delete_image(filename):
    if not filename:
        return
    path = IMAGE_DIR / filename
    if path.exists():
        path.unlink()