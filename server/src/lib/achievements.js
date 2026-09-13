// Display metadata for the achievement stamps - GET /api/achievements
// carries the real progress but no stamp art or display unit for its
// rule_type, so this fills in both per achievement code. Only codes with
// commissioned art appear in the album; the rest (still real achievements
// on the backend) are left out until they get one.
//
// Ordered so achievements of the same kind land in the same row of the
// 3-column grid: the three collection tiers fill a row together.
// [code, artwork, unit, ink] - the ink is sampled from the stamp's own
// artwork, so a progress bar is filled in that stamp's colour
const STAMP_DISPLAY = [
  ["first_find", "/images/stamp-icons/first-find-stamp.png", "item logged", "#2a6f4d"],
  ["shiny", "/images/stamp-icons/shiny-stamp.png", "crystals discovered", "#6f3d2a"],
  ["time_traveler", "/images/stamp-icons/time-traveler-stamp.png", "eras discovered", "#3b5280"],
  ["small_collection", "/images/stamp-icons/small-collection-stamp.png", "items discovered", "#a18a35"],
  ["medium_collection", "/images/stamp-icons/medium-collection-stamp.png", "items discovered", "#a66430"],
  ["large_collection", "/images/stamp-icons/large-collection-stamp.png", "items discovered", "#a27d34"],
  ["dino_hunter", "/images/stamp-icons/dino-hunter-stamp.png", "fossils discovered", "#8a3226"],
  ["connoisseur", "/images/stamp-icons/connoisseur-stamp.png", "works of art found", "#8f2f24"],
  ["world_traveler", "/images/stamp-icons/world-traveler-stamp.png", "continents discovered", "#158481"],
];

function formatUnlockedAt(unixSeconds) {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, { dateStyle: "medium" });
}

// Maps the GET /api/achievements response into the shape StampAlbum renders.
export function toStampAchievements(apiAchievements) {
  const byCode = Object.fromEntries(apiAchievements.map((achievement) => [achievement.code, achievement]));

  return STAMP_DISPLAY.filter(([code]) => byCode[code]).map(([code, image, unit, ink]) => {
    const achievement = byCode[code];
    return {
      id: code,
      name: achievement.name,
      image,
      unlocked: achievement.unlocked,
      unlockedAt: formatUnlockedAt(achievement.unlocked_at),
      ink,
      progress: { current: achievement.progress, target: achievement.threshold, unit },
    };
  });
}
