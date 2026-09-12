import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { getItem, imageUrl } from "../lib/api";
import PageDoodles from "../components/PageDoodles";

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
  const [item, setItem] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    getItem(id)
      .then(setItem)
      .catch((err) => setErrorMessage(err.message));
  }, [id]);

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
      <PageDoodles variant="entry" />
      <h1>{item.name}</h1>

      <figure className="entry-figure">
        <img className="entry-photo" src={imageUrl(item.image_path)} alt={item.name} />
      </figure>

      <p className="entry-tags">
        <span>{item.category}</span>
        <span>{item.sub_category}</span>
        {item.time_period && <span>{item.time_period}</span>}
      </p>

      <dl className="entry-meta">
        <div>
          <dt>Discovered at</dt>
          <dd>{coords || "location not recorded"}</dd>
        </div>
        <div>
          <dt>On</dt>
          <dd>{when || "unknown"}</dd>
        </div>
      </dl>

      {item.description && <p className="entry-description">{item.description}</p>}

      <Link className="entry-back" to="/feed">
        Back to entries
      </Link>
    </main>
  );
}
