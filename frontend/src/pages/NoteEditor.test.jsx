import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NoteEditor from "./NoteEditor";
import { apiRequest } from "../utils/apiRequest";

const mockNavigate = jest.fn();
let mockParams = {};
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
}));

jest.mock("../utils/apiRequest", () => ({
  apiRequest: jest.fn(),
}));

jest.mock("../components/profile/ProfilePanel", () => (props) => (
  <div data-testid="profile-panel" data-open={props.open ? "true" : "false"} />
));

jest.mock("../components/editor/RichTextEditor", () => {
  const React = require("react");
  return React.forwardRef(function MockRichTextEditor(
    { initialContent, onUpdate },
    ref,
  ) {
    const [value, setValue] = React.useState(initialContent || "");
    React.useImperativeHandle(ref, () => ({
      setContent: (html) => setValue(html || ""),
      getHTML: () => value,
      getText: () => value,
      focus: () => {},
    }));
    return (
      <textarea
        data-testid="rich-text-editor"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          setValue(v);
          onUpdate?.(v, v);
        }}
      />
    );
  });
});

function getTitleInput() {
  return screen.getByPlaceholderText("Untitled note");
}

const existingNote = {
  _id: "note-1",
  title: "My Existing Note",
  category: "Work",
  content: "Some saved content",
  updatedAt: "2024-03-10T12:00:00.000Z",
};

describe("NoteEditor", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    apiRequest.mockReset();
    mockParams = {};
    jest.useRealTimers();
  });

  describe("new note mode", () => {
    beforeEach(() => {
      mockParams = {};
    });

    it("shows 'New Note' and starts with an empty title", () => {
      render(<NoteEditor />);
      expect(
        screen.getByRole("heading", { name: "New Note" }),
      ).toBeInTheDocument();
      expect(getTitleInput()).toHaveValue("");
      expect(screen.getByText("Not saved yet")).toBeInTheDocument();
    });

    it("shows the default status message before any edits", () => {
      render(<NoteEditor />);
      expect(screen.getByText("Start writing to save")).toBeInTheDocument();
    });

    it("marks the note as unsaved as soon as the title is edited", async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteEditor />);

      await user.type(getTitleInput(), "H");

      expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    });

    it("creates the note and navigates to it after the autosave debounce fires", async () => {
      jest.useFakeTimers();
      apiRequest.mockResolvedValueOnce({ note: { _id: "new-id" } });
      const user = userEvent.setup({
        delay: null,
        advanceTimers: jest.advanceTimersByTime,
      });
      render(<NoteEditor />);

      await user.type(getTitleInput(), "My New Note");
      await act(async () => {
        await jest.advanceTimersByTimeAsync(1200);
      });

      expect(apiRequest).toHaveBeenCalledWith("/notes", {
        method: "POST",
        body: JSON.stringify({
          title: "My New Note",
          content: "",
          category: "General",
        }),
      });
      expect(mockNavigate).toHaveBeenCalledWith("/notes/new-id", {
        replace: true,
      });
      jest.useRealTimers();
    });

    it("does not autosave while the title is empty", async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({
        delay: null,
        advanceTimers: jest.advanceTimersByTime,
      });
      render(<NoteEditor />);

      await user.type(getTitleInput(), "   ");
      await act(async () => {
        await jest.advanceTimersByTimeAsync(1200);
      });

      expect(apiRequest).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it("shows a notice when saving a draft without a title", async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteEditor />);

      await user.click(screen.getByRole("button", { name: /save draft/i }));

      expect(
        await screen.findByText("Add a title before saving."),
      ).toBeInTheDocument();
      expect(apiRequest).not.toHaveBeenCalled();
    });

    it("saves a draft successfully and shows a confirmation notice", async () => {
      apiRequest.mockResolvedValueOnce({ note: { _id: "new-id" } });
      const user = userEvent.setup({ delay: null });
      render(<NoteEditor />);

      await user.type(getTitleInput(), "Quick Draft");
      await user.click(screen.getByRole("button", { name: /save draft/i }));

      expect(await screen.findByText("Draft saved.")).toBeInTheDocument();
      expect(mockNavigate).toHaveBeenCalledWith("/notes/new-id", {
        replace: true,
      });
    });

    it("saves the note and navigates to the dashboard on 'Save Note'", async () => {
      apiRequest.mockResolvedValueOnce({ note: { _id: "new-id" } });
      const user = userEvent.setup({ delay: null });
      render(<NoteEditor />);

      await user.type(getTitleInput(), "Finished Note");
      await user.click(screen.getByRole("button", { name: /save note/i }));

      await waitFor(() =>
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard"),
      );
    });

    it("shows an error status when saving fails", async () => {
      apiRequest.mockRejectedValueOnce(new Error("Server exploded"));
      const user = userEvent.setup({ delay: null });
      render(<NoteEditor />);

      await user.type(getTitleInput(), "Doomed Note");
      await user.click(screen.getByRole("button", { name: /save note/i }));

      expect(await screen.findByText("Server exploded")).toBeInTheDocument();
      expect(
        screen.getByText("Couldn't save — check your connection"),
      ).toBeInTheDocument();
    });
  });

  describe("editing an existing note", () => {
    beforeEach(() => {
      mockParams = { id: "note-1" };
    });

    it("shows a loading skeleton, then the note's data", async () => {
      apiRequest.mockResolvedValueOnce({ note: existingNote });
      render(<NoteEditor />);

      expect(
        await screen.findByDisplayValue("My Existing Note"),
      ).toBeInTheDocument();

      expect(screen.getByDisplayValue("Work")).toBeInTheDocument();

      expect(screen.getByTestId("rich-text-editor")).toHaveValue(
        "Some saved content",
      );

      expect(
        screen.getByRole("heading", { name: "Edit Note" }),
      ).toBeInTheDocument();
    });

    it("shows a formatted last-updated timestamp", async () => {
      apiRequest.mockResolvedValueOnce({ note: existingNote });
      render(<NoteEditor />);

      expect(
        await screen.findByText(/Last updated: March 10, 2024/),
      ).toBeInTheDocument();
    });

    it("shows a notice when the note fails to load", async () => {
      apiRequest.mockRejectedValueOnce(new Error("Note not found"));
      render(<NoteEditor />);

      expect(await screen.findByText("Note not found")).toBeInTheDocument();
    });

    it("updates an existing note via PUT instead of creating a new one", async () => {
      apiRequest.mockResolvedValueOnce({ note: existingNote });
      apiRequest.mockResolvedValueOnce({ success: true });
      const user = userEvent.setup({ delay: null });
      render(<NoteEditor />);

      await screen.findByDisplayValue("My Existing Note");
      await user.click(screen.getByRole("button", { name: /save note/i }));

      await waitFor(() =>
        expect(apiRequest).toHaveBeenLastCalledWith("/notes/note-1", {
          method: "PUT",
          body: JSON.stringify({
            title: "My Existing Note",
            content: "Some saved content",
            category: "Work",
          }),
        }),
      );
    });
  });

  describe("word and character counts", () => {
    it("updates counts as the user types in the editor", async () => {
      mockParams = {};
      const user = userEvent.setup({ delay: null });
      render(<NoteEditor />);

      await user.type(screen.getByTestId("rich-text-editor"), "hello world");

      expect(screen.getByText(/Words: 2/)).toBeInTheDocument();
      expect(screen.getByText(/Characters: 10/)).toBeInTheDocument();
    });
  });

  describe("navigation", () => {
    beforeEach(() => {
      mockParams = {};
    });

    it("navigates to the dashboard when clicking Cancel", async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteEditor />);

      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });

    it("navigates to the dashboard when clicking the close (X) icon", async () => {
      const user = userEvent.setup({ delay: null });
      const { container } = render(<NoteEditor />);

      const closeButton = container.querySelector("header button");
      await user.click(closeButton);

      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });

    it("navigates to /categories from the sidebar", async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteEditor />);

      await user.click(screen.getByRole("button", { name: /categories/i }));

      expect(mockNavigate).toHaveBeenCalledWith("/categories");
    });

    it("navigates to /notes/new from the sidebar 'New Note' button", async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteEditor />);

      await user.click(screen.getByRole("button", { name: /new note/i }));

      expect(mockNavigate).toHaveBeenCalledWith("/notes/new");
    });
  });

  describe("fullscreen toggle", () => {
    it("hides the sidebar when toggled on and shows it again when toggled off", async () => {
      mockParams = {};
      const user = userEvent.setup({ delay: null });
      render(<NoteEditor />);

      expect(screen.getByText("Notes App")).toBeInTheDocument();

      await user.click(
        screen.getByRole("button", { name: /toggle fullscreen/i }),
      );
      expect(screen.queryByText("Notes App")).not.toBeInTheDocument();

      await user.click(
        screen.getByRole("button", { name: /toggle fullscreen/i }),
      );
      expect(screen.getByText("Notes App")).toBeInTheDocument();
    });
  });

  describe("notices", () => {
    it("dismisses a notice when clicking Dismiss", async () => {
      mockParams = {};
      const user = userEvent.setup({ delay: null });
      render(<NoteEditor />);

      await user.click(screen.getByRole("button", { name: /save draft/i }));
      expect(
        await screen.findByText("Add a title before saving."),
      ).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /dismiss/i }));

      expect(
        screen.queryByText("Add a title before saving."),
      ).not.toBeInTheDocument();
    });
  });

  describe("profile panel", () => {
    it("opens when clicking Profile in the sidebar", async () => {
      mockParams = {};
      const user = userEvent.setup({ delay: null });
      render(<NoteEditor />);

      await user.click(screen.getByRole("button", { name: /^profile$/i }));

      expect(screen.getByTestId("profile-panel")).toHaveAttribute(
        "data-open",
        "true",
      );
    });
  });
});
