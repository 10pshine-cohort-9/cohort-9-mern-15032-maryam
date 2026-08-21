import { apiRequest, getAuthToken } from "./apiRequest";

function mockFetchOnce(status, body) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

describe("apiRequest", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    delete window.location;
    window.location = { ...originalLocation, href: "" };
  });

  afterAll(() => {
    window.location = originalLocation;
  });

  describe("getAuthToken", () => {
    it("returns the token from localStorage when present", () => {
      localStorage.setItem("token", "local-token");
      expect(getAuthToken()).toBe("local-token");
    });

    it("returns the token from sessionStorage when localStorage is empty", () => {
      sessionStorage.setItem("token", "session-token");
      expect(getAuthToken()).toBe("session-token");
    });

    it("returns null when no token is stored anywhere", () => {
      expect(getAuthToken()).toBeNull();
    });
  });

  describe("successful requests", () => {
    it("returns the parsed JSON body on success", async () => {
      mockFetchOnce(200, { success: true, notes: [] });

      const result = await apiRequest("/notes");

      expect(result).toEqual({ success: true, notes: [] });
    });

    it("attaches the Authorization header when a token exists", async () => {
      localStorage.setItem("token", "my-token");
      mockFetchOnce(200, { success: true });

      await apiRequest("/notes");

      const [, options] = global.fetch.mock.calls[0];
      expect(options.headers.Authorization).toBe("Bearer my-token");
    });

    it("does not attach an Authorization header when no token exists", async () => {
      mockFetchOnce(200, { success: true });

      await apiRequest("/notes");

      const [, options] = global.fetch.mock.calls[0];
      expect(options.headers.Authorization).toBeUndefined();
    });
  });

  describe("error handling", () => {
    it("throws the server's error message on a non-ok response", async () => {
      mockFetchOnce(400, { message: "Title is required." });

      await expect(apiRequest("/notes")).rejects.toThrow(
        "Title is required.",
      );
    });

    it("throws a generic message when the server gives no message", async () => {
      mockFetchOnce(500, {});

      await expect(apiRequest("/notes")).rejects.toThrow(
        "Something went wrong. Please try again later.",
      );
    });

    it("throws a network error message when fetch itself fails", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("network down"));

      await expect(apiRequest("/notes")).rejects.toThrow(
        "Can't reach the server. Check your connection and try again.",
      );
    });
  });

  describe("401 handling", () => {
    it("clears stored auth and redirects to the login page", async () => {
      localStorage.setItem("token", "expired-token");
      localStorage.setItem("user", JSON.stringify({ name: "Ali" }));
      mockFetchOnce(401, { message: "Invalid token" });

      await expect(apiRequest("/notes")).rejects.toThrow(
        "Session expired. Please log in again.",
      );

      expect(localStorage.getItem("token")).toBeNull();
      expect(localStorage.getItem("user")).toBeNull();
      expect(window.location.href).toBe("/");
    });
  });
});
