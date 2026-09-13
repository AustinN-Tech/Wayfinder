import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import PageDoodles from "../components/PageDoodles";
import { SUB_CATEGORY_LABELS } from "../components/subCategoryMeta";
import { getItems, imageUrl } from "../lib/api";

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

  return (
    <main className="page-body screen">
      <PageDoodles variant="feed" />

      <Link to="/feed" className="category-back">
        &larr; All entries
      </Link>
      <h1>{label}</h1>

      {errorMessage && <p role="alert">{errorMessage}</p>}
      {!items && !errorMessage && <p>Opening your journal...</p>}
      {items?.length === 0 && <p>Nothing catalogued here yet.</p>}

      {items?.length > 0 && (
        <ul className="entry-grid">
          {items.map((item) => (
            <li key={item.id}>
              <Link to={`/entry/${item.id}`} className="entry-card">
                <span className="entry-card-frame">
                  <img src={imageUrl(item.image_path)} alt="" loading="lazy" />
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
