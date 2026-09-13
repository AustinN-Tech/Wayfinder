import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { analyzeItem, createItem } from "../lib/api";

export default function Result() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const photoUrl = state?.photoUrl;
  const photoBlob = state?.photoBlob;

  const [suggestions, setSuggestions] = useState(null);
  const [coords, setCoords] = useState(null);
  const [status, setStatus] = useState(photoBlob ? "analyzing" : "idle"); // idle | analyzing | ready | saving | error
  const [errorMessage, setErrorMessage] = useState("");

  // Asked for up front so a location is ready by the time a choice is made.
  // Saving without one is fine, so a refusal or timeout is not an error.
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) =>
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => {},
      { timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    if (!photoBlob) return;

    analyzeItem(photoBlob)
      .then((suggestionList) => {
        setSuggestions(suggestionList.slice(0, 3));
        setStatus("ready");
      })
      .catch((err) => {
        setErrorMessage(err.message);
        setStatus("error");
      });
  }, [photoBlob]);

  async function selectSuggestion(suggestion) {
    setStatus("saving");
    try {
      const saved = await createItem(
        {
          name: suggestion.name || "",
          category: suggestion.category || "",
          sub_category: suggestion.sub_category || "",
          time_period: suggestion.time_period || "",
          description: suggestion.description || "",
          ...(coords || {}),
        },
        photoBlob
      );
      navigate(`/entry/${saved.item.id}`);
    } catch (err) {
      setErrorMessage(err.message);
      setStatus("ready");
    }
  }

  function retakePhoto() {
    navigate("/camera");
  }

  if (!photoUrl || !photoBlob) {
    return (
      <main className="result-screen">
        <h1>What did you find?</h1>
        <p>No photo captured yet.</p>
        <Link to="/camera">Take a photo</Link>
      </main>
    );
  }

  return (
    <main className="page-body result-screen">
      <h1>What did you find?</h1>
      <img className="captured-photo" src={photoUrl} alt="Captured" />

      {status === "analyzing" && <p>Identifying what you found...</p>}
      {status === "saving" && <p>Saving...</p>}
      {status === "error" && <p role="alert">{errorMessage}</p>}

      {suggestions && (
        <div className="suggestion-list">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className="suggestion-card"
              onClick={() => selectSuggestion(suggestion)}
              disabled={status === "saving"}
            >
              <strong>{suggestion.name}</strong>
              <div className="suggestion-meta">
                {suggestion.category} - {suggestion.sub_category} - {suggestion.time_period}
              </div>
              <div>{suggestion.description}</div>
              <div className="confidence">
                Confidence: {Math.round((suggestion.confidence || 0) * 100)}%
              </div>
            </button>
          ))}

          <button
            type="button"
            className="suggestion-card none-of-above"
            onClick={retakePhoto}
            disabled={status === "saving"}
          >
            None of the above
          </button>
        </div>
      )}
    </main>
  );
}
