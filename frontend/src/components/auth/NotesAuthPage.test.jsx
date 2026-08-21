import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NotesAuthPage from "./NotesAuthPage";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

function getSubmitButton() {
  return document.querySelector('button[type="submit"]');
}

function mockFetchOnce(ok, body) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(body),
  });
}

describe("NotesAuthPage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mockNavigate.mockClear();
  });

  describe("on mount", () => {
    it("redirects to /dashboard when a token already exists", () => {
      localStorage.setItem("token", "existing-token");
      render(<NotesAuthPage />);
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });

    it("stays on the auth page when no token exists", () => {
      render(<NotesAuthPage />);
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(screen.getByText("Welcome back!")).toBeInTheDocument();
    });
  });

  describe("mode switching", () => {
    it("defaults to login mode", () => {
      render(<NotesAuthPage />);
      expect(screen.getByText("Welcome back!")).toBeInTheDocument();
      expect(
        screen.queryByPlaceholderText("Enter your name"),
      ).not.toBeInTheDocument();
    });

    it("switches to signup mode and shows the name field", async () => {
      const user = userEvent.setup({ delay: null });
      render(<NotesAuthPage />);

      await user.click(screen.getByRole("button", { name: "Sign Up" }));

      expect(screen.getByText("Create your account")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Enter your name")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Re-enter your password"),
      ).toBeInTheDocument();
    });

    it("clears the form when switching modes", async () => {
      const user = userEvent.setup({ delay: null });
      render(<NotesAuthPage />);

      await user.type(
        screen.getByPlaceholderText("Enter your email"),
        "maryam@gmail.com",
      );
      await user.click(screen.getByRole("button", { name: "Sign Up" }));
      await user.click(screen.getByRole("button", { name: "Log In" }));

      expect(screen.getByPlaceholderText("Enter your email")).toHaveValue("");
    });

    it("switches modes using the bottom 'Sign up' / 'Log in' link", async () => {
      const user = userEvent.setup({ delay: null });
      render(<NotesAuthPage />);

      await user.click(screen.getByRole("button", { name: "Sign up" }));
      expect(screen.getByText("Create your account")).toBeInTheDocument();
    });

    it("switches back to login using the bottom 'Log in' link", async () => {
      const user = userEvent.setup({ delay: null });
      render(<NotesAuthPage />);

      await user.click(screen.getByRole("button", { name: "Sign Up" }));
      expect(screen.getByText("Create your account")).toBeInTheDocument();

      const bottomLoginLink = screen
        .getAllByText("Log in")
        .find((el) => el.tagName === "BUTTON");
      await user.click(bottomLoginLink);

      expect(screen.getByText("Welcome back!")).toBeInTheDocument();
    });
  });

  describe("login validation", () => {
    it("requires an email address", async () => {
      const user = userEvent.setup({ delay: null });
      render(<NotesAuthPage />);

      await user.click(getSubmitButton());

      expect(
        await screen.findByText("Email address is required."),
      ).toBeInTheDocument();
    });

    it("requires a valid email format", async () => {
      const user = userEvent.setup({ delay: null });
      render(<NotesAuthPage />);

      await user.type(
        screen.getByPlaceholderText("Enter your email"),
        "not-an-email",
      );
      await user.click(getSubmitButton());

      expect(
        await screen.findByText("Please enter a valid email address."),
      ).toBeInTheDocument();
    });

    it("requires a password", async () => {
      const user = userEvent.setup({ delay: null });
      render(<NotesAuthPage />);

      await user.type(
        screen.getByPlaceholderText("Enter your email"),
        "maryam@gmail.com",
      );
      await user.click(getSubmitButton());

      expect(
        await screen.findByText("Password is required."),
      ).toBeInTheDocument();
    });
  });

  describe("signup validation", () => {
    async function goToSignup(user) {
      render(<NotesAuthPage />);
      await user.click(screen.getByRole("button", { name: "Sign Up" }));
    }

    it("requires a full name", async () => {
      const user = userEvent.setup({ delay: null });
      await goToSignup(user);

      await user.click(getSubmitButton());

      expect(
        await screen.findByText("Full name is required."),
      ).toBeInTheDocument();
    });

    it("requires the name to be at least 3 characters", async () => {
      const user = userEvent.setup({ delay: null });
      await goToSignup(user);

      await user.type(screen.getByPlaceholderText("Enter your name"), "Al");
      await user.click(getSubmitButton());

      expect(
        await screen.findByText(
          "Full name must contain at least 3 characters.",
        ),
      ).toBeInTheDocument();
    });

    it("requires a signup email address", async () => {
      const user = userEvent.setup({ delay: null });
      await goToSignup(user);

      await user.type(screen.getByPlaceholderText("Enter your name"), "Maryam");
      await user.click(getSubmitButton());

      expect(
        await screen.findByText("Email address is required."),
      ).toBeInTheDocument();
    });

    it("requires a valid signup email format", async () => {
      const user = userEvent.setup({ delay: null });
      await goToSignup(user);

      await user.type(screen.getByPlaceholderText("Enter your name"), "Maryam");
      await user.type(
        screen.getByPlaceholderText("Enter your email"),
        "not-an-email",
      );
      await user.click(getSubmitButton());

      expect(
        await screen.findByText("Please enter a valid email address."),
      ).toBeInTheDocument();
    });

    it("requires the password field on signup", async () => {
      const user = userEvent.setup({ delay: null });
      await goToSignup(user);

      await user.type(screen.getByPlaceholderText("Enter your name"), "Maryam");
      await user.type(
        screen.getByPlaceholderText("Enter your email"),
        "maryam@gmail.com",
      );
      await user.click(getSubmitButton());

      expect(
        await screen.findByText("Password is required."),
      ).toBeInTheDocument();
    });

    it("rejects a password shorter than 8 characters", async () => {
      const user = userEvent.setup({ delay: null });
      await goToSignup(user);

      await user.type(screen.getByPlaceholderText("Enter your name"), "Maryam");
      await user.type(
        screen.getByPlaceholderText("Enter your email"),
        "maryam@gmail.com",
      );
      await user.type(screen.getByPlaceholderText("Enter your password"), "weak");
      await user.click(getSubmitButton());

      expect(
        await screen.findByText(
          "Password must be at least 8 characters long.",
        ),
      ).toBeInTheDocument();
    });

    it("rejects a password missing an uppercase letter", async () => {
      const user = userEvent.setup({ delay: null });
      await goToSignup(user);

      await user.type(screen.getByPlaceholderText("Enter your name"), "Maryam");
      await user.type(
        screen.getByPlaceholderText("Enter your email"),
        "maryam@gmail.com",
      );
      await user.type(
        screen.getByPlaceholderText("Enter your password"),
        "abcdef1!",
      );
      await user.click(getSubmitButton());

      expect(
        await screen.findByText(
          "Password must contain at least one uppercase letter.",
        ),
      ).toBeInTheDocument();
    });

    it("rejects a password missing a lowercase letter", async () => {
      const user = userEvent.setup({ delay: null });
      await goToSignup(user);

      await user.type(screen.getByPlaceholderText("Enter your name"), "Maryam");
      await user.type(
        screen.getByPlaceholderText("Enter your email"),
        "maryam@gmail.com",
      );
      await user.type(
        screen.getByPlaceholderText("Enter your password"),
        "ABCDEF1!",
      );
      await user.click(getSubmitButton());

      expect(
        await screen.findByText(
          "Password must contain at least one lowercase letter.",
        ),
      ).toBeInTheDocument();
    });

    it("rejects a password missing a number", async () => {
      const user = userEvent.setup({ delay: null });
      await goToSignup(user);

      await user.type(screen.getByPlaceholderText("Enter your name"), "Maryam");
      await user.type(
        screen.getByPlaceholderText("Enter your email"),
        "maryam@gmail.com",
      );
      await user.type(
        screen.getByPlaceholderText("Enter your password"),
        "Abcdefgh!",
      );
      await user.click(getSubmitButton());

      expect(
        await screen.findByText("Password must contain at least one number."),
      ).toBeInTheDocument();
    });

    it("rejects a password missing a special character", async () => {
      const user = userEvent.setup({ delay: null });
      await goToSignup(user);

      await user.type(screen.getByPlaceholderText("Enter your name"), "Maryam");
      await user.type(
        screen.getByPlaceholderText("Enter your email"),
        "maryam@gmail.com",
      );
      await user.type(
        screen.getByPlaceholderText("Enter your password"),
        "Abcdefg1",
      );
      await user.click(getSubmitButton());

      expect(
        await screen.findByText(
          "Password must contain at least one special character.",
        ),
      ).toBeInTheDocument();
    });

    it("requires the confirm password to be filled in", async () => {
      const user = userEvent.setup({ delay: null });
      await goToSignup(user);

      await user.type(screen.getByPlaceholderText("Enter your name"), "Maryam");
      await user.type(
        screen.getByPlaceholderText("Enter your email"),
        "maryam@gmail.com",
      );
      await user.type(
        screen.getByPlaceholderText("Enter your password"),
        "MARy@m987",
      );
      await user.click(getSubmitButton());

      expect(
        await screen.findByText("Please confirm your password."),
      ).toBeInTheDocument();
    });

    it("requires the confirm password to match", async () => {
      const user = userEvent.setup({ delay: null });
      await goToSignup(user);

      await user.type(screen.getByPlaceholderText("Enter your name"), "Maryam");
      await user.type(
        screen.getByPlaceholderText("Enter your email"),
        "maryam@gmail.com",
      );
      await user.type(
        screen.getByPlaceholderText("Enter your password"),
        "MARy@m987",
      );
      await user.type(
        screen.getByPlaceholderText("Re-enter your password"),
        "Different1!",
      );
      await user.click(getSubmitButton());

      expect(
        await screen.findByText("Passwords do not match."),
      ).toBeInTheDocument();
    });
  });

  describe("login submission", () => {
    it("stores the token in localStorage and navigates on success with remember checked", async () => {
      const user = userEvent.setup({ delay: null });
      mockFetchOnce(true, {
        token: "jwt-token",
        user: { name: "Maryam", email: "maryam@gmail.com" },
      });
      render(<NotesAuthPage />);

      await user.type(
        screen.getByPlaceholderText("Enter your email"),
        "maryam@gmail.com",
      );
      await user.type(
        screen.getByPlaceholderText("Enter your password"),
        "MARy@m987",
      );
      await user.click(screen.getByLabelText(/remember me/i));
      await user.click(getSubmitButton());

      await waitFor(() =>
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard"),
      );
      expect(localStorage.getItem("token")).toBe("jwt-token");
      expect(sessionStorage.getItem("token")).toBeNull();
    });

    it("stores the token in sessionStorage when remember is unchecked", async () => {
      const user = userEvent.setup({ delay: null });
      mockFetchOnce(true, {
        token: "jwt-token",
        user: { name: "Maryam", email: "maryam@gmail.com" },
      });
      render(<NotesAuthPage />);

      await user.type(
        screen.getByPlaceholderText("Enter your email"),
        "maryam@gmail.com",
      );
      await user.type(
        screen.getByPlaceholderText("Enter your password"),
        "MARy@m987",
      );
      await user.click(getSubmitButton());

      await waitFor(() =>
        expect(sessionStorage.getItem("token")).toBe("jwt-token"),
      );
      expect(localStorage.getItem("token")).toBeNull();
    });

    it("shows an error alert when the server rejects the login", async () => {
      const user = userEvent.setup({ delay: null });
      mockFetchOnce(false, { message: "Wrong Password" });
      render(<NotesAuthPage />);

      await user.type(
        screen.getByPlaceholderText("Enter your email"),
        "maryam@gmail.com",
      );
      await user.type(
        screen.getByPlaceholderText("Enter your password"),
        "WrongPass1!",
      );
      await user.click(getSubmitButton());

      expect(await screen.findByText("Wrong Password")).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalledWith("/dashboard");
    });

    it("shows a server error alert when the network request fails", async () => {
      const user = userEvent.setup({ delay: null });
      global.fetch = jest.fn().mockRejectedValue(new Error("Network down"));
      render(<NotesAuthPage />);

      await user.type(
        screen.getByPlaceholderText("Enter your email"),
        "maryam@gmail.com",
      );
      await user.type(
        screen.getByPlaceholderText("Enter your password"),
        "MARy@m987",
      );
      await user.click(getSubmitButton());

      expect(await screen.findByText("Network down")).toBeInTheDocument();
    });
  });

  describe("signup submission", () => {
    it("shows a success alert and switches back to login on success", async () => {
      const user = userEvent.setup({ delay: null });
      mockFetchOnce(true, { success: true });
      render(<NotesAuthPage />);

      await user.click(screen.getByRole("button", { name: "Sign Up" }));
      await user.type(screen.getByPlaceholderText("Enter your name"), "Maryam");
      await user.type(
        screen.getByPlaceholderText("Enter your email"),
        "maryam@gmail.com",
      );
      await user.type(
        screen.getByPlaceholderText("Enter your password"),
        "MARy@m987",
      );
      await user.type(
        screen.getByPlaceholderText("Re-enter your password"),
        "MARy@m987",
      );
      await user.click(getSubmitButton());

      expect(
        await screen.findByText("Account created successfully!"),
      ).toBeInTheDocument();
      expect(screen.getByText("Welcome back!")).toBeInTheDocument();
    });
  });

  describe("unimplemented feature notices", () => {
    it("shows a warning when clicking 'Forgot password?'", async () => {
      const user = userEvent.setup({ delay: null });
      render(<NotesAuthPage />);

      await user.click(screen.getByText("Forgot password?"));

      expect(
        await screen.findByText(
          "Forgot Password functionality is not implemented yet.",
        ),
      ).toBeInTheDocument();
    });

    it("shows a warning when clicking the Google button", async () => {
      const user = userEvent.setup({ delay: null });
      render(<NotesAuthPage />);

      await user.click(screen.getByRole("button", { name: /google/i }));

      expect(
        await screen.findByText("Google Login is not implemented yet."),
      ).toBeInTheDocument();
    });

    it("shows a warning when clicking the GitHub button", async () => {
      const user = userEvent.setup({ delay: null });
      render(<NotesAuthPage />);

      await user.click(screen.getByRole("button", { name: /github/i }));

      expect(
        await screen.findByText("GitHub Login is not implemented yet."),
      ).toBeInTheDocument();
    });
  });

  describe("password visibility toggle", () => {
    it("toggles the password field between hidden and visible", async () => {
      const user = userEvent.setup({ delay: null });
      render(<NotesAuthPage />);

      const passwordInput = screen.getByPlaceholderText("Enter your password");
      expect(passwordInput).toHaveAttribute("type", "password");

      await user.click(screen.getByLabelText("Show password"));
      expect(passwordInput).toHaveAttribute("type", "text");

      await user.click(screen.getByLabelText("Hide password"));
      expect(passwordInput).toHaveAttribute("type", "password");
    });

    it("toggles the confirm password field independently", async () => {
      const user = userEvent.setup({ delay: null });
      render(<NotesAuthPage />);
      await user.click(screen.getByRole("button", { name: "Sign Up" }));

      const confirmInput = screen.getByPlaceholderText("Re-enter your password");
      const passwordInput = screen.getByPlaceholderText("Enter your password");
      expect(confirmInput).toHaveAttribute("type", "password");

      const showButtons = screen.getAllByLabelText("Show password");
      await user.click(showButtons[showButtons.length - 1]);

      expect(confirmInput).toHaveAttribute("type", "text");
      expect(passwordInput).toHaveAttribute("type", "password");
    });
  });
});