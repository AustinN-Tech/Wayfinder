import logging
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent # takes the absolute path of the parent folder of code file
SRC_DIR = Path(__file__).resolve().parent.parent # path to src directiory
IMAGE_DIR = BASE_DIR / "image_storage"

print(BASE_DIR)