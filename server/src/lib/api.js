const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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
    body: formData,
  });
  return parseOrThrow(response);
}

export async function getCategories() {
  const response = await fetch(`${API_BASE_URL}/api/categories`);
  return parseOrThrow(response);
}

export async function getAchievements() {
  const response = await fetch(`${API_BASE_URL}/api/achievements`);
  return parseOrThrow(response);
}

export function imageUrl(imagePath) {
  return `${API_BASE_URL}/api/images/${imagePath}`;
}
