// Stand-in friends until the friends API is wired up. Shape matches what the
// backend already returns for a user (display_name, username, avatar_url), so
// swapping this for a real fetch means changing the source, not FriendsRow.
export const FAKE_FRIENDS = [
  { id: 1, display_name: "Maya Okonkwo", username: "maya", avatar_url: null },
  { id: 2, display_name: "Theo Lindqvist", username: "theo", avatar_url: null },
  { id: 3, display_name: "Priya Raman", username: "priya", avatar_url: null },
  { id: 4, display_name: "Sam Whitfield", username: "sam", avatar_url: null },
  { id: 5, display_name: "Nina Alvarez", username: "nina", avatar_url: null },
  { id: 6, display_name: "Jonas Berg", username: "jonas", avatar_url: null },
  { id: 7, display_name: "Ada Chen", username: "ada", avatar_url: null },
];

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
