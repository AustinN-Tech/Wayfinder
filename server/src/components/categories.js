// The two top-level categories, with the label and accent colour each one
// carries everywhere it appears - the album's tabs, the profile's Collection
// bars, a category page's header. Its own module rather than an export from a
// component, so component files stay fast-refreshable.
export const MAIN_CATEGORIES = [
  { key: "NATURAL", label: "Natural", accent: "#3f6b4e" },
  { key: "CULTURAL", label: "Cultural", accent: "#a8452f" },
];

// The stored values are uppercase keys (CULTURAL, HISTORICAL SITE); these turn
// them into something readable wherever one is shown directly.
export function categoryLabel(key) {
  return MAIN_CATEGORIES.find((category) => category.key === key)?.label || key;
}

// time periods are stored lowercase - "contemporary", "late middle ages"
export function sentenceCase(value) {
  if (!value) return value;
  const lower = String(value).toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
