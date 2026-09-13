import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import PageDoodles from "../components/PageDoodles";
import ActivityHeatmap from "../components/ActivityHeatmap";
import AuthImage from "../components/AuthImage";
import StampAlbum from "../components/StampAlbum";
import { getFriendProfile } from "../lib/api";
import { toStampAchievements } from "../lib/achievements";

// items_by_day comes back as a plain { "2026-09-01": 3, ... } map, but
// ActivityHeatmap expects HeritageItem-shaped rows - this fakes just enough
// of that shape (a time_taken per logged find) to reuse the same component.
function itemsFromActivity(activityByDay) {
  const items = [];
  for (const [day, count] of Object.entries(activityByDay || {})) {
    const timestamp = Math.floor(new Date(`${day}T00:00:00Z`).getTime() / 1000);
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
      <PageDoodles variant="profile" />
      <h1>{user.display_name || `@${user.username}`}</h1>
      <Link to="/friends" className="profile-friends-link">
        {"<-"} Back to friends
      </Link>

      <div className="profile-card">
        <img
          className="profile-avatar"
          src={user.avatar_url || "/images/stamp-icons/first-find-stamp.png"}
          alt=""
        />
        <div>
          <p className="profile-name">@{user.username}</p>
        </div>
      </div>

      <section className="profile-section">
        <h2>Activity</h2>
        <ActivityHeatmap items={itemsFromActivity(activity)} />
      </section>

      <section className="profile-section">
        <h2>Favorite find</h2>
        {favorite ? (
          <div className="profile-favorite">
            <AuthImage path={favorite.image_path} alt={favorite.name} />
            <div>
              <strong>{favorite.name}</strong>
              <span>{favorite.sub_category}</span>
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
    </main>
  );
}
