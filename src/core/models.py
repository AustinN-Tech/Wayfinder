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
    "HISTORICAL SITE",
    "OTHER"
]

NATURAL_SUBCATEGORIES = [
    "FOSSIL",
    "GEOLOGY",
    "WILDLIFE",
    "AQUATIC",
    "LANDFORM",
    "OTHER"
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
    user_id: int
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
    is_favorite: int = 0

    def __post_init__(self):
        if type(self.user_id) is not int or self.user_id <= 0:
            raise ValueError("user_id must be a positive local user ID")


@dataclass
class Achievement:
    achievement_id: int
    code: str
    name: str
    rule_type: str
    threshold: int
    description: str | None = None
    category: str | None = None


@dataclass
class User:
    auth0_id: str
    username: str | None = None
    display_name: str | None = None
    avatar_url: str | None = None
    user_id: int | None = None
    created_at: int | None = None


@dataclass
class Friendship:
    user_id: int
    friend_id: int
    status: str  # "pending" | "accepted"
    created_at: int | None = None


@dataclass
class UserAchievement:
    user_id: int
    achievement_id: int
    progress: int | None = 0
    completed: int | None = 0
    earned_at: int | None = None
