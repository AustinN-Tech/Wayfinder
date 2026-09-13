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
