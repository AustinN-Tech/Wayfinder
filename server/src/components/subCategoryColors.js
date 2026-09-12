// The "deep" anchor colour each discovered category's wash fades in from,
// drawn from that category's real-world subject rather than a generic
// rainbow. Kept dark/muted enough that cream title text always has contrast,
// so the title colour never needs to change per card. The gradient itself
// (see .album-card-bg in App.css) fades every one of these to the same
// paper-cream band on the right, so a future photo dropped in that slot
// reads consistently regardless of category.
export const SUB_CATEGORY_WASH = {
  // CULTURAL - pigment, stone and patina tones
  ART: "#8a4a30", // burnt sienna, an old pigment
  ARCHITECTURE: "#8a7148", // warm sandstone/limestone
  MONUMENT: "#5f6f5a", // weathered bronze patina
  ARTIFACT: "#96602f", // aged clay/ochre
  ARCHAEOLOGY: "#6b4f36", // dusty excavated soil

  // NATURAL
  FOSSIL: "#97692b", // amber/ochre stone (darkened a notch so cream title text clears AA contrast)
  GEOLOGY: "#4f5d66", // slate grey-blue, mineral
  PLANT: "#45573f", // deep sage/forest green
  ANIMAL: "#7a4a34", // warm russet/clay
  LANDMARK: "#635a6e", // dusky mountain purple-grey
};

// Real artwork, where it exists, replaces both the colour wash and the line-art
// motif for that sub-category. Falls back to SUB_CATEGORY_WASH + the icon
// motif for everything not listed here yet.
export const SUB_CATEGORY_BACKGROUND_IMAGES = {
  FOSSIL: "/images/fossils-category-bg.png",
  ARTIFACT: "/images/artifacts-category-bg.png",
  ANIMAL: "/images/animals-category-bg.png",
  GEOLOGY: "/images/geology-category-bg.png",
  LANDMARK: "/images/landmarks-category-bg.png",
  PLANT: "/images/plants-category-bg.png",
};
