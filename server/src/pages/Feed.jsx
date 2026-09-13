import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import CategoryAlbum from "../components/CategoryAlbum";
import { getItems, getCategories } from "../lib/api";

export default function Feed() {
  const [items, setItems] = useState(null);
  const [categoryData, setCategoryData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    Promise.all([getItems(), getCategories()])
      .then(([itemList, categories]) => {
        setItems(itemList);
        setCategoryData(categories);
      })
      .catch((err) => setErrorMessage(err.message));
  }, []);

  return (
    <main className="page-body screen">
      <PageHeader
        title="Entries"
        subtitle="Everything you've catalogued so far, gathered by what it is."
        accent="#8f6518"
        note={items ? `${items.length} ${items.length === 1 ? "find" : "finds"} catalogued` : undefined}
      />

      {errorMessage && <p role="alert">{errorMessage}</p>}
      {!items && !errorMessage && <p>Opening your journal...</p>}

      {items?.length === 0 && (
        <p>Nothing catalogued yet. Press the seal at the foot of the page to add your first find.</p>
      )}

      {items && categoryData && (
        <CategoryAlbum items={items} subcategoriesByCategory={categoryData.subcategories} />
      )}
    </main>
  );
}
