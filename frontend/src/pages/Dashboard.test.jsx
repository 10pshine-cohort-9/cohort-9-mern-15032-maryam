import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Dashboard from "./Dashboard";
import { apiRequest, getAuthToken } from "../utils/apiRequest";

const mockNavigate = jest.fn();
let mockSearchParams = new URLSearchParams();
const mockSetSearchParams = jest.fn((next) => {
  mockSearchParams = new URLSearchParams(
    typeof next === "function" ? next(mockSearchParams) : next,
  );
});
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams, mockSetSearchParams],
}));

jest.mock("../utils/apiRequest", () => ({
  apiRequest: jest.fn(),
  getAuthToken: jest.fn(),
}));

jest.mock("../components/profile/ProfilePanel", () => (props) => (
  <div data-testid="profile-panel" data-open={props.open ? "true" : "false"} />
));

const defaultStats = { totalNotes: 3, favorites: 1, categories: 2, trashItems: 0 };
const defaultPagination = { page: 1, totalPages: 1, total: 1, limit: 8 };

function makeNote(overrides = {}) {
  return {
    _id: "note-1",
    title: "My First Note",
    content: "<p>Hello world</p>",
    category: "General",
    isFavorite: false,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function setupApi({ stats = defaultStats, notes = [], pagination = defaultPagination } = {}) {
  apiRequest.mockImplementation((path) => {
    if (path === "/notes/stats") {
      return Promise.resolve({ stats });
    }
    if (path.startsWith("/notes?")) {
      return Promise.resolve({ notes, pagination });
    }
    return Promise.resolve({ success: true });
  });
}

describe("Dashboard", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockSetSearchParams.mockClear();
    apiRequest.mockReset();
    getAuthToken.mockReset();
    getAuthToken.mockReturnValue("fake-token");
    mockSearchParams = new URLSearchParams();
    jest.useRealTimers();
  });

  describe("auth guard", () => {
    it("redirects to '/' when there is no auth token", async () => {
      getAuthToken.mockReturnValue(null);
      setupApi();
      render(<Dashboard />);
      expect(mockNavigate).toHaveBeenCalledWith("/");
      await waitFor(() => expect(apiRequest).toHaveBeenCalled());
    });
  });

  describe("initial load", () => {
    it("shows loading skeletons before data arrives", () => {
      apiRequest.mockReturnValue(new Promise(() => {}));
      render(<Dashboard />);
      expect(
        screen.getByRole("heading", { name: "Dashboard" }),
      ).toBeInTheDocument();
    });

    it("shows the stat cards once loaded", async () => {
      setupApi({ stats: defaultStats, notes: [] });
      render(<Dashboard />);

      expect(await screen.findByText("3")).toBeInTheDocument();
      expect(screen.getByText("Total Notes")).toBeInTheDocument();
      expect(screen.getByText("Favorites", { selector: "p" })).toBeInTheDocument();
    });

    it("renders notes once loaded", async () => {
      setupApi({ notes: [makeNote()] });
      render(<Dashboard />);

      expect(await screen.findByText("My First Note")).toBeInTheDocument();
      expect(screen.getByText("Hello world")).toBeInTheDocument();
    });

    it("shows an empty state when there are no notes", async () => {
      setupApi({ notes: [] });
      render(<Dashboard />);

      expect(await screen.findByText("No notes here yet.")).toBeInTheDocument();
      expect(screen.getByText("Create your first note")).toBeInTheDocument();
    });

    it("navigates to /notes/new from the empty state link", async () => {
      setupApi({ notes: [] });
      const user = userEvent.setup({ delay: null });
      render(<Dashboard />);

      await user.click(await screen.findByText("Create your first note"));

      expect(mockNavigate).toHaveBeenCalledWith("/notes/new");
    });

    it("shows an error message when loading notes fails", async () => {
      apiRequest.mockImplementation((path) => {
        if (path === "/notes/stats") return Promise.resolve({ stats: defaultStats });
        return Promise.reject(new Error("Failed to load notes"));
      });
      render(<Dashboard />);

      expect(
        await screen.findByText("Failed to load notes"),
      ).toBeInTheDocument();
    });

    it("logs an error and keeps default stats when the stats request fails", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      apiRequest.mockImplementation((path) => {
        if (path === "/notes/stats") return Promise.reject(new Error("stats down"));
        if (path.startsWith("/notes?"))
          return Promise.resolve({ notes: [], pagination: defaultPagination });
        return Promise.resolve({ success: true });
      });
      render(<Dashboard />);

      await screen.findByText("No notes here yet.");
      expect(screen.getAllByText("0").length).toBeGreaterThan(0);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("recovers from malformed user data in localStorage", async () => {
      localStorage.setItem("user", "{not-valid-json");
      setupApi({ notes: [] });
      render(<Dashboard />);

      expect(await screen.findByText("Account")).toBeInTheDocument();
      localStorage.clear();
    });
  });

  describe("note content preview", () => {
    it("shows a photo placeholder for image-only notes", async () => {
      setupApi({
        notes: [makeNote({ content: '<img src="x.png" />' })],
      });
      render(<Dashboard />);

      expect(await screen.findByText("Photo")).toBeInTheDocument();
    });

    it("shows 'No content yet' for empty notes", async () => {
      setupApi({ notes: [makeNote({ content: "" })] });
      render(<Dashboard />);

      expect(await screen.findByText("No content yet")).toBeInTheDocument();
    });
  });

  describe("relative timestamps", () => {
    function hoursAgo(h) {
      return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
    }
    function daysAgo(d) {
      return new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();
    }

    it("shows minutes and hours ago for recent notes", async () => {
      setupApi({ notes: [makeNote({ updatedAt: hoursAgo(2) })] });
      render(<Dashboard />);

      expect(await screen.findByText("2h ago")).toBeInTheDocument();
    });

    it("shows 'Yesterday' for a note updated one day ago", async () => {
      setupApi({ notes: [makeNote({ updatedAt: daysAgo(1) })] });
      render(<Dashboard />);

      expect(await screen.findByText("Yesterday")).toBeInTheDocument();
    });

    it("shows days ago for a note updated a few days ago", async () => {
      setupApi({ notes: [makeNote({ updatedAt: daysAgo(3) })] });
      render(<Dashboard />);

      expect(await screen.findByText("3d ago")).toBeInTheDocument();
    });

    it("shows weeks ago for a note updated a couple weeks ago", async () => {
      setupApi({ notes: [makeNote({ updatedAt: daysAgo(14) })] });
      render(<Dashboard />);

      expect(await screen.findByText("2w ago")).toBeInTheDocument();
    });

    it("shows months ago for a note updated a couple months ago", async () => {
      setupApi({ notes: [makeNote({ updatedAt: daysAgo(60) })] });
      render(<Dashboard />);

      expect(await screen.findByText("2mo ago")).toBeInTheDocument();
    });

    it("shows years ago for a note updated over a year ago", async () => {
      setupApi({ notes: [makeNote({ updatedAt: daysAgo(400) })] });
      render(<Dashboard />);

      expect(await screen.findByText("1y ago")).toBeInTheDocument();
    });
  });

  describe("search", () => {
    it("reloads notes with the search term after the debounce delay", async () => {
      jest.useFakeTimers();
      setupApi({ notes: [makeNote()] });
      const user = userEvent.setup({ delay: null, advanceTimers: jest.advanceTimersByTime });
      render(<Dashboard />);

      await act(async () => {
        await jest.advanceTimersByTimeAsync(0);
      });

      await user.type(
        screen.getByPlaceholderText("Search notes..."),
        "meeting",
      );
      apiRequest.mockClear();
      await act(async () => {
        await jest.advanceTimersByTimeAsync(400);
      });

      const notesCall = apiRequest.mock.calls.find(([path]) =>
        path.startsWith("/notes?"),
      );
      expect(notesCall[0]).toContain("search=meeting");
      jest.useRealTimers();
    });
  });

  describe("sort and view", () => {
    it("reloads notes when the sort order changes", async () => {
      setupApi({ notes: [makeNote()] });
      const user = userEvent.setup({ delay: null });
      render(<Dashboard />);

      await screen.findByText("My First Note");
      apiRequest.mockClear();

      await user.selectOptions(screen.getByRole("combobox"), "title_asc");

      await waitFor(() => {
        const notesCall = apiRequest.mock.calls.find(([path]) =>
          path.startsWith("/notes?"),
        );
        expect(notesCall[0]).toContain("sort=title_asc");
      });
    });

    it("switches between grid and list view", async () => {
      setupApi({ notes: [makeNote()] });
      const user = userEvent.setup({ delay: null });
      render(<Dashboard />);

      await screen.findByText("My First Note");
      const listButton = screen.getByLabelText("List view");
      const gridButton = screen.getByLabelText("Grid view");

      await user.click(listButton);
      expect(listButton).toHaveClass("bg-indigo-50");

      await user.click(gridButton);
      expect(gridButton).toHaveClass("bg-indigo-50");
    });
  });

  describe("favorite toggle", () => {
    it("optimistically toggles favorite and persists it", async () => {
      setupApi({ notes: [makeNote({ isFavorite: false })] });
      const user = userEvent.setup({ delay: null });
      render(<Dashboard />);

      await screen.findByText("My First Note");
      apiRequest.mockImplementationOnce((path) => {
        expect(path).toBe("/notes/note-1/favorite");
        return Promise.resolve({ success: true });
      });

      await user.click(screen.getByLabelText("Toggle favorite"));

      expect(
        screen.getByLabelText("Toggle favorite").querySelector("svg"),
      ).toHaveClass("fill-amber-400");
    });

    it("rolls back the favorite state and shows a notice on failure", async () => {
      setupApi({ notes: [makeNote({ isFavorite: false })] });
      const user = userEvent.setup({ delay: null });
      render(<Dashboard />);

      await screen.findByText("My First Note");
      apiRequest.mockImplementationOnce(() =>
        Promise.reject(new Error("Could not update favorite")),
      );

      await user.click(screen.getByLabelText("Toggle favorite"));

      expect(
        await screen.findByText("Could not update favorite"),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText("Toggle favorite").querySelector("svg"),
      ).not.toHaveClass("fill-amber-400");
    });
  });

  describe("note card interaction", () => {
    it("navigates to the note when clicked", async () => {
      setupApi({ notes: [makeNote()] });
      const user = userEvent.setup({ delay: null });
      render(<Dashboard />);

      await user.click(await screen.findByText("My First Note"));

      expect(mockNavigate).toHaveBeenCalledWith("/notes/note-1");
    });

    it("navigates when Enter is pressed on a focused note card", async () => {
      setupApi({ notes: [makeNote()] });
      render(<Dashboard />);

      const card = (await screen.findByText("My First Note")).closest(
        '[role="button"]',
      );
      card.focus();
      await userEvent.setup({ delay: null }).keyboard("{Enter}");

      expect(mockNavigate).toHaveBeenCalledWith("/notes/note-1");
    });
  });

  describe("note actions menu", () => {
    it("moves a note to trash from the menu", async () => {
      setupApi({ notes: [makeNote()] });
      const user = userEvent.setup({ delay: null });
      render(<Dashboard />);

      await screen.findByText("My First Note");
      await user.click(screen.getByLabelText("More options"));

      apiRequest.mockImplementationOnce((path) => {
        expect(path).toBe("/notes/note-1/trash");
        return Promise.resolve({ success: true });
      });
      await user.click(screen.getByRole("menuitem", { name: "Move to Trash" }));

      await waitFor(() =>
        expect(
          apiRequest.mock.calls.some(([p]) => p === "/notes/note-1/trash"),
        ).toBe(true),
      );
    });

    it("shows a notice when moving to trash fails", async () => {
      setupApi({ notes: [makeNote()] });
      const user = userEvent.setup({ delay: null });
      render(<Dashboard />);

      await screen.findByText("My First Note");
      await user.click(screen.getByLabelText("More options"));

      apiRequest.mockImplementationOnce(() =>
        Promise.reject(new Error("Could not move to trash")),
      );
      await user.click(screen.getByRole("menuitem", { name: "Move to Trash" }));

      expect(
        await screen.findByText("Could not move to trash"),
      ).toBeInTheDocument();
    });

    it("shows Restore and Delete Forever options in trash view", async () => {
      setupApi({ notes: [makeNote()] });
      const user = userEvent.setup({ delay: null });
      render(<Dashboard />);

      await user.click(screen.getByRole("button", { name: /^trash$/i }));
      await screen.findByText("My First Note");
      await user.click(screen.getByLabelText("More options"));

      expect(screen.getByRole("menuitem", { name: "Restore" })).toBeInTheDocument();
      expect(
        screen.getByRole("menuitem", { name: "Delete Forever" }),
      ).toBeInTheDocument();
    });

    it("restores a note from trash", async () => {
      setupApi({ notes: [makeNote()] });
      const user = userEvent.setup({ delay: null });
      render(<Dashboard />);

      await user.click(screen.getByRole("button", { name: /^trash$/i }));
      await screen.findByText("My First Note");
      await user.click(screen.getByLabelText("More options"));

      apiRequest.mockImplementationOnce((path) => {
        expect(path).toBe("/notes/note-1/restore");
        return Promise.resolve({ success: true });
      });
      await user.click(screen.getByRole("menuitem", { name: "Restore" }));

      await waitFor(() =>
        expect(
          apiRequest.mock.calls.some(([p]) => p === "/notes/note-1/restore"),
        ).toBe(true),
      );
    });

    it("shows a notice when restoring from trash fails", async () => {
      setupApi({ notes: [makeNote()] });
      const user = userEvent.setup({ delay: null });
      render(<Dashboard />);

      await user.click(screen.getByRole("button", { name: /^trash$/i }));
      await screen.findByText("My First Note");
      await user.click(screen.getByLabelText("More options"));

      apiRequest.mockImplementationOnce(() =>
        Promise.reject(new Error("Could not restore note")),
      );
      await user.click(screen.getByRole("menuitem", { name: "Restore" }));

      expect(
        await screen.findByText("Could not restore note"),
      ).toBeInTheDocument();
    });

    it("closes the options menu on Escape", async () => {
      setupApi({ notes: [makeNote()] });
      const user = userEvent.setup({ delay: null });
      render(<Dashboard />);

      await screen.findByText("My First Note");
      await user.click(screen.getByLabelText("More options"));
      expect(
        screen.getByRole("menuitem", { name: "Move to Trash" }),
      ).toBeInTheDocument();

      await user.keyboard("{Escape}");

      expect(
        screen.queryByRole("menuitem", { name: "Move to Trash" }),
      ).not.toBeInTheDocument();
    });

    it("opens the delete confirmation modal and deletes permanently", async () => {
      setupApi({ notes: [makeNote()] });
      const user = userEvent.setup({ delay: null });
      render(<Dashboard />);

      await user.click(screen.getByRole("button", { name: /^trash$/i }));
      await screen.findByText("My First Note");
      await user.click(screen.getByLabelText("More options"));
      await user.click(screen.getByRole("menuitem", { name: "Delete Forever" }));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(/permanently delete/)).toBeInTheDocument();

      apiRequest.mockImplementationOnce((path) => {
        expect(path).toBe("/notes/note-1");
        return Promise.resolve({ success: true });
      });
      await user.click(screen.getByRole("button", { name: "Delete Forever" }));

      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      expect(
        await screen.findByText("Note permanently deleted."),
      ).toBeInTheDocument();
    });

    it("shows a notice and keeps the modal open when deletion fails", async () => {
      setupApi({ notes: [makeNote()] });
      const user = userEvent.setup({ delay: null });
      render(<Dashboard />);

      await user.click(screen.getByRole("button", { name: /^trash$/i }));
      await screen.findByText("My First Note");
      await user.click(screen.getByLabelText("More options"));
      await user.click(screen.getByRole("menuitem", { name: "Delete Forever" }));

      apiRequest.mockImplementationOnce(() =>
        Promise.reject(new Error("Could not delete note")),
      );
      await user.click(screen.getByRole("button", { name: "Delete Forever" }));

      expect(
        await screen.findByText("Could not delete note"),
      ).toBeInTheDocument();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("closes the delete modal on Escape without deleting", async () => {
      setupApi({ notes: [makeNote()] });
      const user = userEvent.setup({ delay: null });
      render(<Dashboard />);

      await user.click(screen.getByRole("button", { name: /^trash$/i }));
      await screen.findByText("My First Note");
      await user.click(screen.getByLabelText("More options"));
      await user.click(screen.getByRole("menuitem", { name: "Delete Forever" }));

      await user.keyboard("{Escape}");

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("closes the delete modal via the Cancel button without deleting", async () => {
      setupApi({ notes: [makeNote()] });
      const user = userEvent.setup({ delay: null });
      render(<Dashboard />);

      await user.click(screen.getByRole("button", { name: /^trash$/i }));
      await screen.findByText("My First Note");
      await user.click(screen.getByLabelText("More options"));
      await user.click(screen.getByRole("menuitem", { name: "Delete Forever" }));

      apiRequest.mockClear();
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(
        apiRequest.mock.calls.some(([, opts]) => opts?.method === "DELETE"),
      ).toBe(false);
    });
  });

  describe("pagination", () => {
    it("disables the previous button on the first page", async () => {
      setupApi({
        notes: [makeNote()],
        pagination: { page: 1, totalPages: 3, total: 20, limit: 8 },
      });
      render(<Dashboard />);

      await screen.findByText("My First Note");
      const buttons = screen.getAllByRole("button");
      const prevButton = buttons.find((b) =>
        b.querySelector(".lucide-chevron-left"),
      );
      expect(prevButton).toBeDisabled();
    });

    it("loads the previous page when clicked from page 2", async () => {
      setupApi({
        notes: [makeNote()],
        pagination: { page: 2, totalPages: 3, total: 20, limit: 8 },
      });
      const user = userEvent.setup({ delay: null });
      render(<Dashboard />);

      await screen.findByText("My First Note");
      apiRequest.mockClear();

      const buttons = screen.getAllByRole("button");
      const prevButton = buttons.find((b) =>
        b.querySelector(".lucide-chevron-left"),
      );
      await user.click(prevButton);

      await waitFor(() => {
        const notesCall = apiRequest.mock.calls.find(([path]) =>
          path.startsWith("/notes?"),
        );
        expect(notesCall[0]).toContain("page=1");
      });
    });

    it("loads the next page when clicked", async () => {
      setupApi({
        notes: [makeNote()],
        pagination: { page: 1, totalPages: 3, total: 20, limit: 8 },
      });
      const user = userEvent.setup({ delay: null });
      render(<Dashboard />);

      await screen.findByText("My First Note");
      apiRequest.mockClear();

      const buttons = screen.getAllByRole("button");
      const nextButton = buttons.find((b) =>
        b.querySelector(".lucide-chevron-right"),
      );
      await user.click(nextButton);

      await waitFor(() => {
        const notesCall = apiRequest.mock.calls.find(([path]) =>
          path.startsWith("/notes?"),
        );
        expect(notesCall[0]).toContain("page=2");
      });
    });

    it("jumps to a specific page number when clicked", async () => {
      setupApi({
        notes: [makeNote()],
        pagination: { page: 1, totalPages: 3, total: 20, limit: 8 },
      });
      const user = userEvent.setup({ delay: null });
      render(<Dashboard />);

      await screen.findByText("My First Note");
      apiRequest.mockClear();

      await user.click(screen.getByRole("button", { name: "3" }));

      await waitFor(() => {
        const notesCall = apiRequest.mock.calls.find(([path]) =>
          path.startsWith("/notes?"),
        );
        expect(notesCall[0]).toContain("page=3");
      });
    });

    it("shows ellipsis dots when there are many pages", async () => {
      setupApi({
        notes: [makeNote()],
        pagination: { page: 6, totalPages: 10, total: 80, limit: 8 },
      });
      render(<Dashboard />);

      await screen.findByText("My First Note");
      expect(screen.getAllByText("…").length).toBeGreaterThan(0);
      expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "10" })).toBeInTheDocument();
    });

    it("shows the correct 'Showing X-Y of Z' summary", async () => {
      setupApi({
        notes: [makeNote()],
        pagination: { page: 1, totalPages: 2, total: 12, limit: 8 },
      });
      render(<Dashboard />);

      expect(
        await screen.findByText(/Showing 1–8 of 12 notes/),
      ).toBeInTheDocument();
    });

    it("re-fetches the last valid page after deleting the only note on the last page", async () => {
      let notesCallCount = 0;
      apiRequest.mockImplementation((path, opts) => {
        if (path === "/notes/stats") return Promise.resolve({ stats: defaultStats });
        if (path.startsWith("/notes?")) {
          notesCallCount += 1;
          if (notesCallCount === 1) {
            return Promise.resolve({
              notes: [makeNote()],
              pagination: { page: 2, totalPages: 2, total: 9, limit: 8 },
            });
          }
          if (notesCallCount === 2) {
            return Promise.resolve({
              notes: [],
              pagination: { page: 2, totalPages: 1, total: 8, limit: 8 },
            });
          }
          return Promise.resolve({
            notes: [makeNote()],
            pagination: { page: 1, totalPages: 1, total: 8, limit: 8 },
          });
        }
        if (path.endsWith("/trash") && opts?.method === "PATCH") {
          return Promise.resolve({ success: true });
        }
        return Promise.resolve({ success: true });
      });

      const user = userEvent.setup({ delay: null });
      render(<Dashboard />);

      await screen.findByText("My First Note");
      await user.click(screen.getByLabelText("More options"));
      await user.click(screen.getByRole("menuitem", { name: "Move to Trash" }));

      await waitFor(() => expect(notesCallCount).toBeGreaterThanOrEqual(3));
    });
  });

  describe("sidebar navigation", () => {
    it("navigates to /categories", async () => {
      setupApi({ notes: [] });
      const user = userEvent.setup({ delay: null });
      render(<Dashboard />);

      await user.click(screen.getByRole("button", { name: /categories/i }));

      expect(mockNavigate).toHaveBeenCalledWith("/categories");
    });

    it("shows a 'coming soon' notice for Tags", async () => {
      setupApi({ notes: [] });
      const user = userEvent.setup({ delay: null });
      render(<Dashboard />);

      await user.click(screen.getByRole("button", { name: /tags/i }));

      expect(
        await screen.findByText("Tags view is coming soon."),
      ).toBeInTheDocument();
    });

    it("switches heading when clicking 'All Notes'", async () => {
      setupApi({ notes: [] });
      const user = userEvent.setup({ delay: null });
      render(<Dashboard />);

      await user.click(screen.getByRole("button", { name: "All Notes" }));

      expect(
        await screen.findByRole("heading", { level: 1, name: "All Notes" }),
      ).toBeInTheDocument();
    });

    it("switches heading when clicking 'Favorites'", async () => {
      setupApi({ notes: [] });
      const user = userEvent.setup({ delay: null });
      render(<Dashboard />);

      await user.click(screen.getByRole("button", { name: "Favorites" }));

      expect(
        await screen.findByRole("heading", { level: 1, name: "Favorites" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Notes you've starred for quick access."),
      ).toBeInTheDocument();
    });

    it("navigates to /settings from the sidebar", async () => {
      setupApi({ notes: [] });
      const user = userEvent.setup({ delay: null });
      render(<Dashboard />);

      await user.click(screen.getByRole("button", { name: /^settings$/i }));

      expect(mockNavigate).toHaveBeenCalledWith("/settings");
    });

    it("opens the profile panel from the sidebar Profile button", async () => {
      setupApi({ notes: [] });
      const user = userEvent.setup({ delay: null });
      render(<Dashboard />);

      await user.click(screen.getByRole("button", { name: /^profile$/i }));

      expect(screen.getByTestId("profile-panel")).toHaveAttribute(
        "data-open",
        "true",
      );
    });

    it("shows a notice when clicking 'Enable Backup'", async () => {
      setupApi({ notes: [] });
      const user = userEvent.setup({ delay: null });
      render(<Dashboard />);

      await user.click(screen.getByRole("button", { name: /enable backup/i }));

      expect(
        await screen.findByText("Cloud backup isn't implemented yet."),
      ).toBeInTheDocument();
    });

    it("navigates to /notes/new from the header button", async () => {
      setupApi({ notes: [] });
      const user = userEvent.setup({ delay: null });
      render(<Dashboard />);

      await user.click(screen.getByRole("button", { name: /new note/i }));

      expect(mockNavigate).toHaveBeenCalledWith("/notes/new");
    });
  });

  describe("category filter mode", () => {
    it("shows the category name as the heading", async () => {
      mockSearchParams = new URLSearchParams({ category: "Work" });
      setupApi({ notes: [makeNote({ category: "Work" })] });
      render(<Dashboard />);

      expect(
        await screen.findByRole("heading", { level: 1, name: "Work" }),
      ).toBeInTheDocument();
      expect(screen.getByText('Notes in "Work".')).toBeInTheDocument();
    });
  });

  describe("profile panel", () => {
    it("opens when clicking the account button", async () => {
      setupApi({ notes: [] });
      const user = userEvent.setup({ delay: null });
      render(<Dashboard />);

      await user.click(screen.getByRole("button", { name: /account/i }));

      expect(screen.getByTestId("profile-panel")).toHaveAttribute(
        "data-open",
        "true",
      );
    });
  });

  describe("notices", () => {
    it("shows and dismisses the notifications notice", async () => {
      setupApi({ notes: [] });
      const user = userEvent.setup({ delay: null });
      render(<Dashboard />);

      await user.click(screen.getByLabelText("Notifications"));
      expect(
        await screen.findByText("No new notifications."),
      ).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /dismiss/i }));
      expect(
        screen.queryByText("No new notifications."),
      ).not.toBeInTheDocument();
    });
  });
});