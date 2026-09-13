import { useEffect, useState } from "react";
import PageDoodles from "../components/PageDoodles";
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
      <PageDoodles variant="feed" />
      <h1>Entries</h1>

      {errorMessage && <p role="alert">{errorMessage}</p>}
      {!items && !errorMessage && <p>Opening your journal...</p>}

      {items?.length === 0 && (
        <p>Nothing catalogued yet — press the seal at the foot of the page to add your first find.</p>
      )}

      {items && categoryData && (
        <CategoryAlbum items={items} subcategoriesByCategory={categoryData.subcategories} />
      )}
    </main>
  );
}
