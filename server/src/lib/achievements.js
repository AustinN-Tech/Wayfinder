// Fake data standing in for GET /api/achievements until the backend's
// achievement set matches these seven. Shape is deliberately close to what
// that endpoint already returns (code/name/unlocked/progress) - swapping in
// a real response later means mapping its flat `progress`/`threshold`
// numbers into this `progress: { current, target, unit }` shape (the `unit`
// has no backend equivalent yet, since rule_type doesn't carry a display
// word), not restructuring this file's consumers.
//
// Ordered so achievements of the same kind land in the same row of the
// 3-column grid: the three collection tiers fill a row together.
export const FAKE_ACHIEVEMENTS = [
  {
    id: "first_find",
    name: "First Find",
    image: "/images/stamp-icons/first-find-stamp.png",
    unlocked: true,
    unlockedAt: "Sep 3, 2026",
    progress: { current: 1, target: 1, unit: "item logged" },
  },
  {
    id: "shiny",
    name: "Shiny",
    image: "/images/stamp-icons/shiny-stamp.png",
    unlocked: false,
    progress: { current: 2, target: 10, unit: "crystals discovered" },
  },
  {
    id: "time_traveler",
    name: "Time Traveler",
    image: "/images/stamp-icons/time-traveler-stamp.png",
    unlocked: false,
    progress: { current: 1, target: 3, unit: "eras discovered" },
  },
  {
    id: "small_collection",
    name: "Small Collection",
    image: "/images/stamp-icons/small-collection-stamp.png",
    unlocked: true,
    unlockedAt: "Sep 10, 2026",
    progress: { current: 5, target: 5, unit: "items catalogued" },
  },
  {
    id: "medium_collection",
    name: "Medium Collection",
    image: "/images/stamp-icons/medium-collection-stamp.png",
    unlocked: false,
    progress: { current: 7, target: 100, unit: "items catalogued" },
  },
  {
    id: "large_collection",
    name: "Large Collection",
    image: "/images/stamp-icons/large-collection-stamp.png",
    unlocked: false,
    progress: { current: 7, target: 1000, unit: "items catalogued" },
  },
  {
    id: "world_traveler",
    name: "World Traveler",
    image: "/images/stamp-icons/world-traveler-stamp.png",
    unlocked: false,
    progress: { current: 1, target: 7, unit: "continents discovered" },
  },
];
