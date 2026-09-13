import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ChevronLeft } from "lucide-react";
import ActivityHeatmap from "../components/ActivityHeatmap";
import AuthImage from "../components/AuthImage";
import { SUB_CATEGORY_LABELS } from "../components/subCategoryMeta";
import StampAlbum from "../components/StampAlbum";
import { getFriendProfile, avatarSrc } from "../lib/api";
import { toStampAchievements } from "../lib/achievements";

// items_by_day comes back as a plain { "2026-09-01": 3, ... } map (bucketed
// by UTC day on the backend), but ActivityHeatmap expects HeritageItem-shaped
// rows - this fakes just enough of that shape (a time_taken per logged find)
// to reuse the same component. Anchored at noon UTC, not midnight: the
// heatmap buckets by the viewer's *local* calendar day, and noon stays on
// the same local day for every real timezone (UTC-12..UTC+14), where
// midnight would roll over for viewers west of UTC.
function itemsFromActivity(activityByDay) {
  const items = [];
  for (const [day, count] of Object.entries(activityByDay || {})) {
    const timestamp = Math.floor(new Date(`${day}T12:00:00Z`).getTime() / 1000);
    for (let i = 0; i < count; i++) items.push({ time_taken: timestamp });
  }
  return items;
}

export default function FriendProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    getFriendProfile(id)
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        setErrorMessage("");
      })
      .catch((err) => !cancelled && setErrorMessage(err.message));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (errorMessage) {
    return (
      <main className="page-body profile-screen">
        <h1>Profile</h1>
        <p role="alert">{errorMessage}</p>
        <Link to="/friends">Back to friends</Link>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="page-body profile-screen">
        <p>Opening their journal...</p>
      </main>
    );
  }

  const { user, achievements, activity, favorite } = profile;
  const unlockedStamps = toStampAchievements(achievements).filter((stamp) => stamp.unlocked);

  return (
    <main className="page-body profile-screen">
      <h1>Profile</h1>
      <Link to="/friends" className="back-button">
        <ChevronLeft size={16} aria-hidden="true" />
        Back to friends
      </Link>

      <div className="profile-card">
        <img
          className="profile-avatar"
          src={avatarSrc(user.avatar_url) || "/images/stamp-icons/first-find-stamp.png"}
          alt=""
        />
        <div>
          <p className="profile-name">{user.display_name || `@${user.username}`}</p>
          {user.display_name && <p className="profile-email">@{user.username}</p>}
        </div>
      </div>

      <div className="profile-columns">
        <div className="profile-column">
          <section className="profile-section">
            <h2>Activity</h2>
            <ActivityHeatmap items={itemsFromActivity(activity)} />
          </section>
        </div>

        <div className="profile-column">
          <section className="profile-section">
            <h2>Favorite find</h2>
            {favorite ? (
              <div className="profile-favorite">
                <AuthImage path={favorite.image_path} alt={favorite.name} />
                <div>
                  <strong>{favorite.name}</strong>
                  <span>{SUB_CATEGORY_LABELS[favorite.sub_category] || favorite.sub_category}</span>
                </div>
              </div>
            ) : (
              <p>No favorite chosen yet.</p>
            )}
          </section>

          <section className="profile-section">
            <h2>Achievements ({unlockedStamps.length})</h2>
            {unlockedStamps.length > 0 ? (
              <StampAlbum achievements={unlockedStamps} />
            ) : (
              <p>No stamps earned yet.</p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
