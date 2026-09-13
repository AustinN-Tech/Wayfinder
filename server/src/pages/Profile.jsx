import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { useAuth0 } from "@auth0/auth0-react";
import ActivityHeatmap from "../components/ActivityHeatmap";
import AuthImage from "../components/AuthImage";
import StampAlbum from "../components/StampAlbum";
import { getItems, getAchievements, getMe, setMyUsername, uploadAvatar, avatarSrc } from "../lib/api";
import { toStampAchievements } from "../lib/achievements";

function UsernameEditor({ me, onSaved }) {
  // Editing by default only while there's nothing to show yet - claiming a
  // username is the thing that needs doing; once set, it's just a fact,
  // so it collapses to plain text with a small edit trigger.
  const [editing, setEditing] = useState(!me.username);
  const [value, setValue] = useState(me.username || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function save(e) {
    e.preventDefault();
    if (!value.trim() || busy) return;
    setBusy(true);
    setError("");
    setMyUsername(value.trim().toLowerCase())
      .then((updated) => {
        onSaved(updated);
        setEditing(false);
      })
      .catch((err) => setError(err.message))
      .finally(() => setBusy(false));
  }

  if (!editing) {
    return (
      <div className="profile-username-row profile-username-display">
        <span>@{me.username}</span>
        <button
          type="button"
          className="profile-username-edit-trigger"
          onClick={() => setEditing(true)}
          aria-label="Edit username"
        >
          ⋯
        </button>
      </div>
    );
  }

  return (
    <form className="profile-username-form" onSubmit={save}>
      <div className="profile-username-row">
        <span className="profile-username-at">@</span>
        <input
          id="username"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="explorer_jane"
          maxLength={24}
          autoFocus
        />
        <button type="submit" disabled={busy}>
          {me.username ? "Save" : "Claim"}
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
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    getItems().then(setItems).catch((err) => setErrorMessage(err.message));
    getAchievements().then(setAchievements).catch(() => {});
    getMe().then(setMe).catch(() => {});
  }, []);

  function handleAvatarPick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || avatarBusy) return;
    setAvatarBusy(true);
    uploadAvatar(file)
      .then(setMe)
      .catch((err) => setErrorMessage(err.message))
      .finally(() => setAvatarBusy(false));
  }

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

  const avatarUrl = me?.avatar_url ? avatarSrc(me.avatar_url) : user?.picture;

  return (
    <main className="page-body profile-screen">
      <h1>Profile</h1>

      <div className="profile-card">
        <button
          type="button"
          className="profile-avatar-button"
          onClick={() => fileInputRef.current?.click()}
          disabled={avatarBusy}
          aria-label="Change profile picture"
        >
          <img className="profile-avatar" src={avatarUrl} alt="" referrerPolicy="no-referrer" />
          <span className="profile-avatar-edit">{avatarBusy ? "..." : "Edit"}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleAvatarPick}
        />
        <div className="profile-identity">
          <p className="profile-name">{user?.name || user?.nickname || "Explorer"}</p>
          {me && <UsernameEditor me={me} onSaved={setMe} />}
        </div>
      </div>

      <Link to="/friends" className="profile-friends-link">
        Friends {"->"}
      </Link>

      {errorMessage && <p role="alert">{errorMessage}</p>}
      {!items && !errorMessage && <p>Gathering your history...</p>}

      {items && (
        <div className="profile-columns">
          <section className="profile-section">
            <h2>Activity</h2>
            <ActivityHeatmap items={items} />
          </section>

          <div className="profile-column-side">
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
          </div>
        </div>
      )}
    </main>
  );
}
