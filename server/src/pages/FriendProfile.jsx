import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ChevronLeft } from "lucide-react";
import ActivityHeatmap from "../components/ActivityHeatmap";
import AuthImage from "../components/AuthImage";
import { SUB_CATEGORY_LABELS } from "../components/subCategoryMeta";
import CategoryBars from "../components/CategoryBars";
import PageHeader from "../components/PageHeader";
import StampShelf from "../components/StampShelf";
import { friendInitial, friendInk } from "../lib/friends";
import { getFriendProfile, avatarSrc } from "../lib/api";
import { toStampAchievements } from "../lib/achievements";

// items_by_day comes back as a plain { "2026-09-01": 3, ... } map (bucketed
// by UTC day on the backend), but ActivityHeatmap expects HeritageItem-shaped
// rows - this fakes just enough of that shape (a time_taken per logged find)
// to reuse the same component. Anchored at noon UTC, not midnight: the
// heatmap buckets by the viewer's *local* calendar day, and noon stays on
// the same local day for every real timezone (UTC-12..UTC+14), where
// midnight would roll over for viewers west of UTC.
function formatWhen(timeTaken) {
  if (!timeTaken) return null;
  return new Date(timeTaken * 1000).toLocaleDateString(undefined, { dateStyle: "medium" });
}

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

  const { user, achievements, activity, favorite, categories, recent } = profile;
  const unlockedStamps = toStampAchievements(achievements).filter((stamp) => stamp.unlocked);

  return (
    <main className="page-body profile-screen">
      <PageHeader title="Profile" accent="#8f6518" />

      <Link to="/friends" className="back-button">
        <ChevronLeft size={16} aria-hidden="true" />
        Back to friends
      </Link>

      {/* same shape as your own profile: identity across the top, then the
          two columns beneath it */}
      <div className="profile-columns">
        <div className="profile-identity-block">
          <div className="profile-card">
            {user.avatar_url ? (
              <img className="profile-avatar" src={avatarSrc(user.avatar_url)} alt="" />
            ) : (
              <span
                className="profile-avatar is-initial"
                style={{ "--friend-ink": friendInk(user) }}
                aria-hidden="true"
              >
                {friendInitial(user)}
              </span>
            )}
            <div className="profile-identity">
              <p className="profile-name">{user.display_name || `@${user.username}`}</p>
              {user.display_name && <p className="profile-email">@{user.username}</p>}
              {user.created_at && (
                <p className="profile-started">
                  Journal started{" "}
                  {new Date(user.created_at * 1000).toLocaleDateString(undefined, {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="profile-column">
          <section className="profile-section">
            <h2>Activity</h2>
            <ActivityHeatmap items={itemsFromActivity(activity)} />
          </section>

          <section className="profile-section">
            <h2>Collection</h2>
            <CategoryBars counts={categories} />
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
            <h2>Recent finds</h2>
            {recent && recent.length > 0 ? (
              <ul className="recent-finds">
                {recent.map((item) => (
                  <li key={item.id}>
                    <span className="recent-find">
                      <AuthImage path={item.image_path} alt="" />
                      <span className="recent-find-text">
                        <strong>{item.name}</strong>
                        <span>{formatWhen(item.time_taken)}</span>
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nothing logged yet.</p>
            )}
          </section>

          <section className="profile-section">
            <h2>Stamps ({unlockedStamps.length})</h2>
            {unlockedStamps.length > 0 ? (
              <StampShelf achievements={unlockedStamps} />
            ) : (
              <p>No stamps earned yet.</p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
