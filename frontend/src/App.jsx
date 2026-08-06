import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotesAuthPage from "./components/auth/NotesAuthPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import NoteEditor from "./pages/NoteEditor";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<NotesAuthPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notes/new"
          element={
            <ProtectedRoute>
              <NoteEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notes/:id"
          element={
            <ProtectedRoute>
              <NoteEditor />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;