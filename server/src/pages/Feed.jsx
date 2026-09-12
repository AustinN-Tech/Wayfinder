import { useEffect, useState } from "react";
import { Link } from "react-router";
import PageDoodles from "../components/PageDoodles";
import { getItems, imageUrl } from "../lib/api";

function formatWhen(timeTaken) {
  if (!timeTaken) return null;
  return new Date(timeTaken * 1000).toLocaleDateString(undefined, {
    dateStyle: "medium",
  });
}

export default function Feed() {
  const [items, setItems] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    getItems()
      // the API returns oldest first; the journal reads newest first
      .then((list) => setItems([...list].reverse()))
      .catch((err) => setErrorMessage(err.message));
  }, []);

  return (
    <main className="page-body screen">
      <PageDoodles variant="feed" />
      <h1>Entries</h1>

      {errorMessage && <p role="alert">{errorMessage}</p>}
      {!items && !errorMessage && <p>Opening your journal...</p>}

      {items?.length === 0 && (
        <p>Nothing catalogued yet — press the seal at the foot of the page to add your first find.</p>
      )}

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
