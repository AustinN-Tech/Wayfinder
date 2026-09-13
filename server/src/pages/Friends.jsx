import { useEffect, useState } from "react";
import { Link } from "react-router";
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
      searchUsers(trimmed)
        .then((users) => !cancelled && setResults(users))
        .catch(() => !cancelled && setResults([]));
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

  return (
    <main className="page-body friends-screen">
      <h1>Friends</h1>
      <Link to="/profile" className="profile-friends-link">
        {"<-"} Back to profile
      </Link>

      {errorMessage && <p role="alert">{errorMessage}</p>}

      <section className="profile-section">
        <input
          type="search"
          className="friend-search"
          placeholder="Search by username"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
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

      {data && data.incoming.length > 0 && (
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

      {data && data.outgoing.length > 0 && (
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
    </main>
  );
}
