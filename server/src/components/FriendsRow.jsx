import { Link } from "react-router";
import { avatarSrc } from "../lib/api";
import { friendInitial, friendInk } from "../lib/friends";

const VISIBLE = 5;

// The whole row is one link into the friends list - the avatars are the
// affordance, so it has to read as tappable rather than as decoration.
export default function FriendsRow({ friends }) {
  const shown = friends.slice(0, VISIBLE);
  const overflow = friends.length - shown.length;

  return (
    <Link to="/friends" className="friends-row">
      <span className="friends-row-heading">
        Friends
        {friends.length > 0 && <span className="friends-row-count">({friends.length})</span>}
      </span>

      {friends.length === 0 ? (
        <span className="friends-row-empty">No friends yet. Invite someone.</span>
      ) : (
        <span className="friends-row-avatars">
          {shown.map((friend) => (
            <span
              key={friend.id}
              className="friend-avatar"
              style={{ "--friend-ink": friendInk(friend) }}
              title={friend.display_name || friend.username}
            >
              {friend.avatar_url ? (
                <img src={avatarSrc(friend.avatar_url)} alt="" referrerPolicy="no-referrer" />
              ) : (
                friendInitial(friend)
              )}
            </span>
          ))}

          {overflow > 0 && <span className="friend-avatar is-overflow">+{overflow}</span>}
        </span>
      )}
    </Link>
  );
}
