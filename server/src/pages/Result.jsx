import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import PageHeader from "../components/PageHeader";
import { SUB_CATEGORY_LABELS } from "../components/subCategoryMeta";
import { categoryLabel, sentenceCase } from "../components/categories";
import { analyzeItem, createItem } from "../lib/api";

// The backend answers with a stable code, never provider text. Anything
// unrecognised falls through to the generic line.
const ERROR_MESSAGES = {
  model_unavailable:
    "The identification desk is busy right now. Give it a moment and try again.",
  too_fast: "One find at a time. Take a breath and try again in a moment.",
  quota_exceeded: "The identification desk has had a long day. Try again shortly.",
};
const GENERIC_ERROR = "Something went wrong identifying this. Try again in a moment.";

export default function Result() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const photoBlob = state?.photoBlob;
  const previewRef = useRef(null);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!photoBlob || !previewRef.current) return;
    const url = URL.createObjectURL(photoBlob);
    previewRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [photoBlob]);

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

  // Fires the request only - state changes land in the callbacks, so the
  // first-run effect below isn't setting state synchronously.
  const runIdentify = useCallback(() => {
    if (!photoBlob) return;

    analyzeItem(photoBlob)
      .then((suggestionList) => {
        setSuggestions(suggestionList.slice(0, 3));
        setStatus("ready");
      })
      .catch((err) => {
        setErrorMessage(ERROR_MESSAGES[err.message] || GENERIC_ERROR);
        setStatus("error");
      });
  }, [photoBlob]);

  // The initial status is already "analyzing", so the first run just asks.
  useEffect(() => {
    runIdentify();
  }, [runIdentify]);

  // Retries send the same photo back, so a failure never costs you the capture.
  function retryIdentify() {
    setStatus("analyzing");
    setErrorMessage("");
    runIdentify();
  }

  async function selectSuggestion(suggestion) {
    if (savingRef.current) return;
    savingRef.current = true;
    setErrorMessage("");
    setStatus("saving");
    try {
      const saved = await createItem(
        {
          name: suggestion.name || "",
          category: suggestion.category || "",
          sub_category: suggestion.sub_category || "",
          time_period: suggestion.time_period || "",
          description: suggestion.description || "",
          confidence: suggestion.confidence ?? "",
          ...(coords || {}),
        },
        photoBlob
      );
      navigate(`/entry/${saved.item.id}`);
    } catch (err) {
      savingRef.current = false;
      setErrorMessage(err.message);
      setStatus("ready");
    }
  }

  function retakePhoto() {
    navigate("/camera");
  }

  if (!photoBlob) {
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
      <PageHeader title="What did you find?" rule={false} accent="#8f6518" />

      <figure className="captured-figure">
        <img ref={previewRef} className="captured-photo" alt="Captured" />
      </figure>

      {status === "analyzing" && (
        <p className="result-status" role="status">
          Identifying what you found
          <span className="thinking-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </p>
      )}

      {status === "saving" && (
        <p className="result-status" role="status">
          Filing it away
          <span className="thinking-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </p>
      )}

      {status === "error" && (
        <div className="result-recovery">
          <p className="result-status is-error" role="alert">
            {errorMessage || GENERIC_ERROR}
          </p>
          <div className="result-recovery-actions">
            <button type="button" className="result-retake" onClick={retryIdentify}>
              Try again
            </button>
            <button
              type="button"
              className="result-retake is-secondary"
              onClick={retakePhoto}
            >
              Take another photo
            </button>
          </div>
        </div>
      )}

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
                {categoryLabel(suggestion.category)} · {SUB_CATEGORY_LABELS[suggestion.sub_category] || suggestion.sub_category} · {sentenceCase(suggestion.time_period)}
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
