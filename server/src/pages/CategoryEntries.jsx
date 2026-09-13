import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { Search } from "lucide-react";
import AuthImage from "../components/AuthImage";
import PageDoodles from "../components/PageDoodles";
import { SUB_CATEGORY_LABELS } from "../components/subCategoryMeta";
import { getItems } from "../lib/api";

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

  return (
    <main className="page-body screen">
      <PageDoodles variant="feed" />

      <Link to="/feed" className="category-back">
        &larr; All entries
      </Link>

      <div className="feed-header">
        <h1>{label}</h1>
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
      </div>

      {errorMessage && <p role="alert">{errorMessage}</p>}
      {!items && !errorMessage && <p>Opening your journal...</p>}
      {items?.length === 0 && <p>Nothing catalogued here yet.</p>}
      {items?.length > 0 && visibleItems.length === 0 && (
        <p>No entries match &ldquo;{query}&rdquo;.</p>
      )}

      {visibleItems?.length > 0 && (
        <ul className="entry-grid">
          {visibleItems.map((item) => (
            <li key={item.id}>
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
      )}
    </main>
  );
}
