import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { analyzeItem, createItem, getCategories } from "../lib/api";

export default function Result() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const photoUrl = state?.photoUrl;
  const photoBlob = state?.photoBlob;

  const [categoryData, setCategoryData] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState(photoBlob ? "analyzing" : "idle"); // idle | analyzing | ready | saving | error
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!photoBlob) return;

    Promise.all([analyzeItem(photoBlob), getCategories()])
      .then(([suggestionList, categories]) => {
        setSuggestions(suggestionList);
        setCategoryData(categories);
        setStatus("ready");
        if (suggestionList.length > 0) {
          selectSuggestion(suggestionList[0], 0);
        }
      })
      .catch((err) => {
        setErrorMessage(err.message);
        setStatus("error");
      });
  }, [photoBlob]);

  function selectSuggestion(suggestion, index) {
    setSelectedIndex(index);
    setForm({
      name: suggestion.name || "",
      category: suggestion.category || "",
      sub_category: suggestion.sub_category || "",
      time_period: suggestion.time_period || "",
      description: suggestion.description || "",
    });
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setStatus("saving");
    try {
      await createItem(form, photoBlob);
      navigate("/feed");
    } catch (err) {
      setErrorMessage(err.message);
      setStatus("ready");
    }
  }

  if (!photoUrl || !photoBlob) {
    return (
      <main className="result-screen">
        <h1>Your photo</h1>
        <p>No photo captured yet.</p>
        <Link to="/camera">Take a photo</Link>
      </main>
    );
  }

  const subCategoryOptions = form?.category
    ? categoryData?.subcategories?.[form.category] || []
    : [];
  const timePeriodOptions = form?.category
    ? categoryData?.time_periods?.[form.category] || []
    : [];

  return (
    <main className="result-screen">
      <h1>Your find</h1>
      <img className="captured-photo" src={photoUrl} alt="Captured" />

      {status === "analyzing" && <p>Identifying what you found...</p>}
      {status === "error" && <p role="alert">{errorMessage}</p>}

      {suggestions && (
        <>
          <h2>Which one is it?</h2>
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className={`suggestion-card ${selectedIndex === index ? "selected" : ""}`}
              onClick={() => selectSuggestion(suggestion, index)}
            >
              <strong>{suggestion.name}</strong>
              <div>
                {suggestion.category} - {suggestion.sub_category} - {suggestion.time_period}
              </div>
              <div>{suggestion.description}</div>
              <div className="confidence">
                Confidence: {Math.round((suggestion.confidence || 0) * 100)}%
              </div>
            </button>
          ))}
        </>
      )}

      {form && (
        <div className="result-form">
          <label>
            Name
            <input
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
          </label>

          <label>
            Category
            <select
              value={form.category}
              onChange={(e) => {
                updateField("category", e.target.value);
                updateField("sub_category", "");
                updateField("time_period", "");
              }}
            >
              <option value="" disabled>
                Select a category
              </option>
              {(categoryData?.categories || []).map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label>
            Sub-category
            <select
              value={form.sub_category}
              onChange={(e) => updateField("sub_category", e.target.value)}
              disabled={!form.category}
            >
              <option value="" disabled>
                Select a sub-category
              </option>
              {subCategoryOptions.map((subCategory) => (
                <option key={subCategory} value={subCategory}>
                  {subCategory}
                </option>
              ))}
            </select>
          </label>

          <label>
            Time period
            <select
              value={form.time_period}
              onChange={(e) => updateField("time_period", e.target.value)}
              disabled={!form.category}
            >
              <option value="">Unknown</option>
              {timePeriodOptions.map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>
          </label>

          <label>
            Description
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
            />
          </label>

          <div className="result-actions">
            <Link to="/camera" className="secondary" style={{ textAlign: "center", lineHeight: "2.5rem" }}>
              Retake
            </Link>
            <button
              type="button"
              className="primary"
              onClick={handleSave}
              disabled={!form.name || !form.category || !form.sub_category || status === "saving"}
            >
              {status === "saving" ? "Saving..." : "Save to journal"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
