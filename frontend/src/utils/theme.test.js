import { getStoredTheme, applyTheme, initTheme } from "./theme";

describe("theme utils", () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  describe("getStoredTheme", () => {
    it("returns 'light' when nothing is stored", () => {
      expect(getStoredTheme()).toBe("light");
    });

    it("returns the stored theme value", () => {
      localStorage.setItem("theme", "dark");
      expect(getStoredTheme()).toBe("dark");
    });
  });

  describe("applyTheme", () => {
    it("adds the 'dark' class to the document root for dark theme", () => {
      applyTheme("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("removes the 'dark' class for light theme", () => {
      document.documentElement.classList.add("dark");
      applyTheme("light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("persists the theme choice to localStorage", () => {
      applyTheme("dark");
      expect(localStorage.getItem("theme")).toBe("dark");

      applyTheme("light");
      expect(localStorage.getItem("theme")).toBe("light");
    });
  });

  describe("initTheme", () => {
    it("applies the previously stored theme on init", () => {
      localStorage.setItem("theme", "dark");
      initTheme();
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("defaults to light (no 'dark' class) when nothing was stored", () => {
      initTheme();
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });
});
