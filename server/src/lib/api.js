const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Auth0's token getter lives behind a hook, so App registers it here on
// render and these plain functions stay callable from anywhere.
let getAccessToken = null;

export function setTokenGetter(fn) {
  getAccessToken = fn;
}

async function authHeaders() {
  if (!getAccessToken) return {};
  try {
    return { Authorization: `Bearer ${await getAccessToken()}` };
  } catch {
    // No usable session (not signed in, expired, etc.) - send the request
    // without a token rather than failing the whole call here. The backend
    // is what actually decides whether that's acceptable (401 if it isn't).
    return {};
  }
}

async function parseOrThrow(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }
  return data;
}

export async function analyzeItem(imageBlob) {
  const formData = new FormData();
  formData.append("image", imageBlob, "capture.jpg");

  const response = await fetch(`${API_BASE_URL}/api/items/analyze`, {
    method: "POST",
    headers: await authHeaders(),
    body: formData,
  });
  const data = await parseOrThrow(response);
  return data.suggestions;
}

// Resolves to { item, unlocked } - `unlocked` is any achievements newly
// earned by saving this item, ready to drive a toast/celebration in the UI.
export async function createItem(fields, imageBlob) {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key, value);
    }
  });
  formData.append("image", imageBlob, "capture.jpg");

  const response = await fetch(`${API_BASE_URL}/api/items`, {
    method: "POST",
    headers: await authHeaders(),
    body: formData,
  });
  return parseOrThrow(response);
}

export async function getItems() {
  const response = await fetch(`${API_BASE_URL}/api/items`, {
    headers: await authHeaders(),
  });
  return parseOrThrow(response);
}

export async function getItem(id) {
  const response = await fetch(`${API_BASE_URL}/api/items/${id}`, {
    headers: await authHeaders(),
  });
  return parseOrThrow(response);
}

export async function deleteItem(id) {
  const response = await fetch(`${API_BASE_URL}/api/items/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  return parseOrThrow(response);
}

export async function getAchievements() {
  const response = await fetch(`${API_BASE_URL}/api/achievements`, {
    headers: await authHeaders(),
  });
  return parseOrThrow(response);
}

export async function setFavorite(itemId, favorite) {
  const formData = new FormData();
  formData.append("is_favorite", favorite ? "1" : "0");

  const response = await fetch(`${API_BASE_URL}/api/items/${itemId}`, {
    method: "PUT",
    headers: await authHeaders(),
    body: formData,
  });
  return parseOrThrow(response);
}

export async function getMe() {
  const response = await fetch(`${API_BASE_URL}/api/me`, {
    headers: await authHeaders(),
  });
  return parseOrThrow(response);
}

// Best-effort sync of display_name/avatar_url from the Auth0 profile - safe
// to call on every login, never touches the username the user picks below.
export async function syncMyProfile({ displayName, avatarUrl }) {
  const formData = new FormData();
  if (displayName) formData.append("display_name", displayName);
  if (avatarUrl) formData.append("avatar_url", avatarUrl);

  const response = await fetch(`${API_BASE_URL}/api/me/profile`, {
    method: "PUT",
    headers: await authHeaders(),
    body: formData,
  });
  return parseOrThrow(response);
}

export async function uploadAvatar(imageFile) {
  const formData = new FormData();
  formData.append("image", imageFile);

  const response = await fetch(`${API_BASE_URL}/api/me/avatar`, {
    method: "POST",
    headers: await authHeaders(),
    body: formData,
  });
  return parseOrThrow(response);
}

// avatar_url is either a full URL (from Auth0's own profile picture,
// synced on login) or a bare filename this app stored (from an upload) -
// only the latter needs the images route prefixed on.
export function avatarSrc(avatarUrl) {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith("http")) return avatarUrl;
  return `${API_BASE_URL}/api/images/${avatarUrl}`;
}

export async function setMyUsername(username) {
  const formData = new FormData();
  formData.append("username", username);

  const response = await fetch(`${API_BASE_URL}/api/me/username`, {
    method: "PUT",
    headers: await authHeaders(),
    body: formData,
  });
  return parseOrThrow(response);
}

export async function searchUsers(query) {
  const response = await fetch(`${API_BASE_URL}/api/users/search?q=${encodeURIComponent(query)}`, {
    headers: await authHeaders(),
  });
  return parseOrThrow(response);
}

export async function getFriends() {
  const response = await fetch(`${API_BASE_URL}/api/friends`, {
    headers: await authHeaders(),
  });
  return parseOrThrow(response);
}

export async function sendFriendRequest(userId) {
  const response = await fetch(`${API_BASE_URL}/api/friends/${userId}`, {
    method: "POST",
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }
}

export async function acceptFriendRequest(userId) {
  const response = await fetch(`${API_BASE_URL}/api/friends/${userId}/accept`, {
    method: "POST",
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }
}

export async function removeFriend(userId) {
  const response = await fetch(`${API_BASE_URL}/api/friends/${userId}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
}

export async function getFriendProfile(userId) {
  const response = await fetch(`${API_BASE_URL}/api/users/${userId}/profile`, {
    headers: await authHeaders(),
  });
  return parseOrThrow(response);
}

// Unauthenticated on the server - it's static reference data.
export async function getCategories() {
  const response = await fetch(`${API_BASE_URL}/api/categories`);
  return parseOrThrow(response);
}

// The images route checks ownership, so it needs the bearer token like any
// other API call - a plain <img src> can't attach that header, which is why
// callers fetch the bytes here and hand the component an object URL instead.
export async function fetchImageBlob(imagePath) {
  const response = await fetch(`${API_BASE_URL}/api/images/${imagePath}`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.blob();
}
