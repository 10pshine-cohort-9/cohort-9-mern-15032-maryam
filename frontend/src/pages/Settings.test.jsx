import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Settings from "./Settings";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock("../components/profile/ProfilePanel", () => (props) => (
  <div data-testid="profile-panel" data-open={props.open ? "true" : "false"} />
));

describe("Settings", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mockNavigate.mockClear();
  });

  describe("auth guard", () => {
    it("redirects to '/' when there is no auth token", () => {
      render(<Settings />);
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    it("renders normally when an auth token exists", () => {
      localStorage.setItem("token", "fake-token");
      render(<Settings />);

      expect(mockNavigate).not.toHaveBeenCalledWith("/");
      expect(
        screen.getByRole("heading", { name: "Settings" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Dark Mode")).toBeInTheDocument();
    });
  });

  describe("sidebar navigation", () => {
    beforeEach(() => {
      localStorage.setItem("token", "fake-token");
    });

    it("navigates to /dashboard when clicking Dashboard", async () => {
      const user = userEvent.setup({ delay: null });
      render(<Settings />);

      await user.click(screen.getByRole("button", { name: /dashboard/i }));

      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });

    it("navigates to /categories when clicking Categories", async () => {
      const user = userEvent.setup({ delay: null });
      render(<Settings />);

      await user.click(screen.getByRole("button", { name: /categories/i }));

      expect(mockNavigate).toHaveBeenCalledWith("/categories");
    });

    it("shows a 'coming soon' notice for Tags instead of navigating", async () => {
      const user = userEvent.setup({ delay: null });
      render(<Settings />);

      await user.click(screen.getByRole("button", { name: /tags/i }));

      expect(
        await screen.findByText("Tags view is coming soon."),
      ).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalledWith(null);
    });
  });

  describe("notices", () => {
    beforeEach(() => {
      localStorage.setItem("token", "fake-token");
    });

    it("shows a notice when clicking 'Enable Backup'", async () => {
      const user = userEvent.setup({ delay: null });
      render(<Settings />);

      await user.click(screen.getByRole("button", { name: /enable backup/i }));

      expect(
        await screen.findByText("Cloud backup isn't implemented yet."),
      ).toBeInTheDocument();
    });

    it("shows a notice when clicking the notifications bell", async () => {
      const user = userEvent.setup({ delay: null });
      render(<Settings />);

      await user.click(screen.getByRole("button", { name: /notifications/i }));

      expect(
        await screen.findByText("No new notifications."),
      ).toBeInTheDocument();
    });

    it("dismisses the notice when clicking 'Dismiss'", async () => {
      const user = userEvent.setup({ delay: null });
      render(<Settings />);

      await user.click(screen.getByRole("button", { name: /notifications/i }));
      expect(await screen.findByText("No new notifications.")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /dismiss/i }));

      expect(screen.queryByText("No new notifications.")).not.toBeInTheDocument();
    });
  });

  describe("dark mode toggle", () => {
    beforeEach(() => {
      localStorage.setItem("token", "fake-token");
    });

    it("starts off (light) when nothing is stored", () => {
      render(<Settings />);
      const toggle = screen.getByRole("switch", { name: /toggle dark mode/i });
      expect(toggle).toHaveAttribute("aria-checked", "false");
    });

    it("turns on dark mode and persists it", async () => {
      const user = userEvent.setup({ delay: null });
      render(<Settings />);

      const toggle = screen.getByRole("switch", { name: /toggle dark mode/i });
      await user.click(toggle);

      expect(toggle).toHaveAttribute("aria-checked", "true");
      expect(screen.getByText("Currently on")).toBeInTheDocument();
      expect(localStorage.getItem("theme")).toBe("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("turns dark mode back off on a second click", async () => {
      const user = userEvent.setup({ delay: null });
      render(<Settings />);

      const toggle = screen.getByRole("switch", { name: /toggle dark mode/i });
      await user.click(toggle);
      await user.click(toggle);

      expect(toggle).toHaveAttribute("aria-checked", "false");
      expect(localStorage.getItem("theme")).toBe("light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });

  describe("profile panel", () => {
    beforeEach(() => {
      localStorage.setItem("token", "fake-token");
    });

    it("is closed by default", () => {
      render(<Settings />);
      expect(screen.getByTestId("profile-panel")).toHaveAttribute(
        "data-open",
        "false",
      );
    });

    it("opens when clicking the account button in the header", async () => {
      const user = userEvent.setup({ delay: null });
      render(<Settings />);

      await user.click(screen.getByRole("button", { name: /account/i }));

      expect(screen.getByTestId("profile-panel")).toHaveAttribute(
        "data-open",
        "true",
      );
    });

    it("opens when clicking Profile in the sidebar", async () => {
      const user = userEvent.setup({ delay: null });
      render(<Settings />);

      await user.click(screen.getByRole("button", { name: /^profile$/i }));

      expect(screen.getByTestId("profile-panel")).toHaveAttribute(
        "data-open",
        "true",
      );
    });
  });

  describe("search bar", () => {
    beforeEach(() => {
      localStorage.setItem("token", "fake-token");
    });

    it("navigates to /dashboard when the search input is focused", async () => {
      const user = userEvent.setup({ delay: null });
      render(<Settings />);

      await user.click(screen.getByPlaceholderText("Search notes..."));

      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
  });
});
