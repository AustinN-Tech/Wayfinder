import logging
import os
import shutil
import tempfile
from contextlib import contextmanager
from pathlib import Path
from uuid import uuid4

from PIL import Image, ImageOps

from core.models import HeritageItem
from utilities.util import error_handling

BASE_DIR = Path(__file__).resolve().parent.parent.parent # takes the absolute path of the parent folder of code file
SRC_DIR = Path(__file__).resolve().parent.parent # path to src directiory

# On Railway, mount a volume and set RAILWAY_VOLUME_MOUNT_PATH (Railway sets this
# automatically once a volume is attached to the service). Falls back to a local
# folder for development.
IMAGE_DIR = Path(os.environ.get("RAILWAY_VOLUME_MOUNT_PATH", BASE_DIR / "image_storage"))
# Created eagerly (not just lazily on first upload): the database file now
# lives here too, and sqlite3 needs the parent directory to already exist.
IMAGE_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}

# Every saved image is re-encoded as a JPEG capped to this size, so a multi-MB
# phone photo doesn't eat the Railway volume or slow down the feed/map.
MAX_DIMENSION = 1600
JPEG_QUALITY = 80

logger = logging.getLogger(__name__)


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@error_handling
def create_image_directory() -> None:
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)


@error_handling
def resolve_image_path(image_path: str | Path) -> Path:
    """Resolve an absolute or project-relative path inside image_storage."""
    path = Path(image_path)
    if not path.is_absolute():
        path = BASE_DIR / path
    path = path.resolve()
    image_dir = IMAGE_DIR.resolve()
    if path == image_dir or not path.is_relative_to(image_dir):
        raise ValueError("Image path must point to a file inside image_storage")
    return path


@error_handling
def save_upload_to_tempfile(file_storage) -> Path:
    """Compress an uploaded werkzeug FileStorage to a capped JPEG and stage it
    as a temp file outside image_storage.

    The caller is responsible for deleting the returned path once done with
    it (add_item/update_item only copy from it, they never delete it).
    """
    if not file_storage or file_storage.filename == "":
        raise ValueError("No file provided")
    if not allowed_file(file_storage.filename):
        raise ValueError("Unsupported file type")

    try:
        image = Image.open(file_storage.stream)
        image = ImageOps.exif_transpose(image)  # respect phone camera orientation
        if image.mode not in ("RGB", "L"):
            image = image.convert("RGB")
        image.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.LANCZOS)
    except Exception as exc:
        raise ValueError("Could not process image") from exc

    fd, tmp_name = tempfile.mkstemp(suffix=".jpg")
    tmp_path = Path(tmp_name)
    with os.fdopen(fd, "wb") as f:
        image.save(f, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    return tmp_path


@error_handling
def add_image_file(source_path: str | Path) -> Path:
    """Copy a preprocessed JPEG under a unique .jpg name and return its absolute path.

    Preserve the original bytes and retain the source file.
    """
    source = Path(source_path).resolve()
    if not source.is_file():
        raise FileNotFoundError(f"Image source is not a file: {source}")
    create_image_directory()
    destination = None
    try:
        with source.open("rb") as source_file:
            with tempfile.NamedTemporaryFile( # generates randomed named file `image_[random stuff].jpg`
                dir=IMAGE_DIR, prefix="image_", suffix=".jpg", delete=False
            ) as destination_file:
                destination = Path(destination_file.name).resolve() # create new path
                shutil.copyfileobj(source_file, destination_file) # copy file to path
    except Exception:
        if destination is not None:
            destination.unlink(missing_ok=True)
        raise
    logger.debug("Added image file: %s", destination)
    return destination


@error_handling
def update_image_file(item: HeritageItem, source_path: str | Path) -> Path:
    """Replace a standalone item's image. Use database.update_item for saved items."""
    with image_replacement(item, source_path) as new_path:
        pass
    return new_path


@contextmanager
def image_replacement(item: HeritageItem, source_path: str | Path):
    """Keep the old image until the caller successfully commits its change."""
    old_path = resolve_image_path(item.image_path)
    if old_path.exists() and not old_path.is_file():
        raise IsADirectoryError(f"Stored image is not a file: {old_path}")
    new_path = add_image_file(source_path)
    try:
        yield new_path
    except Exception:
        _cleanup_image(new_path)
        raise
    item.image_path = new_path
    _cleanup_image(old_path)
    logger.debug("Updated image for %s: %s", item.name, new_path)


def _cleanup_image(path: Path) -> None:
    """Report cleanup failures without masking an error or a committed change."""
    try:
        path.unlink(missing_ok=True)
    except OSError:
        logger.exception("Could not clean up image file: %s", path)


@contextmanager
def image_addition(source_path: str | Path):
    """Remove a newly copied image if the caller's database operation fails."""
    path = add_image_file(source_path)
    try:
        yield path
    except Exception:
        _cleanup_image(path)
        raise


@contextmanager
def image_deletion(item: HeritageItem):
    """Stage deletion and restore the image if the caller's transaction fails.

    Missing images are allowed. After a successful transaction, remove the
    staged file; any cleanup failure is logged with its remaining path.
    """
    path = resolve_image_path(item.image_path)
    staged_path = None
    if path.exists():
        if not path.is_file():
            raise IsADirectoryError(f"Stored image is not a file: {path}")
        staged_path = path.with_name(f".{uuid4().hex}.pending-delete")
        path.rename(staged_path)
    try:
        yield
    except Exception:
        if staged_path is not None:
            staged_path.rename(path)
        raise
    if staged_path is not None:
        _cleanup_image(staged_path)


@error_handling
def delete_image_file(item: HeritageItem, *, missing_ok: bool = False) -> None:
    """Delete the stored image without changing the item or its database row.

    Accepts either a string or Path in item.image_path. Missing files raise
    FileNotFoundError unless missing_ok=True.
    """
    path = resolve_image_path(item.image_path)
    path.unlink(missing_ok=missing_ok)
    logger.debug("Deleted image for %s at %s", item.name, path)
