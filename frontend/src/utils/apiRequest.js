import API_URL from "../config/api";

export function getAuthToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

function clearAuth() {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
  localStorage.removeItem("user");
  sessionStorage.removeItem("user");
}

export async function apiRequest(path, options = {}) {
  const token = getAuthToken();

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new Error("Can't reach the server. Check your connection and try again.");
  }
  if (res.status === 401) {
    clearAuth();
    window.location.href = "/";
    throw new Error("Session expired. Please log in again.");
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Something went wrong. Please try again later.");
  }

  return data;
}