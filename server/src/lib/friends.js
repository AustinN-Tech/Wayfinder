// Ink washes for initial-only avatars, picked off the name so a given friend
// always lands on the same colour.
const AVATAR_INKS = ["#8f6518", "#3f6b4e", "#a8452f", "#6b4a7d", "#2f5d73", "#7a5a2e"];

export function friendInk(friend) {
  const seed = (friend.username || friend.display_name || "?").charCodeAt(0);
  return AVATAR_INKS[seed % AVATAR_INKS.length];
}

export function friendInitial(friend) {
  return (friend.display_name || friend.username || "?").trim().charAt(0).toUpperCase();
}
