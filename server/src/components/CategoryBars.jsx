import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SUB_CATEGORY_LABELS } from "./subCategoryMeta";
import { SUB_CATEGORY_WASH } from "./subCategoryColors";

const PER_PAGE = 5;

// How a collection splits across sub-categories. Each bar takes its
// sub-category's own colour, the same one its card uses on Entries.
//
// Takes either the finds themselves (your own profile) or a ready-made tally
// (a friend's, where the API sends counts rather than their catalogue).
export default function CategoryBars({ items, counts: tally }) {
  const [page, setPage] = useState(0);

  const counts = {};
  if (tally) {
    Object.assign(counts, tally);
  } else {
    for (const item of items || []) {
      counts[item.sub_category] = (counts[item.sub_category] || 0) + 1;
    }
  }

  const rows = Object.entries(counts)
    .map(([key, count]) => ({ key, count, label: SUB_CATEGORY_LABELS[key] || key }))
    // biggest first, alphabetical where they tie, so the order is stable
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  if (rows.length === 0) {
    return <p>No finds yet.</p>;
  }

  const pageCount = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const current = Math.min(page, pageCount - 1);
  const shown = rows.slice(current * PER_PAGE, current * PER_PAGE + PER_PAGE);

  // bars are relative to the biggest pile overall, not to the page - scaling
  // per page would make a small category look large once it's alone on one
  const most = rows[0].count;

  return (
    <div className="category-breakdown">
      <ul className="category-bars">
        {shown.map((row) => (
          <li key={row.key}>
            <span className="category-bar-label" title={row.label}>
              {row.label}
            </span>
            <span className="category-bar-track">
              <span
                className="category-bar-fill"
                style={{
                  width: `${Math.max(8, (row.count / most) * 100)}%`,
                  background: SUB_CATEGORY_WASH[row.key] || "#8b7355",
                }}
              />
            </span>
            <span className="category-bar-count">{row.count}</span>
          </li>
        ))}
      </ul>

      {pageCount > 1 && (
        <div className="category-bars-nav">
          <button
            type="button"
            className="category-bars-step"
            onClick={() => setPage(current - 1)}
            disabled={current === 0}
            aria-label="Previous categories"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="category-bars-page">
            {current + 1} / {pageCount}
          </span>
          <button
            type="button"
            className="category-bars-step"
            onClick={() => setPage(current + 1)}
            disabled={current === pageCount - 1}
            aria-label="More categories"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
