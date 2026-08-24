import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

function renderWithRouter(initialEntries = ["/protected"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/" element={<div>Login Page</div>} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <div>Secret Content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("redirects to the login page when there is no token", () => {
    renderWithRouter();

    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Secret Content")).not.toBeInTheDocument();
  });

  it("renders the protected content when a token exists in localStorage", () => {
    localStorage.setItem("token", "fake-jwt-token");

    renderWithRouter();

    expect(screen.getByText("Secret Content")).toBeInTheDocument();
    expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
  });

  it("renders the protected content when a token exists in sessionStorage", () => {
    sessionStorage.setItem("token", "fake-jwt-token");

    renderWithRouter();

    expect(screen.getByText("Secret Content")).toBeInTheDocument();
  });
});
