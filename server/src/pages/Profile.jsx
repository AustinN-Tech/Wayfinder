import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth0 } from "@auth0/auth0-react";
import PageDoodles from "../components/PageDoodles";
import ActivityHeatmap from "../components/ActivityHeatmap";
import AuthImage from "../components/AuthImage";
import { getItems } from "../lib/api";

export default function Profile() {
  const { user } = useAuth0();
  const [items, setItems] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    getItems()
      .then(setItems)
      .catch((err) => setErrorMessage(err.message));
  }, []);

  // The most recently logged find stands in for a "favorite" until there's
  // an actual way for a user to pick one.
  const latestFind = useMemo(() => {
    if (!items || items.length === 0) return null;
    return [...items].sort((a, b) => b.time_taken - a.time_taken)[0];
  }, [items]);

  return (
    <main className="page-body profile-screen">
      <PageDoodles variant="profile" />
      <h1>Profile</h1>

      <div className="profile-card">
        <img
          className="profile-avatar"
          src={user?.picture}
          alt=""
          referrerPolicy="no-referrer"
        />
        <div>
          <p className="profile-name">{user?.name || user?.nickname || "Explorer"}</p>
          <p className="profile-email">{user?.email}</p>
        </div>
      </div>

      {errorMessage && <p role="alert">{errorMessage}</p>}
      {!items && !errorMessage && <p>Gathering your history...</p>}

      {items && (
        <>
          <section className="profile-section">
            <h2>Activity</h2>
            <ActivityHeatmap items={items} />
          </section>

          <section className="profile-section">
            <h2>Latest find</h2>
            {latestFind ? (
              <Link to={`/entry/${latestFind.id}`} className="profile-favorite">
                <AuthImage path={latestFind.image_path} alt={latestFind.name} />
                <div>
                  <strong>{latestFind.name}</strong>
                  <span>{latestFind.sub_category}</span>
                </div>
              </Link>
            ) : (
              <p>Nothing logged yet — your first find will show up here.</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
