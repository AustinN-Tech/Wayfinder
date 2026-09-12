from dataclasses import dataclass
from pathlib import Path

CATEGORIES = [
    "CULTURAL",
    "NATURAL"
]

CULTURAL_SUBCATEGORIES = [
    "ART",
    "ARCHITECTURE",
    "MONUMENT",
    "ARTIFACT",
    "ARCHAEOLOGY"
]

NATURAL_SUBCATEGORIES = [
    "FOSSIL",
    "GEOLOGY",
    "PLANT",
    "ANIMAL",
    "LANDMARK"
]

# Ordered oldest -> newest so a timeline slider can filter/sort by index.
NATURAL_TIME_PERIODS = [
    "precambrian",
    "cambrian",
    "ordovician",
    "silurian",
    "devonian",
    "carboniferous",
    "permian",
    "triassic",
    "jurassic",
    "cretaceous",
    "paleogene",
    "neogene",
    "quaternary"
]

CULTURAL_TIME_PERIODS = [
    "prehistoric",
    "stone age",
    "bronze age",
    "iron age",
    "ancient",
    "classical antiquity",
    "late antiquity",
    "early middle ages",
    "high middle ages",
    "late middle ages",
    "renaissance",
    "early modern",
    "industrial era",
    "modern",
    "contemporary"
]

@dataclass
class HeritageItem:
    name: str
    category: str
    sub_category: str
    image_path: Path
    latitude: float | None
    longitude: float | None
    time_period: str
    description: str | None
    confidence: str
    id: int | None = None
    time_taken: int | None = None
