import { useEffect, useState } from "react";
import PageDoodles from "../components/PageDoodles";
import PageHeader from "../components/PageHeader";
import CategoryAlbum from "../components/CategoryAlbum";
import { OpenBook } from "../components/icons";
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
      <PageHeader
        title="Entries"
        subtitle="Everything you've catalogued so far, gathered by what it is."
        icon={OpenBook}
        accent="#8f6518"
      />

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
