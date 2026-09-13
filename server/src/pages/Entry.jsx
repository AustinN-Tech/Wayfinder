import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Trash2 } from "lucide-react";
import { deleteItem, getItem, setFavorite } from "../lib/api";
import AuthImage from "../components/AuthImage";
import PageHeader from "../components/PageHeader";

function formatCoords(latitude, longitude) {
  if (latitude == null || longitude == null) return null;
  const ns = latitude >= 0 ? "N" : "S";
  const ew = longitude >= 0 ? "E" : "W";
  return `${Math.abs(latitude).toFixed(4)}° ${ns}, ${Math.abs(longitude).toFixed(4)}° ${ew}`;
}

function formatWhen(timeTaken) {
  if (!timeTaken) return null;
  return new Date(timeTaken * 1000).toLocaleDateString(undefined, {
    dateStyle: "long",
  });
}

export default function Entry() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);

  useEffect(() => {
    getItem(id)
      .then(setItem)
      .catch((err) => setErrorMessage(err.message));
  }, [id]);

  async function handleDelete() {
    if (deleting || !item) return;
    if (!window.confirm(`Delete "${item.name}"? This can't be undone.`)) return;

    setDeleting(true);
    try {
      await deleteItem(id);
      navigate("/feed");
    } catch (err) {
      setErrorMessage(err.message);
      setDeleting(false);
    }
  }

  function toggleFavorite() {
    if (favoriteBusy) return;
    setFavoriteBusy(true);
    setFavorite(item.id, !item.is_favorite)
      .then(setItem)
      .catch((err) => setErrorMessage(err.message))
      .finally(() => setFavoriteBusy(false));
  }

  if (errorMessage) {
    return (
      <main className="entry-screen">
        <h1>Entry</h1>
        <p role="alert">{errorMessage}</p>
        <Link to="/feed">Back to entries</Link>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="entry-screen">
        <p>Opening the entry...</p>
      </main>
    );
  }

  const coords = formatCoords(item.latitude, item.longitude);
  const when = formatWhen(item.time_taken);

  return (
    <main className="page-body entry-screen">
      <PageHeader
        title={item.name}
        rule={false}
        accent={item.category === "NATURAL" ? "#3f6b4e" : "#a8452f"}
        aside={
          <button
            type="button"
            className={`entry-favorite-toggle ${item.is_favorite ? "active" : ""}`}
            onClick={toggleFavorite}
            disabled={favoriteBusy}
            aria-pressed={!!item.is_favorite}
            aria-label={item.is_favorite ? "Remove as favorite" : "Mark as favorite"}
          >
            ★
          </button>
        }
      />

      <figure className="entry-figure">
        <AuthImage className="entry-photo" path={item.image_path} alt={item.name} />
      </figure>

      <p className="entry-tags">
        <span className="entry-tags-label">Filed under</span>
        <span className="entry-tag">{item.category}</span>
        <span className="entry-tag">{item.sub_category}</span>
        {item.time_period && <span className="entry-tag">{item.time_period}</span>}
      </p>

      <dl className="entry-meta">
        <dt>Discovered at</dt>
        <dd className={coords ? undefined : "is-unrecorded"}>
          {coords || "location not recorded"}
        </dd>
        <dt>on</dt>
        <dd className={when ? undefined : "is-unrecorded"}>{when || "an unknown date"}</dd>
      </dl>

      {item.description && <p className="entry-description">{item.description}</p>}

      <div className="entry-actions">
        <Link className="entry-back" to="/feed">
          Back to entries
        </Link>

        <button type="button" className="entry-delete" onClick={handleDelete} disabled={deleting}>
          <Trash2 size={16} />
          {deleting ? "Deleting..." : "Delete entry"}
        </button>
      </div>
    </main>
  );
}
