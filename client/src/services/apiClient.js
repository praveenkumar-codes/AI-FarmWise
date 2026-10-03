const DEFAULT_BASE_URL =
  typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL
    : 'http://localhost:8000/api/v1';

export async function apiRequest(path, options = {}) {
  const url = `${DEFAULT_BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.detail || data.message || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return data;
}

export default { apiRequest };
