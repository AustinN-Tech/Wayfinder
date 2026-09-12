from dataclasses import dataclass

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
class heritage_item:
    id: int
    name: str
    category: str
    sub_category: str
    image_path: str
    latitude: int
    longitude: int
    time_taken: int
    time_period: str
    description: str
    confidence: str
