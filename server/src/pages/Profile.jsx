import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth0 } from "@auth0/auth0-react";
import PageDoodles from "../components/PageDoodles";
import ActivityHeatmap from "../components/ActivityHeatmap";
import AuthImage from "../components/AuthImage";
import StampAlbum from "../components/StampAlbum";
import { getItems, getAchievements, getMe, setMyUsername } from "../lib/api";
import { toStampAchievements } from "../lib/achievements";

function UsernameEditor({ me, onSaved }) {
  const [value, setValue] = useState(me.username || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function save(e) {
    e.preventDefault();
    if (!value.trim() || busy) return;
    setBusy(true);
    setError("");
    setMyUsername(value.trim().toLowerCase())
      .then(onSaved)
      .catch((err) => setError(err.message))
      .finally(() => setBusy(false));
  }

  return (
    <form className="profile-username-form" onSubmit={save}>
      <label htmlFor="username">
        {me.username ? "Your public username" : "Claim a public username to add friends"}
      </label>
      <div className="profile-username-row">
        <span className="profile-username-at">@</span>
        <input
          id="username"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="explorer_jane"
          maxLength={24}
        />
        <button type="submit" disabled={busy}>
          {me.username ? "Update" : "Claim"}
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

export default function Profile() {
  const { user } = useAuth0();
  const [items, setItems] = useState(null);
  const [achievements, setAchievements] = useState(null);
  const [me, setMe] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    getItems().then(setItems).catch((err) => setErrorMessage(err.message));
    getAchievements().then(setAchievements).catch(() => {});
    getMe().then(setMe).catch(() => {});
  }, []);

  const favorite = useMemo(() => {
    if (!items || items.length === 0) return null;
    const marked = items.filter((item) => item.is_favorite);
    if (marked.length > 0) return marked[marked.length - 1];
    // No favorite chosen yet - the most recent find is a reasonable stand-in.
    return [...items].sort((a, b) => b.time_taken - a.time_taken)[0];
  }, [items]);

  const unlockedCount = achievements?.filter((a) => a.unlocked).length ?? 0;
  const unlockedStamps = useMemo(() => {
    if (!achievements) return null;
    return toStampAchievements(achievements).filter((stamp) => stamp.unlocked);
  }, [achievements]);

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

      {me && <UsernameEditor me={me} onSaved={setMe} />}

      <Link to="/friends" className="profile-friends-link">
        Friends {"->"}
      </Link>

      {errorMessage && <p role="alert">{errorMessage}</p>}
      {!items && !errorMessage && <p>Gathering your history...</p>}

      {items && (
        <>
          <section className="profile-section">
            <h2>Activity</h2>
            <ActivityHeatmap items={items} />
          </section>

          <section className="profile-section">
            <h2>Favorite find</h2>
            {favorite ? (
              <Link to={`/entry/${favorite.id}`} className="profile-favorite">
                <AuthImage path={favorite.image_path} alt={favorite.name} />
                <div>
                  <strong>{favorite.name}</strong>
                  <span>{favorite.sub_category}</span>
                </div>
              </Link>
            ) : (
              <p>Nothing logged yet — your first find will show up here.</p>
            )}
          </section>

          <section className="profile-section">
            <h2>Achievements ({unlockedCount})</h2>
            {unlockedStamps && unlockedStamps.length > 0 ? (
              <StampAlbum achievements={unlockedStamps} />
            ) : (
              <p>Log finds and earn your first stamp — see them all on the Stamps page.</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
