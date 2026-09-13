// The "deep" anchor colour each discovered category's wash fades in from,
// drawn from that category's real-world subject rather than a generic
// rainbow. Kept dark/muted enough that cream title text always has contrast,
// so the title colour never needs to change per card. The gradient itself
// (see .album-card-bg in App.css) fades every one of these to the same
// paper-cream band on the right, so a future photo dropped in that slot
// reads consistently regardless of category.
//
// Keyed to match core/models.py's CULTURAL_SUBCATEGORIES / NATURAL_SUBCATEGORIES.
export const SUB_CATEGORY_WASH = {
  // CULTURAL - pigment, stone and patina tones
  ART: "#8a4a30", // burnt sienna, an old pigment
  ARCHITECTURE: "#8a7148", // warm sandstone/limestone
  MONUMENT: "#5f6f5a", // weathered bronze patina
  ARTIFACT: "#96602f", // aged clay/ochre
  "HISTORICAL SITE": "#6b4f36", // dusty excavated soil
  OTHER: "#5c5347", // neutral umber - shared by both categories' catch-all bucket

  // NATURAL
  FOSSIL: "#97692b", // amber/ochre stone (darkened a notch so cream title text clears AA contrast)
  GEOLOGY: "#4f5d66", // slate grey-blue, mineral
  WILDLIFE: "#7a4a34", // warm russet/clay
  AQUATIC: "#2b5c66", // deep teal-blue, water
  LANDFORM: "#635a6e", // dusky mountain purple-grey
};

// Real artwork, where it exists, replaces both the colour wash and the line-art
// motif for that sub-category. Falls back to SUB_CATEGORY_WASH + the icon
// motif for everything not listed here yet.
//
// HISTORICAL SITE/WILDLIFE/LANDFORM reuse art originally made for the
// sub-categories they replaced (ARCHAEOLOGY/ANIMAL/LANDMARK) - same subject,
// new name. The old plants-category-bg.png has no successor bucket under the
// current list and is unused for now.
export const SUB_CATEGORY_BACKGROUND_IMAGES = {
  ART: "/images/category-bgs/art-category-bg.png",
  ARCHITECTURE: "/images/category-bgs/architecture-category-bg.png",
  MONUMENT: "/images/category-bgs/monuments-category-bg.png",
  ARTIFACT: "/images/category-bgs/artifacts-category-bg.png",
  "HISTORICAL SITE": "/images/category-bgs/archaeology-category-bg.png",

  FOSSIL: "/images/category-bgs/fossils-category-bg.png",
  GEOLOGY: "/images/category-bgs/geology-category-bg.png",
  WILDLIFE: "/images/category-bgs/animals-category-bg.png",
  LANDFORM: "/images/category-bgs/landmarks-category-bg.png",
};
