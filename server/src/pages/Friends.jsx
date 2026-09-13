import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ChevronLeft, Search } from "lucide-react";
import {
  getFriends,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriend,
  avatarSrc,
} from "../lib/api";

function UserRow({ user, children, canViewProfile = false }) {
  const Identity = canViewProfile ? Link : "div";
  return (
    <li className="friend-row">
      <Identity {...(canViewProfile ? { to: `/friends/${user.user_id}` } : {})} className="friend-row-identity">
        <img
          className="friend-row-avatar"
          src={avatarSrc(user.avatar_url) || "/images/stamp-icons/first-find-stamp.png"}
          alt=""
        />
        <span>{user.display_name || `@${user.username}`}</span>
      </Identity>
      <div className="friend-row-actions">{children}</div>
    </li>
  );
}

export default function Friends() {
  const [data, setData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [searchBusy, setSearchBusy] = useState(false);

  function reload() {
    getFriends().then(setData).catch((err) => setErrorMessage(err.message));
  }

  useEffect(reload, []);

  useEffect(() => {
    let cancelled = false;
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      const timeout = setTimeout(() => !cancelled && setResults([]), 0);
      return () => {
        cancelled = true;
        clearTimeout(timeout);
      };
    }

    const timeout = setTimeout(() => {
      setSearchBusy(true);
      searchUsers(trimmed)
        .then((users) => !cancelled && setResults(users))
        .catch(() => !cancelled && setResults([]))
        .finally(() => !cancelled && setSearchBusy(false));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  function withBusy(userId, action) {
    setBusyId(userId);
    action()
      .then(() => {
        setResults((prev) => prev.filter((u) => u.user_id !== userId));
        reload();
      })
      .catch((err) => setErrorMessage(err.message))
      .finally(() => setBusyId(null));
  }

  // a search takes the page over, so your own lists aren't competing with
  // the results underneath them
  const searching = query.trim().length >= 2;

  return (
    <main className="page-body friends-screen">
      <h1>Friends</h1>
      <Link to="/profile" className="back-button">
        <ChevronLeft size={16} aria-hidden="true" />
        Back to profile
      </Link>

      {errorMessage && <p role="alert">{errorMessage}</p>}

      <section className="profile-section">
        <label className="feed-search friend-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search by username"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search by username"
          />
        </label>
        {searching && results.length === 0 && !searchBusy && (
          <p className="friend-search-empty">
            No one found for &ldquo;{query.trim()}&rdquo;. Usernames have to match exactly.
          </p>
        )}

        {results.length > 0 && (
          <ul className="friend-list">
            {results.map((user) => (
              <UserRow key={user.user_id} user={user}>
                <button
                  type="button"
                  disabled={busyId === user.user_id}
                  onClick={() => withBusy(user.user_id, () => sendFriendRequest(user.user_id))}
                >
                  Add friend
                </button>
              </UserRow>
            ))}
          </ul>
        )}
      </section>

      {!searching && data && data.incoming.length > 0 && (
        <section className="profile-section">
          <h2>Requests</h2>
          <ul className="friend-list">
            {data.incoming.map((user) => (
              <UserRow key={user.user_id} user={user}>
                <button
                  type="button"
                  disabled={busyId === user.user_id}
                  onClick={() => withBusy(user.user_id, () => acceptFriendRequest(user.user_id))}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="friend-row-decline"
                  disabled={busyId === user.user_id}
                  onClick={() => withBusy(user.user_id, () => removeFriend(user.user_id))}
                >
                  Decline
                </button>
              </UserRow>
            ))}
          </ul>
        </section>
      )}

      {!searching && data && data.outgoing.length > 0 && (
        <section className="profile-section">
          <h2>Pending</h2>
          <ul className="friend-list">
            {data.outgoing.map((user) => (
              <UserRow key={user.user_id} user={user}>
                <span className="friend-row-pending">Waiting</span>
              </UserRow>
            ))}
          </ul>
        </section>
      )}

      {!searching && (
      <section className="profile-section">
        <h2>Friends {data ? `(${data.friends.length})` : ""}</h2>
        {data && data.friends.length === 0 && <p>No friends yet. Search for a username above.</p>}
        {data && data.friends.length > 0 && (
          <ul className="friend-list">
            {data.friends.map((user) => (
              <UserRow key={user.user_id} user={user} canViewProfile>
                <button
                  type="button"
                  className="friend-row-decline"
                  disabled={busyId === user.user_id}
                  onClick={() => withBusy(user.user_id, () => removeFriend(user.user_id))}
                >
                  Remove
                </button>
              </UserRow>
            ))}
          </ul>
        )}
      </section>
      )}
    </main>
  );
}
