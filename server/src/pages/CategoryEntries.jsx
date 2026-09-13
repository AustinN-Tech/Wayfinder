import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import AuthImage from "../components/AuthImage";
import PageHeader from "../components/PageHeader";
import PageTurn from "../components/PageTurn";
import { SUB_CATEGORY_LABELS } from "../components/subCategoryMeta";
import { getItems } from "../lib/api";

// A spread is always two rows deep; how many columns it holds depends on the
// width, so a phone keeps its 2x2 page while a desktop fills the paper instead
// of stranding cards in the top-left corner. Declared here and handed to CSS
// as --entry-cols, so the layout and the page size can't disagree.
const ROWS = 2;
const BREAKPOINTS = [
  { from: 980, columns: 4 },
  { from: 700, columns: 3 },
  { from: 0, columns: 2 },
];
const TURN_MS = 400;

function columnsFor(width) {
  return BREAKPOINTS.find((stop) => width >= stop.from).columns;
}

function formatWhen(timeTaken) {
  if (!timeTaken) return null;
  return new Date(timeTaken * 1000).toLocaleDateString(undefined, {
    dateStyle: "medium",
  });
}

export default function CategoryEntries() {
  const { category, subCategory } = useParams();
  const [items, setItems] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState("next");
  const [columns, setColumns] = useState(() => columnsFor(window.innerWidth));

  useEffect(() => {
    const onResize = () => setColumns(columnsFor(window.innerWidth));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    getItems()
      .then((list) => {
        const filtered = list.filter(
          (item) => item.category === category && item.sub_category === subCategory
        );
        // the API returns oldest first; the journal reads newest first
        setItems(filtered.reverse());
      })
      .catch((err) => setErrorMessage(err.message));
  }, [category, subCategory]);

  const label = SUB_CATEGORY_LABELS[subCategory] || subCategory;

  const visibleItems = useMemo(() => {
    if (!items) return items;
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return items;
    return items.filter((item) => item.name.toLowerCase().includes(trimmed));
  }, [items, query]);

  // A narrowed search, or a different sub-category, almost always leaves fewer
  // pages than you were on - so go back to the first one. Adjusted during
  // render rather than in an effect, which costs no extra pass.
  const spreadKey = `${category}/${subCategory}/${query.trim().toLowerCase()}`;
  const [prevSpreadKey, setPrevSpreadKey] = useState(spreadKey);
  if (prevSpreadKey !== spreadKey) {
    setPrevSpreadKey(spreadKey);
    setPage(0);
    setDirection("prev");
  }

  const pageSize = columns * ROWS;
  const pageCount = Math.max(1, Math.ceil((visibleItems?.length || 0) / pageSize));
  const currentPage = Math.min(page, pageCount - 1);

  function turnTo(target) {
    if (target < 0 || target >= pageCount || target === currentPage) return;
    setDirection(target > currentPage ? "next" : "prev");
    setPage(target);
  }

  function renderSpread(pageIndex) {
    const start = pageIndex * pageSize;
    const pageItems = visibleItems ? visibleItems.slice(start, start + pageSize) : [];

    return (
      <ul className="entry-page-grid">
        {pageItems.map((item) => (
          <li key={item.id} className="entry-slot">
            <Link to={`/entry/${item.id}`} className="entry-card">
              <span className="entry-card-frame">
                <AuthImage path={item.image_path} loading="lazy" />
              </span>
              <strong>{item.name}</strong>
              <span className="entry-card-date">{formatWhen(item.time_taken)}</span>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <main className="page-body screen">

      <Link to="/feed" className="category-back">
        &larr; All entries
      </Link>

      <PageHeader
        title={label}
        note={items ? `${items.length} ${items.length === 1 ? "entry" : "entries"}` : undefined}
        accent={category === "NATURAL" ? "#3f6b4e" : "#a8452f"}
        aside={
          <label className="feed-search">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search entries..."
              aria-label="Search entries"
            />
          </label>
        }
      />

      {errorMessage && <p role="alert">{errorMessage}</p>}
      {!items && !errorMessage && <p>Opening your journal...</p>}
      {items?.length === 0 && (
        <p>Nothing catalogued here yet. Press the seal at the foot of the page to add your first.</p>
      )}
      {items?.length > 0 && visibleItems.length === 0 && (
        <p>No entries match &ldquo;{query}&rdquo;.</p>
      )}

      {visibleItems?.length > 0 && (
        <div className="entry-pages" style={{ "--entry-cols": columns }}>
          <PageTurn
            pageKey={currentPage}
            direction={direction}
            durationMs={TURN_MS}
            renderPage={renderSpread}
          />

          {pageCount > 1 && (
            <nav className="page-turn-nav" aria-label="Entry pages">
              <button
                type="button"
                className="page-turn-btn"
                onClick={() => turnTo(currentPage - 1)}
                disabled={currentPage === 0}
                aria-label="Previous page"
              >
                <ChevronLeft size={18} />
              </button>

              <span className="page-turn-indicator" aria-live="polite">
                Page {currentPage + 1} of {pageCount}
              </span>

              <button
                type="button"
                className="page-turn-btn"
                onClick={() => turnTo(currentPage + 1)}
                disabled={currentPage === pageCount - 1}
                aria-label="Next page"
              >
                <ChevronRight size={18} />
              </button>
            </nav>
          )}
        </div>
      )}
    </main>
  );
}
