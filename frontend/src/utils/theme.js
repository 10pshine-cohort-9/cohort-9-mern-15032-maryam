const STORAGE_KEY = "theme";

export function getStoredTheme() {
  return localStorage.getItem(STORAGE_KEY) || "light";
}

export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  localStorage.setItem(STORAGE_KEY, theme);
}

export function initTheme() {
  applyTheme(getStoredTheme());
}
