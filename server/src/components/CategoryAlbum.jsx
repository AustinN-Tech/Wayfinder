import { useState } from "react";
import { MAIN_CATEGORIES } from "./categories";
import { Link } from "react-router";
import { SUB_CATEGORY_ICONS, SUB_CATEGORY_LABELS } from "./subCategoryMeta";
import { SUB_CATEGORY_WASH, SUB_CATEGORY_BACKGROUND_IMAGES } from "./subCategoryColors";

// A fixed small tilt per row index, so the discovered posters read as
// hand-placed rather than machine-stamped identical rectangles.
const TILTS = ["-0.6deg", "0.5deg", "-0.4deg", "0.6deg", "-0.5deg"];

// items: the full list from getItems(). subcategoriesByCategory: the
// `subcategories` map from getCategories(), e.g. { CULTURAL: [...], NATURAL: [...] }.
export default function CategoryAlbum({ items, subcategoriesByCategory }) {
  const [active, setActive] = useState("NATURAL");

  const counts = {};
  for (const item of items) {
    const key = `${item.category}:${item.sub_category}`;
    counts[key] = (counts[key] || 0) + 1;
  }

  // Sorted by the label you actually read, not the backend's key - "Aquatic"
  // and "AQUATIC" don't order the same once a key and its label diverge.
  const rows = [...(subcategoriesByCategory[active] || [])].sort((a, b) =>
    (SUB_CATEGORY_LABELS[a] || a).localeCompare(SUB_CATEGORY_LABELS[b] || b)
  );

  return (
    <section className="category-album">
      <div className="album-toggle" role="tablist" aria-label="Category">
        {MAIN_CATEGORIES.map(({ key, label, accent }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active === key}
            className={`album-toggle-btn ${active === key ? "active" : ""}`}
            style={{ "--accent": accent }}
            onClick={() => setActive(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <ul className="album-list">
        {rows.map((subCategory, index) => {
          const Icon = SUB_CATEGORY_ICONS[subCategory];
          const count = counts[`${active}:${subCategory}`] || 0;
          const discovered = count > 0;
          const label = SUB_CATEGORY_LABELS[subCategory] || subCategory;

          const backgroundImage = SUB_CATEGORY_BACKGROUND_IMAGES[subCategory];

          if (!discovered) {
            // Once real art exists for a category, show it greyed out rather
            // than the generic hatched icon - a preview of what's waiting to
            // be found. Categories without art yet fall back to the icon row.
            if (backgroundImage) {
              return (
                <li key={subCategory}>
                  <div
                    className="album-card locked-image"
                    style={{ "--wash-image": `url(${backgroundImage})` }}
                    aria-disabled="true"
                    aria-label={`${label} - not yet discovered`}
                  >
                    <span className="album-card-bg has-image" />
                    <span className="album-card-scrim" />
                    <span className="album-card-content">
                      <strong className="album-card-title">{label}</strong>
                      <span className="album-card-locked-note">Not yet discovered</span>
                    </span>
                  </div>
                </li>
              );
            }

            return (
              <li key={subCategory}>
                <div className="album-row locked" aria-disabled="true">
                  <span className="album-badge">
                    <Icon size={30} />
                  </span>
                  <span className="album-row-text">
                    <strong>{label}</strong>
                    <span className="album-count">Not yet discovered</span>
                  </span>
                </div>
              </li>
            );
          }

          // Discovered: a full-width poster. The wash/motif is its own layer,
          // so real art can replace it - as it now has for several categories -
          // with nothing else in the markup changing.
          return (
            <li key={subCategory}>
              <Link
                to={`/feed/${active}/${subCategory}`}
                className="album-card"
                style={{
                  "--wash": SUB_CATEGORY_WASH[subCategory] || "#8b7355",
                  "--wash-image": backgroundImage ? `url(${backgroundImage})` : undefined,
                  "--tilt": TILTS[index % TILTS.length],
                }}
                aria-label={`${label} - ${count} ${count === 1 ? "entry" : "entries"}`}
              >
                <span className={`album-card-bg ${backgroundImage ? "has-image" : ""}`} />
                {!backgroundImage && <Icon size={190} className="album-card-motif" />}
                <span className="album-card-content">
                  <strong className="album-card-title">{label}</strong>
                  <span className="album-card-count">{count} discovered</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
