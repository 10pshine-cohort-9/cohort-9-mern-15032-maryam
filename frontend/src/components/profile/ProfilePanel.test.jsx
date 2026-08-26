import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProfilePanel from "./ProfilePanel";
import { apiRequest } from "../../utils/apiRequest";

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock("../../utils/apiRequest", () => ({
  apiRequest: jest.fn(),
}));

class MockFileReaderSuccess {
  readAsDataURL() {
    this.result = "data:image/png;base64,original";
    this.onload && this.onload();
  }
}

class MockFileReaderFailure {
  readAsDataURL() {
    this.onerror && this.onerror();
  }
}

class MockImageSuccess {
  set src(_value) {
    this.width = 600;
    this.height = 400;
    this.onload && this.onload();
  }
}

class MockImagePortrait {
  set src(_value) {
    this.width = 400;
    this.height = 600;
    this.onload && this.onload();
  }
}

class MockImageSmall {
  set src(_value) {
    this.width = 200;
    this.height = 200;
    this.onload && this.onload();
  }
}

class MockImageFailure {
  set src(_value) {
    this.onerror && this.onerror();
  }
}

function installCanvasMocks() {
  HTMLCanvasElement.prototype.getContext = () => ({
    drawImage: jest.fn(),
  });
  HTMLCanvasElement.prototype.toDataURL = () =>
    "data:image/jpeg;base64,resized";
}

function makeImageFile(name = "photo.png") {
  return new File(["fake-image-bytes"], name, { type: "image/png" });
}

const storedUser = {
  name: "Maryam",
  email: "maryam@gmail.com",
  avatar: null,
  createdAt: "2024-01-15T00:00:00.000Z",
};

describe("ProfilePanel", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mockNavigate.mockClear();
    apiRequest.mockReset();

    global.FileReader = MockFileReaderSuccess;
    global.Image = MockImageSuccess;
    installCanvasMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders nothing when closed", () => {
    render(<ProfilePanel open={false} onClose={jest.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  describe("stored user helpers", () => {
    it("uses the user stored in sessionStorage", async () => {
      sessionStorage.setItem("user", JSON.stringify(storedUser));

      apiRequest.mockResolvedValueOnce({
        user: { ...storedUser, name: "Maryam" },
      });

      render(<ProfilePanel open={true} onClose={jest.fn()} />);

      expect(await screen.findByText("Maryam")).toBeInTheDocument();
    });

    it("handles invalid stored user JSON safely", async () => {
      localStorage.setItem("user", "{invalid-json");
      apiRequest.mockResolvedValueOnce({
        user: { ...storedUser, name: "Maryam" },
      });

      render(<ProfilePanel open={true} onClose={jest.fn()} />);

      expect(await screen.findByText("Maryam")).toBeInTheDocument();
    });

    it("shows fallback values when profile fields are missing", async () => {
      apiRequest.mockResolvedValueOnce({
        user: {},
      });

      render(<ProfilePanel open={true} onClose={jest.fn()} />);

      await screen.findByText("Full Name");
      expect(screen.getAllByText("—")).toHaveLength(3);
      expect(screen.getByText("U")).toBeInTheDocument();
    });

    it("formats a missing join date as an em dash", async () => {
      apiRequest.mockResolvedValueOnce({
        user: {
          name: "No Date",
          email: "maryam@gmail.com",
        },
      });

      render(<ProfilePanel open={true} onClose={jest.fn()} />);

      expect(await screen.findByText("No Date")).toBeInTheDocument();

      const memberSinceLabel = screen.getByText("Member Since");
      const value =
        memberSinceLabel.parentElement.querySelector("p:last-child");

      expect(value).toHaveTextContent("—");
    });
  });

  describe("loading the profile", () => {
    it("shows the loading skeleton before the profile is fetched", async () => {
      let resolveRequest;
      const pendingRequest = new Promise((resolve) => {
        resolveRequest = resolve;
      });

      apiRequest.mockReturnValueOnce(pendingRequest);

      render(<ProfilePanel open={true} onClose={jest.fn()} />);

      expect(document.querySelectorAll(".animate-pulse")).toHaveLength(3);

      await act(async () => {
        resolveRequest({ user: storedUser });
      });

      expect(await screen.findByText("Maryam")).toBeInTheDocument();
    });

    it("shows the profile once fetched", async () => {
      localStorage.setItem("user", JSON.stringify(storedUser));
      apiRequest.mockResolvedValueOnce({ user: storedUser });

      render(<ProfilePanel open={true} onClose={jest.fn()} />);

      expect(await screen.findByText("Maryam")).toBeInTheDocument();
      expect(screen.getByText("maryam@gmail.com")).toBeInTheDocument();
      expect(screen.getByText("January 15, 2024")).toBeInTheDocument();
    });

    it("shows an error message when the profile fetch fails", async () => {
      apiRequest.mockRejectedValueOnce(new Error("Network error"));

      render(<ProfilePanel open={true} onClose={jest.fn()} />);

      expect(await screen.findByText("Network error")).toBeInTheDocument();
    });

    it("calls onUpdate with the fetched profile", async () => {
      const onUpdate = jest.fn();
      apiRequest.mockResolvedValueOnce({ user: storedUser });

      render(
        <ProfilePanel open={true} onClose={jest.fn()} onUpdate={onUpdate} />,
      );

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith(storedUser);
      });
    });

    it("does not update state when the fetch resolves after the panel closes", async () => {
      let resolveRequest;
      const pendingRequest = new Promise((resolve) => {
        resolveRequest = resolve;
      });

      apiRequest.mockReturnValueOnce(pendingRequest);

      const { rerender } = render(
        <ProfilePanel open={true} onClose={jest.fn()} />,
      );

      rerender(<ProfilePanel open={false} onClose={jest.fn()} />);

      await act(async () => {
        resolveRequest({
          user: { ...storedUser, name: "Maryam" },
        });
      });

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("shows initials when there is no avatar", async () => {
      apiRequest.mockResolvedValueOnce({ user: storedUser });

      render(<ProfilePanel open={true} onClose={jest.fn()} />);

      expect(await screen.findByText("M")).toBeInTheDocument();
    });

    it("shows the avatar image when the profile has one", async () => {
      apiRequest.mockResolvedValueOnce({
        user: {
          ...storedUser,
          avatar: "data:image/png;base64,existing",
        },
      });

      const { container } = render(
        <ProfilePanel open={true} onClose={jest.fn()} />,
      );

      await waitFor(() =>
        expect(container.querySelector("img")).toHaveAttribute(
          "src",
          "data:image/png;base64,existing",
        ),
      );
    });
  });

  describe("editing name and email", () => {
    beforeEach(() => {
      apiRequest.mockResolvedValueOnce({ user: storedUser });
    });

    it("saves a new name successfully", async () => {
      apiRequest.mockResolvedValueOnce({
        user: { ...storedUser, name: "Maryam Updated" },
      });

      const onUpdate = jest.fn();
      const user = userEvent.setup({ delay: null });

      render(
        <ProfilePanel open={true} onClose={jest.fn()} onUpdate={onUpdate} />,
      );

      await screen.findByText("Maryam");
      await user.click(screen.getAllByText("Edit")[0]);

      const input = screen.getByDisplayValue("Maryam");
      await user.clear(input);
      await user.type(input, "Maryam Updated");
      await user.click(screen.getByText("Save"));

      expect(await screen.findByText("Maryam Updated")).toBeInTheDocument();

      expect(apiRequest).toHaveBeenLastCalledWith("/auth/profile", {
        method: "PUT",
        body: JSON.stringify({ name: "Maryam Updated" }),
      });

      expect(onUpdate).toHaveBeenCalledWith({
        ...storedUser,
        name: "Maryam Updated",
      });
    });

    it("saves a new email successfully", async () => {
      apiRequest.mockResolvedValueOnce({
        user: { ...storedUser, email: "maryam@gmail.com" },
      });

      const user = userEvent.setup({ delay: null });

      render(<ProfilePanel open={true} onClose={jest.fn()} />);

      await screen.findByText("maryam@gmail.com");

      await user.click(screen.getAllByText("Edit")[1]);

      const input = screen.getByDisplayValue("maryam@gmail.com");
      await user.clear(input);
      await user.type(input, "maryam@gmail.com");
      await user.click(screen.getByText("Save"));

      expect(await screen.findByText("maryam@gmail.com")).toBeInTheDocument();

      expect(apiRequest).toHaveBeenLastCalledWith("/auth/profile", {
        method: "PUT",
        body: JSON.stringify({ email: "maryam@gmail.com" }),
      });
    });

    it("saves a name when Enter is pressed", async () => {
      apiRequest.mockResolvedValueOnce({
        user: { ...storedUser, name: "Enter Name" },
      });

      const user = userEvent.setup({ delay: null });

      render(<ProfilePanel open={true} onClose={jest.fn()} />);

      await screen.findByText("Maryam");
      await user.click(screen.getAllByText("Edit")[0]);

      const input = screen.getByDisplayValue("Maryam");
      await user.clear(input);
      await user.type(input, "Enter Name");
      await user.keyboard("{Enter}");

      expect(await screen.findByText("Enter Name")).toBeInTheDocument();
    });

    it("cancels an edit with the Escape key", async () => {
      const user = userEvent.setup({ delay: null });

      render(<ProfilePanel open={true} onClose={jest.fn()} />);

      await screen.findByText("Maryam");
      await user.click(screen.getAllByText("Edit")[0]);

      const input = screen.getByDisplayValue("Maryam");
      await user.clear(input);
      await user.type(input, "Something Else");
      await user.keyboard("{Escape}");

      expect(screen.getByText("Maryam")).toBeInTheDocument();
      expect(
        screen.queryByDisplayValue("Something Else"),
      ).not.toBeInTheDocument();
    });

    it("cancels an edit without calling the API", async () => {
      const user = userEvent.setup({ delay: null });

      render(<ProfilePanel open={true} onClose={jest.fn()} />);

      await screen.findByText("Maryam");
      await user.click(screen.getAllByText("Edit")[0]);
      await user.clear(screen.getByDisplayValue("Maryam"));
      await user.type(screen.getByRole("textbox"), "Something Else");
      await user.click(screen.getByText("Cancel"));

      expect(screen.getByText("Maryam")).toBeInTheDocument();
      expect(apiRequest).toHaveBeenCalledTimes(1);
    });

    it("rejects an empty name without calling the API", async () => {
      const user = userEvent.setup({ delay: null });

      render(<ProfilePanel open={true} onClose={jest.fn()} />);

      await screen.findByText("Maryam");
      await user.click(screen.getAllByText("Edit")[0]);
      await user.clear(screen.getByDisplayValue("Maryam"));
      await user.click(screen.getByText("Save"));

      expect(await screen.findByText("Name is required.")).toBeInTheDocument();

      expect(apiRequest).toHaveBeenCalledTimes(1);
    });

    it("rejects an empty email without calling the API", async () => {
      const user = userEvent.setup({ delay: null });

      render(<ProfilePanel open={true} onClose={jest.fn()} />);

      await screen.findByText("Maryam");
      await user.click(screen.getAllByText("Edit")[1]);
      await user.clear(screen.getByDisplayValue("maryam@gmail.com"));
      await user.click(screen.getByText("Save"));

      expect(await screen.findByText("Email is required.")).toBeInTheDocument();

      expect(apiRequest).toHaveBeenCalledTimes(1);
    });

    it("trims whitespace before saving", async () => {
      apiRequest.mockResolvedValueOnce({
        user: { ...storedUser, name: "Trimmed Name" },
      });

      const user = userEvent.setup({ delay: null });

      render(<ProfilePanel open={true} onClose={jest.fn()} />);

      await screen.findByText("Maryam");
      await user.click(screen.getAllByText("Edit")[0]);

      const input = screen.getByDisplayValue("Maryam");
      await user.clear(input);
      await user.type(input, "  Trimmed Name  ");
      await user.click(screen.getByText("Save"));

      expect(await screen.findByText("Trimmed Name")).toBeInTheDocument();

      expect(apiRequest).toHaveBeenLastCalledWith("/auth/profile", {
        method: "PUT",
        body: JSON.stringify({ name: "Trimmed Name" }),
      });
    });

    it("shows an error and stays in edit mode when saving fails", async () => {
      apiRequest.mockRejectedValueOnce(new Error("Email already in use."));

      const user = userEvent.setup({ delay: null });

      render(<ProfilePanel open={true} onClose={jest.fn()} />);

      await screen.findByText("Maryam");
      await user.click(screen.getAllByText("Edit")[0]);
      await user.clear(screen.getByDisplayValue("Maryam"));
      await user.type(screen.getByRole("textbox"), "New Name");
      await user.click(screen.getByText("Save"));

      expect(
        await screen.findByText("Email already in use."),
      ).toBeInTheDocument();

      expect(screen.getByDisplayValue("New Name")).toBeInTheDocument();
    });
  });

  describe("avatar upload", () => {
    beforeEach(() => {
      apiRequest.mockResolvedValueOnce({ user: storedUser });
    });

    function getFileInput() {
      return document.querySelector('input[type="file"]');
    }

    it("uploads and applies a resized avatar", async () => {
      apiRequest.mockResolvedValueOnce({
        user: {
          ...storedUser,
          avatar: "data:image/jpeg;base64,resized",
        },
      });

      const user = userEvent.setup({ delay: null });
      const { container } = render(
        <ProfilePanel open={true} onClose={jest.fn()} />,
      );

      await screen.findByText("Maryam");
      await user.upload(getFileInput(), makeImageFile());

      await waitFor(() =>
        expect(apiRequest).toHaveBeenLastCalledWith("/auth/avatar", {
          method: "PUT",
          body: JSON.stringify({
            avatar: "data:image/jpeg;base64,resized",
          }),
        }),
      );

      await waitFor(() =>
        expect(container.querySelector("img")).toHaveAttribute(
          "src",
          "data:image/jpeg;base64,resized",
        ),
      );
    });

    it("resizes a portrait image using the height branch", async () => {
      global.Image = MockImagePortrait;

      apiRequest.mockResolvedValueOnce({
        user: {
          ...storedUser,
          avatar: "data:image/jpeg;base64,resized",
        },
      });

      const user = userEvent.setup({ delay: null });

      render(<ProfilePanel open={true} onClose={jest.fn()} />);

      await screen.findByText("Maryam");
      await user.upload(getFileInput(), makeImageFile());

      await waitFor(() =>
        expect(apiRequest).toHaveBeenLastCalledWith("/auth/avatar", {
          method: "PUT",
          body: JSON.stringify({
            avatar: "data:image/jpeg;base64,resized",
          }),
        }),
      );
    });

    it("keeps a small image dimensions unchanged", async () => {
      global.Image = MockImageSmall;

      apiRequest.mockResolvedValueOnce({
        user: {
          ...storedUser,
          avatar: "data:image/jpeg;base64,resized",
        },
      });

      const user = userEvent.setup({ delay: null });

      render(<ProfilePanel open={true} onClose={jest.fn()} />);

      await screen.findByText("Maryam");
      await user.upload(getFileInput(), makeImageFile());

      await waitFor(() =>
        expect(apiRequest).toHaveBeenLastCalledWith("/auth/avatar", {
          method: "PUT",
          body: JSON.stringify({
            avatar: "data:image/jpeg;base64,resized",
          }),
        }),
      );
    });

    it("handles a pending avatar upload and completes after it resolves", async () => {
      let resolveUpload;

      apiRequest.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveUpload = resolve;
        }),
      );

      const user = userEvent.setup({ delay: null });

      render(<ProfilePanel open={true} onClose={jest.fn()} />);

      await screen.findByText("Maryam");

      await user.upload(
        document.querySelector('input[type="file"]'),
        makeImageFile(),
      );

      await waitFor(() =>
        expect(apiRequest).toHaveBeenLastCalledWith("/auth/avatar", {
          method: "PUT",
          body: JSON.stringify({
            avatar: "data:image/jpeg;base64,resized",
          }),
        }),
      );

      expect(
        screen.getByRole("button", { name: "Change profile photo" }),
      ).toBeDisabled();

      await act(async () => {
        resolveUpload({
          user: {
            ...storedUser,
            avatar: "data:image/jpeg;base64,resized",
          },
        });
      });

      await waitFor(() =>
        expect(
          screen.getByRole("button", {
            name: "Change profile photo",
          }),
        ).not.toBeDisabled(),
      );

      expect(apiRequest).toHaveBeenCalledTimes(2);
    });

    it("ignores a change event with no selected file", async () => {
      render(<ProfilePanel open={true} onClose={jest.fn()} />);

      await screen.findByText("Maryam");

      const input = getFileInput();

      Object.defineProperty(input, "files", {
        value: [],
        configurable: true,
      });

      fireEvent.change(input);

      expect(apiRequest).toHaveBeenCalledTimes(1);
    });

    it("rejects a non-image file", async () => {
      render(<ProfilePanel open={true} onClose={jest.fn()} />);

      await screen.findByText("Maryam");

      const textFile = new File(["hello"], "notes.txt", {
        type: "text/plain",
      });

      const input = getFileInput();

      Object.defineProperty(input, "files", {
        value: [textFile],
        configurable: true,
      });

      fireEvent.change(input);

      expect(
        await screen.findByText("Please choose an image file."),
      ).toBeInTheDocument();

      expect(apiRequest).toHaveBeenCalledTimes(1);
    });

    it("shows an error when the image cannot be read", async () => {
      global.FileReader = MockFileReaderFailure;

      const user = userEvent.setup({ delay: null });

      render(<ProfilePanel open={true} onClose={jest.fn()} />);

      await screen.findByText("Maryam");
      await user.upload(getFileInput(), makeImageFile());

      expect(
        await screen.findByText("Couldn't read that file."),
      ).toBeInTheDocument();
    });

    it("shows an error when the image fails to decode", async () => {
      global.Image = MockImageFailure;

      const user = userEvent.setup({ delay: null });

      render(<ProfilePanel open={true} onClose={jest.fn()} />);

      await screen.findByText("Maryam");
      await user.upload(getFileInput(), makeImageFile());

      expect(
        await screen.findByText("That doesn't look like a valid image."),
      ).toBeInTheDocument();
    });

    it("calls onUpdate after a successful avatar upload", async () => {
      const onUpdate = jest.fn();

      apiRequest.mockResolvedValueOnce({
        user: {
          ...storedUser,
          avatar: "data:image/jpeg;base64,resized",
        },
      });

      const user = userEvent.setup({ delay: null });

      render(
        <ProfilePanel open={true} onClose={jest.fn()} onUpdate={onUpdate} />,
      );

      await screen.findByText("Maryam");
      await user.upload(getFileInput(), makeImageFile());

      await waitFor(() =>
        expect(onUpdate).toHaveBeenLastCalledWith({
          ...storedUser,
          avatar: "data:image/jpeg;base64,resized",
        }),
      );
    });
  });

  describe("logout", () => {
    it("clears stored auth and navigates to '/'", async () => {
      apiRequest.mockResolvedValueOnce({ user: storedUser });

      localStorage.setItem("token", "some-token");
      localStorage.setItem("user", JSON.stringify(storedUser));

      const user = userEvent.setup({ delay: null });

      render(<ProfilePanel open={true} onClose={jest.fn()} />);

      await screen.findByText("Maryam");
      await user.click(screen.getByRole("button", { name: /log out/i }));

      expect(localStorage.getItem("token")).toBeNull();
      expect(sessionStorage.getItem("token")).toBeNull();
      expect(localStorage.getItem("user")).toBeNull();
      expect(sessionStorage.getItem("user")).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    it("clears sessionStorage auth when the session is used", async () => {
      sessionStorage.setItem("token", "session-token");
      sessionStorage.setItem("user", JSON.stringify(storedUser));

      apiRequest.mockResolvedValueOnce({ user: storedUser });

      const user = userEvent.setup({ delay: null });

      render(<ProfilePanel open={true} onClose={jest.fn()} />);

      await screen.findByText("Maryam");
      await user.click(screen.getByRole("button", { name: /log out/i }));

      expect(sessionStorage.getItem("token")).toBeNull();
      expect(sessionStorage.getItem("user")).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  describe("panel dismissal", () => {
    it("calls onClose when the Escape key is pressed", async () => {
      apiRequest.mockResolvedValueOnce({ user: storedUser });

      const onClose = jest.fn();
      const user = userEvent.setup({ delay: null });

      render(<ProfilePanel open={true} onClose={onClose} />);

      await screen.findByText("Maryam");
      await user.keyboard("{Escape}");

      expect(onClose).toHaveBeenCalled();
    });

    it("calls onClose when the close button is clicked", async () => {
      apiRequest.mockResolvedValueOnce({ user: storedUser });

      const onClose = jest.fn();
      const user = userEvent.setup({ delay: null });

      render(<ProfilePanel open={true} onClose={onClose} />);

      await screen.findByText("Maryam");
      await user.click(screen.getByRole("button", { name: "Close" }));

      expect(onClose).toHaveBeenCalled();
    });

    it("calls onClose when the backdrop is clicked", async () => {
      apiRequest.mockResolvedValueOnce({ user: storedUser });

      const onClose = jest.fn();
      const user = userEvent.setup({ delay: null });

      const { container } = render(
        <ProfilePanel open={true} onClose={onClose} />,
      );

      await screen.findByText("Maryam");

      const backdrop = container.querySelector(".bg-slate-900\\/30");

      await user.click(backdrop);

      expect(onClose).toHaveBeenCalled();
    });

    it("does not call onClose when clicking the dialog panel itself", async () => {
      apiRequest.mockResolvedValueOnce({ user: storedUser });

      const onClose = jest.fn();
      const user = userEvent.setup({ delay: null });

      render(<ProfilePanel open={true} onClose={onClose} />);

      await user.click(await screen.findByText("Maryam"));

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("focus management", () => {
    it("focuses the close button when opened", async () => {
      apiRequest.mockResolvedValueOnce({ user: storedUser });

      render(<ProfilePanel open={true} onClose={jest.fn()} />);

      await waitFor(() => expect(screen.getByLabelText("Close")).toHaveFocus());
    });

    it("wraps focus from the first focusable element to the last", async () => {
      apiRequest.mockResolvedValueOnce({ user: storedUser });

      const user = userEvent.setup({ delay: null });

      render(<ProfilePanel open={true} onClose={jest.fn()} />);

      await screen.findByText("Maryam");

      const closeButton = screen.getByLabelText("Close");
      const logoutButton = screen.getByRole("button", {
        name: /log out/i,
      });

      closeButton.focus();

      await user.keyboard("{Shift>}{Tab}{/Shift}");

      expect(logoutButton).toHaveFocus();
    });

    it("wraps focus from the last focusable element to the first", async () => {
      apiRequest.mockResolvedValueOnce({ user: storedUser });

      const user = userEvent.setup({ delay: null });

      render(<ProfilePanel open={true} onClose={jest.fn()} />);

      await screen.findByText("Maryam");

      const closeButton = screen.getByLabelText("Close");
      const logoutButton = screen.getByRole("button", {
        name: /log out/i,
      });

      logoutButton.focus();

      await user.keyboard("{Tab}");

      expect(closeButton).toHaveFocus();
    });

    it("restores focus to the previously focused element when closed", async () => {
      apiRequest.mockResolvedValueOnce({ user: storedUser });

      const outsideButton = document.createElement("button");
      document.body.appendChild(outsideButton);
      outsideButton.focus();

      const { rerender } = render(
        <ProfilePanel open={true} onClose={jest.fn()} />,
      );

      await waitFor(() => expect(screen.getByLabelText("Close")).toHaveFocus());

      rerender(<ProfilePanel open={false} onClose={jest.fn()} />);

      expect(outsideButton).toHaveFocus();

      document.body.removeChild(outsideButton);
    });
  });
});
