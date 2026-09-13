import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { useAuth0 } from "@auth0/auth0-react";
import ActivityHeatmap from "../components/ActivityHeatmap";
import AuthImage from "../components/AuthImage";
import { SUB_CATEGORY_LABELS } from "../components/subCategoryMeta";
import CategoryBars from "../components/CategoryBars";
import FriendsRow from "../components/FriendsRow";
import PageHeader from "../components/PageHeader";
import StampShelf from "../components/StampShelf";
import {
  getItems,
  getAchievements,
  getFriends,
  getMe,
  setMyUsername,
  uploadAvatar,
  avatarSrc,
} from "../lib/api";
import { toStampAchievements } from "../lib/achievements";

function formatWhen(timeTaken) {
  if (!timeTaken) return null;
  return new Date(timeTaken * 1000).toLocaleDateString(undefined, { dateStyle: "medium" });
}

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
  const [friends, setFriends] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    getItems().then(setItems).catch((err) => setErrorMessage(err.message));
    getAchievements().then(setAchievements).catch(() => {});
    getMe().then(setMe).catch(() => {});
    getFriends().then((data) => setFriends(data.friends)).catch(() => {});
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

  // newest first, and only a few - this sits beside the favourite, not
  // instead of the Entries page
  const recent = useMemo(() => {
    if (!items) return [];
    return [...items].sort((a, b) => (b.time_taken || 0) - (a.time_taken || 0)).slice(0, 3);
  }, [items]);

  // Only a find you actually starred. Standing in the most recent one made the
  // profile claim a favourite that was never chosen.
  const favorite = useMemo(() => {
    if (!items || items.length === 0) return null;
    const marked = items.filter((item) => item.is_favorite);
    return marked.length > 0 ? marked[marked.length - 1] : null;
  }, [items]);

  const unlockedStamps = useMemo(() => {
    if (!achievements) return null;
    return toStampAchievements(achievements).filter((stamp) => stamp.unlocked);
  }, [achievements]);
  // Counted off the shelf rather than the API response: an achievement with no
  // stamp art yet is real on the backend but never rendered here, so counting
  // the raw list claimed one more badge than the shelf could show.
  const unlockedCount = unlockedStamps?.length ?? 0;

  const startedAt = useMemo(() => {
    if (me?.created_at) return me.created_at;
    const stamps = (items || []).map((item) => item.time_taken).filter(Boolean);
    return stamps.length > 0 ? Math.min(...stamps) : null;
  }, [me, items]);

  const avatarUrl = me?.avatar_url ? avatarSrc(me.avatar_url) : user?.picture;

  return (
    <main className="page-body profile-screen">
      <PageHeader
        title="Profile"
        accent="#8f6518"
      />

      {errorMessage && <p role="alert">{errorMessage}</p>}

      {/* Stacking order on a phone falls out of this source order: identity,
          friends, activity, favourite, achievements. */}
      <div className="profile-columns">
        <div className="profile-identity-block">
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
              {startedAt && (
                <p className="profile-started">
                  Journal started{" "}
                  {new Date(startedAt * 1000).toLocaleDateString(undefined, {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>

          <FriendsRow friends={friends} />
        </div>

        <div className="profile-column">
          <section className="profile-section">
            <h2>Activity</h2>
            {items ? <ActivityHeatmap items={items} /> : <p>Gathering your history...</p>}
          </section>

          <section className="profile-section">
            <h2>Collection</h2>
            {items ? <CategoryBars items={items} /> : <p>Counting your finds...</p>}
          </section>
        </div>

        <div className="profile-column">
          <section className="profile-section">
            <h2>Favorite find</h2>
            {favorite ? (
              <Link to={`/entry/${favorite.id}`} className="profile-favorite">
                <AuthImage path={favorite.image_path} alt={favorite.name} />
                <div>
                  <strong>{favorite.name}</strong>
                  <span>{SUB_CATEGORY_LABELS[favorite.sub_category] || favorite.sub_category}</span>
                </div>
              </Link>
            ) : (
              <p>No favorite yet. Open a find and tap its star to pick one.</p>
            )}
          </section>

          <section className="profile-section">
            <h2>Recent finds</h2>
            {recent.length > 0 ? (
              <ul className="recent-finds">
                {recent.map((item) => (
                  <li key={item.id}>
                    <Link to={`/entry/${item.id}`} className="recent-find">
                      <AuthImage path={item.image_path} alt="" />
                      <span className="recent-find-text">
                        <strong>{item.name}</strong>
                        <span>{formatWhen(item.time_taken)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nothing logged yet.</p>
            )}
          </section>

          <section className="profile-section">
            <h2>Stamps ({unlockedCount})</h2>
            {unlockedStamps && unlockedStamps.length > 0 ? (
              <StampShelf achievements={unlockedStamps} />
            ) : (
              <p>Log finds and earn your first stamp. See them all on the Stamps page.</p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
