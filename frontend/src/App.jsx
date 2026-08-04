import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotesAuthPage from "./components/auth/NotesAuthPage";
import Dashboard from "./pages/Dashboard";
import NoteEditor from "./pages/NoteEditor";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<NotesAuthPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/notes/new" element={<NoteEditor />} /> 
        <Route path="/notes/:id" element={<NoteEditor />} /> 
      </Routes>
    </BrowserRouter>
  );
}

export default App;