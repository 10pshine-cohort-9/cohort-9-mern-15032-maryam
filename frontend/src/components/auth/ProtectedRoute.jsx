import { Navigate } from "react-router-dom";

function getAuthToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

export default function ProtectedRoute({ children }) {
  if (!getAuthToken()) {
    return <Navigate to="/" replace />;
  }
  return children;
}