import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

const logout = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    navigate("/");
};

  return (
    <div style={{ padding: "40px" }}>
      <h1>Dashboard</h1>
      <p>Welcome to the Notes App!</p>

      <button onClick={logout}>Logout</button>
    </div>
  );
}