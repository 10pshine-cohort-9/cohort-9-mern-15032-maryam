import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotesAuthPage from "./components/auth/NotesAuthPage";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<NotesAuthPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;