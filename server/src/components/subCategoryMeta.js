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
  AquaticIcon,
  OtherIcon,
} from "./subCategoryIcons";

// Keys match core/models.py's CULTURAL_SUBCATEGORIES/NATURAL_SUBCATEGORIES
// exactly - "OTHER" is shared by both categories since it's the same
// fallback bucket either way.
export const SUB_CATEGORY_ICONS = {
  ART: ArtIcon,
  ARCHITECTURE: ArchitectureIcon,
  MONUMENT: MonumentIcon,
  ARTIFACT: ArtifactIcon,
  "HISTORICAL SITE": ArchaeologyIcon,
  FOSSIL: FossilIcon,
  GEOLOGY: GeologyIcon,
  WILDLIFE: AnimalIcon,
  AQUATIC: AquaticIcon,
  LANDFORM: LandmarkIcon,
  OTHER: OtherIcon,
};

// Title-case display names, lightly pluralized for the "N discovered" line.
export const SUB_CATEGORY_LABELS = {
  ART: "Art",
  ARCHITECTURE: "Architecture",
  MONUMENT: "Monuments",
  ARTIFACT: "Artifacts",
  "HISTORICAL SITE": "Historical Sites",
  FOSSIL: "Fossils",
  GEOLOGY: "Geology",
  WILDLIFE: "Wildlife",
  AQUATIC: "Aquatic",
  LANDFORM: "Landforms",
  OTHER: "Other",
};
