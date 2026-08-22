import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Categories from "./Categories";
import { apiRequest } from "../utils/apiRequest";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock("../components/profile/ProfilePanel", () => (props) => (
  <div data-testid="profile-panel" data-open={props.open ? "true" : "false"}>
    {props.open && (
      <>
        <button onClick={props.onClose}>Close profile</button>
        <button
          onClick={() => props.onUpdate?.({ name: "Maryam", avatar: "" })}
        >
          Update profile
        </button>
      </>
    )}
  </div>
));

jest.mock("../utils/apiRequest", () => ({
  apiRequest: jest.fn(),
  getAuthToken: jest.fn(),
}));

const { getAuthToken } = require("../utils/apiRequest");

describe("Categories", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mockNavigate.mockClear();
    apiRequest.mockReset();
    getAuthToken.mockReset();
    getAuthToken.mockReturnValue("fake-token");
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("auth guard", () => {
    it("redirects to '/' when there is no auth token", async () => {
      getAuthToken.mockReturnValue(null);
      apiRequest.mockResolvedValue({ categories: [] });

      render(<Categories />);

      expect(mockNavigate).toHaveBeenCalledWith("/");
      await screen.findByText(
        "No categories yet — categories appear here once you add notes.",
      );
    });
  });

  describe("loading and data states", () => {
    it("shows a loading skeleton while categories are being fetched", () => {
      apiRequest.mockReturnValue(new Promise(() => {}));

      render(<Categories />);

      expect(
        screen.getByRole("heading", { name: "Categories" }),
      ).toBeInTheDocument();
    });

    it("shows an empty state when there are no categories", async () => {
      apiRequest.mockResolvedValue({ categories: [] });

      render(<Categories />);

      expect(
        await screen.findByText(
          "No categories yet — categories appear here once you add notes.",
        ),
      ).toBeInTheDocument();
    });

    it("shows an error message when the request fails", async () => {
      apiRequest.mockRejectedValue(new Error("Network error"));

      render(<Categories />);

      expect(await screen.findByText("Network error")).toBeInTheDocument();
    });

    it("renders the category cards once loaded", async () => {
      apiRequest.mockResolvedValue({
        categories: [
          { name: "Work", count: 5 },
          { name: "Personal", count: 2 },
        ],
      });

      render(<Categories />);

      expect(await screen.findByText("Work")).toBeInTheDocument();
      expect(screen.getByText("5 notes")).toBeInTheDocument();
      expect(screen.getByText("Personal")).toBeInTheDocument();
      expect(screen.getByText("2 notes")).toBeInTheDocument();
    });

    it("uses singular 'note' when the count is 1", async () => {
      apiRequest.mockResolvedValue({
        categories: [{ name: "Ideas", count: 1 }],
      });

      render(<Categories />);

      expect(await screen.findByText("1 note")).toBeInTheDocument();
    });
  });

  describe("search filter", () => {
    beforeEach(() => {
      apiRequest.mockResolvedValue({
        categories: [
          { name: "Work", count: 5 },
          { name: "Personal", count: 2 },
        ],
      });
    });

    it("filters categories by search text", async () => {
      const user = userEvent.setup({ delay: null });
      render(<Categories />);

      await screen.findByText("Work");

      await user.type(
        screen.getByPlaceholderText("Search categories..."),
        "pers",
      );

      expect(screen.queryByText("Work")).not.toBeInTheDocument();
      expect(screen.getByText("Personal")).toBeInTheDocument();
    });

    it("shows a no-match message when the search has no results", async () => {
      const user = userEvent.setup({ delay: null });
      render(<Categories />);

      await screen.findByText("Work");

      await user.type(
        screen.getByPlaceholderText("Search categories..."),
        "zzz",
      );

      expect(
        await screen.findByText('No categories match "zzz".'),
      ).toBeInTheDocument();
    });
  });

  describe("navigation", () => {
    it("navigates to the dashboard filtered by category when a card is clicked", async () => {
      apiRequest.mockResolvedValue({
        categories: [{ name: "Work", count: 5 }],
      });
      const user = userEvent.setup({ delay: null });
      render(<Categories />);

      await user.click(await screen.findByText("Work"));

      expect(mockNavigate).toHaveBeenCalledWith("/dashboard?category=Work");
    });

    it("navigates to /notes/new when clicking 'New Note'", async () => {
      apiRequest.mockResolvedValue({ categories: [] });
      const user = userEvent.setup({ delay: null });
      render(<Categories />);

      await user.click(screen.getByRole("button", { name: /new note/i }));

      expect(mockNavigate).toHaveBeenCalledWith("/notes/new");
    });

    it("navigates to /notes/new from the empty state link", async () => {
      apiRequest.mockResolvedValue({ categories: [] });
      const user = userEvent.setup({ delay: null });
      render(<Categories />);

      await user.click(await screen.findByText("Create your first note"));

      expect(mockNavigate).toHaveBeenCalledWith("/notes/new");
    });
  });

  describe("sidebar notices", () => {
    beforeEach(() => {
      apiRequest.mockResolvedValue({ categories: [] });
    });

    it("shows a 'coming soon' notice for Tags", async () => {
      const user = userEvent.setup({ delay: null });
      render(<Categories />);

      await user.click(screen.getByRole("button", { name: /tags/i }));

      expect(
        await screen.findByText("Tags view is coming soon."),
      ).toBeInTheDocument();
    });

    it("shows a notice when clicking 'Enable Backup'", async () => {
      const user = userEvent.setup({ delay: null });
      render(<Categories />);

      await user.click(screen.getByRole("button", { name: /enable backup/i }));

      expect(
        await screen.findByText("Cloud backup isn't implemented yet."),
      ).toBeInTheDocument();
    });

    it("loads user from localStorage and renders avatar", async () => {
      localStorage.setItem(
        "user",
        JSON.stringify({
          name: "Maryam",
          avatar: "https://example.com/avatar.png",
        }),
      );
      apiRequest.mockResolvedValue({ categories: [] });
      render(<Categories />);
      await screen.findByText("Maryam");
      expect(screen.getByAltText("")).toHaveAttribute(
        "src",
        "https://example.com/avatar.png",
      );
    });

    it("falls back safely when stored user JSON is invalid", async () => {
      localStorage.setItem("user", "{invalid-json");
      apiRequest.mockResolvedValue({ categories: [] });
      render(<Categories />);
      expect(await screen.findByText("Account")).toBeInTheDocument();
    });

    it("loads user from sessionStorage when localStorage is empty", async () => {
      sessionStorage.setItem("user", JSON.stringify({ name: "Maryam" }));
      apiRequest.mockResolvedValue({ categories: [] });
      render(<Categories />);
      expect(await screen.findByText("Maryam")).toBeInTheDocument();
    });

    it("renders user initials when avatar is unavailable", async () => {
      localStorage.setItem("user", JSON.stringify({ name: "Maryam" }));
      apiRequest.mockResolvedValue({ categories: [] });
      render(<Categories />);
      expect(await screen.findByText("M")).toBeInTheDocument();
    });

    it("navigates through all sidebar routes", async () => {
      const user = userEvent.setup();
      apiRequest.mockResolvedValue({ categories: [] });
      render(<Categories />);
      await screen.findByText(
        "No categories yet — categories appear here once you add notes.",
      );

      await user.click(screen.getByRole("button", { name: "Dashboard" }));
      await user.click(screen.getByRole("button", { name: "All Notes" }));
      await user.click(screen.getByRole("button", { name: "Favorites" }));
      await user.click(screen.getByRole("button", { name: "Trash" }));
      await user.click(screen.getByRole("button", { name: "Categories" }));
      await user.click(screen.getByRole("button", { name: "Settings" }));

      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard?filter=all");
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard?filter=favorites");
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard?filter=trash");
      expect(mockNavigate).toHaveBeenCalledWith("/categories");
      expect(mockNavigate).toHaveBeenCalledWith("/settings");
    });

    it("toggles the sidebar", async () => {
      const user = userEvent.setup();
      apiRequest.mockResolvedValue({ categories: [] });
      render(<Categories />);
      const sidebar = document.querySelector("aside");
      const toggle = screen.getByRole("button", { name: "Toggle sidebar" });
      expect(sidebar.className).toContain("w-64");
      await user.click(toggle);
      expect(sidebar.className).toContain("w-0");
      await user.click(toggle);
      expect(sidebar.className).toContain("w-64");
    });

    it("opens and closes profile panel from sidebar", async () => {
      const user = userEvent.setup();
      apiRequest.mockResolvedValue({ categories: [] });
      render(<Categories />);
      const panel = screen.getByTestId("profile-panel");
      expect(panel).toHaveAttribute("data-open", "false");
      await user.click(screen.getByRole("button", { name: "Profile" }));
      expect(panel).toHaveAttribute("data-open", "true");
      await user.click(screen.getByRole("button", { name: "Close profile" }));
      expect(panel).toHaveAttribute("data-open", "false");
    });

    it("opens profile panel from account button and updates user", async () => {
      const user = userEvent.setup();
      apiRequest.mockResolvedValue({ categories: [] });
      render(<Categories />);
      await user.click(screen.getByText("Account"));
      expect(screen.getByTestId("profile-panel")).toHaveAttribute(
        "data-open",
        "true",
      );
      await user.click(screen.getByRole("button", { name: "Update profile" }));
      expect(screen.getByText("Maryam")).toBeInTheDocument();
    });

    it("shows and dismisses notification notice", async () => {
      const user = userEvent.setup();
      apiRequest.mockResolvedValue({ categories: [] });
      render(<Categories />);
      await user.click(screen.getByRole("button", { name: "Notifications" }));
      expect(
        await screen.findByText("No new notifications."),
      ).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Dismiss" }));
      expect(
        screen.queryByText("No new notifications."),
      ).not.toBeInTheDocument();
    });

    it("automatically clears a notice after three seconds", async () => {
      jest.useFakeTimers();
      apiRequest.mockResolvedValue({ categories: [] });
      render(<Categories />);
      await act(async () => {
        screen.getByRole("button", { name: "Notifications" }).click();
      });
      expect(screen.getByText("No new notifications.")).toBeInTheDocument();
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });
      expect(
        screen.queryByText("No new notifications."),
      ).not.toBeInTheDocument();
      jest.useRealTimers();
    });

    it("keeps the latest notice when an older notice timeout fires", async () => {
      jest.useFakeTimers();
      apiRequest.mockResolvedValue({ categories: [] });
      render(<Categories />);

      await act(async () => {
        screen
          .getByRole("button", {
            name: "Tags",
          })
          .click();
      });

      expect(screen.getByText("Tags view is coming soon.")).toBeInTheDocument();

      await act(async () => {
        jest.advanceTimersByTime(2999);
      });

      await act(async () => {
        screen
          .getByRole("button", {
            name: /enable backup/i,
          })
          .click();
      });

      expect(
        screen.getByText("Cloud backup isn't implemented yet."),
      ).toBeInTheDocument();

      await act(async () => {
        jest.advanceTimersByTime(1);
      });

      expect(
        screen.getByText("Cloud backup isn't implemented yet."),
      ).toBeInTheDocument();

      jest.useRealTimers();
    });

    it("encodes category names when navigating", async () => {
      const user = userEvent.setup();
      apiRequest.mockResolvedValue({
        categories: [{ name: "Work & Personal", count: 3 }],
      });
      render(<Categories />);
      await user.click(await screen.findByText("Work & Personal"));
      expect(mockNavigate).toHaveBeenCalledWith(
        "/dashboard?category=Work%20%26%20Personal",
      );
    });
  });
});
