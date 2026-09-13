import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { useAuth0 } from "@auth0/auth0-react";
import ActivityHeatmap from "../components/ActivityHeatmap";
import AuthImage from "../components/AuthImage";
import FriendsRow from "../components/FriendsRow";
import PageHeader from "../components/PageHeader";
import StampAlbum from "../components/StampAlbum";
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

  // Only a find you actually starred. Standing in the most recent one made the
  // profile claim a favourite that was never chosen.
  const favorite = useMemo(() => {
    if (!items || items.length === 0) return null;
    const marked = items.filter((item) => item.is_favorite);
    return marked.length > 0 ? marked[marked.length - 1] : null;
  }, [items]);

  const unlockedCount = achievements?.filter((a) => a.unlocked).length ?? 0;
  const unlockedStamps = useMemo(() => {
    if (!achievements) return null;
    return toStampAchievements(achievements).filter((stamp) => stamp.unlocked);
  }, [achievements]);

  const avatarUrl = me?.avatar_url ? avatarSrc(me.avatar_url) : user?.picture;

  return (
    <main className="page-body profile-screen">
      <PageHeader
        title="Profile"
        subtitle="Your record so far, and the stamps it has earned you."
        accent="#8f6518"
      />

      {errorMessage && <p role="alert">{errorMessage}</p>}

      {/* Stacking order on a phone falls out of this source order: identity,
          friends, activity, favourite, achievements. */}
      <div className="profile-columns">
        <div className="profile-column">
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

          <FriendsRow friends={friends} />

          <section className="profile-section">
            <h2>Activity</h2>
            {items ? <ActivityHeatmap items={items} /> : <p>Gathering your history...</p>}
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
                  <span>{favorite.sub_category}</span>
                </div>
              </Link>
            ) : (
              <p>No favorite yet. Open a find and tap its star to pick one.</p>
            )}
          </section>

          <section className="profile-section">
            <h2>Achievements ({unlockedCount})</h2>
            {unlockedStamps && unlockedStamps.length > 0 ? (
              <div className="profile-achievements">
                <StampAlbum achievements={unlockedStamps} />
              </div>
            ) : (
              <p>Log finds and earn your first stamp — see them all on the Stamps page.</p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
