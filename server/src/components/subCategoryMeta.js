import {
  ArtIcon,
  ArchitectureIcon,
  MonumentIcon,
  ArtifactIcon,
  ArchaeologyIcon,
  FossilIcon,
  GeologyIcon,
  AnimalIcon,
  LandmarkIcon,
  TagIcon,
  AquaticIcon,
} from "./subCategoryIcons";

// Keyed to match core/models.py's CULTURAL_SUBCATEGORIES / NATURAL_SUBCATEGORIES
// exactly - these lists have changed shape before, so if a category ever
// renders as a plain hatched circle with no icon, this is the first place
// to check against the backend's current lists.
export const SUB_CATEGORY_ICONS = {
  ART: ArtIcon,
  ARCHITECTURE: ArchitectureIcon,
  MONUMENT: MonumentIcon,
  ARTIFACT: ArtifactIcon,
  "HISTORICAL SITE": ArchaeologyIcon,
  OTHER: TagIcon,

  FOSSIL: FossilIcon,
  GEOLOGY: GeologyIcon,
  WILDLIFE: AnimalIcon,
  AQUATIC: AquaticIcon,
  LANDFORM: LandmarkIcon,
};

// Title-case display names, lightly pluralized for the "N discovered" line.
export const SUB_CATEGORY_LABELS = {
  ART: "Art",
  ARCHITECTURE: "Architecture",
  MONUMENT: "Monuments",
  ARTIFACT: "Artifacts",
  "HISTORICAL SITE": "Historical Sites",
  OTHER: "Other",

  FOSSIL: "Fossils",
  GEOLOGY: "Geology",
  WILDLIFE: "Wildlife",
  AQUATIC: "Aquatic Life",
  LANDFORM: "Landforms",
};
