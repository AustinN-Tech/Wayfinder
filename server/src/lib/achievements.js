// Display metadata for the achievement stamps - GET /api/achievements
// carries the real progress but no stamp art or display unit for its
// rule_type, so this fills in both per achievement code. Only codes with
// commissioned art appear in the album; the rest (still real achievements
// on the backend) are left out until they get one.
//
// Ordered so achievements of the same kind land in the same row of the
// 3-column grid: the three collection tiers fill a row together.
const STAMP_DISPLAY = [
  ["first_find", "/images/stamp-icons/first-find-stamp.png", "item logged"],
  ["shiny", "/images/stamp-icons/shiny-stamp.png", "crystals discovered"],
  ["time_traveler", "/images/stamp-icons/time-traveler-stamp.png", "eras discovered"],
  ["small_collection", "/images/stamp-icons/small-collection-stamp.png", "items catalogued"],
  ["medium_collection", "/images/stamp-icons/medium-collection-stamp.png", "items catalogued"],
  ["large_collection", "/images/stamp-icons/large-collection-stamp.png", "items catalogued"],
  ["world_traveler", "/images/stamp-icons/world-traveler-stamp.png", "continents discovered"],
];

function formatUnlockedAt(unixSeconds) {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, { dateStyle: "medium" });
}

// Maps the GET /api/achievements response into the shape StampAlbum renders.
export function toStampAchievements(apiAchievements) {
  const byCode = Object.fromEntries(apiAchievements.map((achievement) => [achievement.code, achievement]));

  return STAMP_DISPLAY.filter(([code]) => byCode[code]).map(([code, image, unit]) => {
    const achievement = byCode[code];
    return {
      id: code,
      name: achievement.name,
      image,
      unlocked: achievement.unlocked,
      unlockedAt: formatUnlockedAt(achievement.unlocked_at),
      progress: { current: achievement.progress, target: achievement.threshold, unit },
    };
  });
}
