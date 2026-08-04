import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API_URL from "../config/api";
import RichTextEditor from "../components/editor/RichTextEditor";
import {
  FileText,
  LayoutGrid,
  Star,
  Trash2,
  Folder,
  Tag,
  Settings,
  User as UserIcon,
  Plus,
  X,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Loader2,
  Save,
  Check,
  Cloud,
} from "lucide-react";

function timeAgo(dateLike) {
  if (!dateLike) return "";
  const diffMs = Date.now() - new Date(dateLike).getTime();
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function getAuthToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

async function apiRequest(path, options = {}) {
  const token = getAuthToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data.message || "Something went wrong. Please try again later.",
    );
  }
  return data;
}

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { key: "all", label: "All Notes", icon: FileText },
  { key: "favorites", label: "Favorites", icon: Star },
  { key: "categories", label: "Categories", icon: Folder },
  { key: "tags", label: "Tags", icon: Tag },
  { key: "trash", label: "Trash", icon: Trash2 },
];

export default function NoteEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = !id || id === "new";

  const richTextRef = useRef(null);
  const titleRef = useRef("");
  const contentRef = useRef("");
  const saveTimer = useRef(null);

  const [noteId, setNoteId] = useState(isNew ? null : id);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [status, setStatus] = useState("idle");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [createdOrUpdatedAt, setCreatedOrUpdatedAt] = useState(null);
  const [notice, setNotice] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  titleRef.current = title;

  useEffect(() => {
    if (isNew) return;

    let cancelled = false;
    setLoading(true);
    apiRequest(`/notes/${id}`)
      .then((data) => {
        if (cancelled) return;
        setTitle(data.note.title);
        contentRef.current = data.note.content || "";
        setCreatedOrUpdatedAt(data.note.updatedAt);
      })
      .catch((err) => setNotice(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  useEffect(() => {
    if (!loading && !isNew) {
      richTextRef.current?.setContent(contentRef.current);
      updateCounts(richTextRef.current?.getText() || "");
    }
  }, [loading, isNew]);

  const updateCounts = (text) => {
    const words = text.trim().split(/\s+/).filter(Boolean);
    setWordCount(words.length);
    setCharCount(text.replace(/\s/g, "").length);
  };

  const persist = useCallback(async () => {
    const currentTitle = titleRef.current.trim();
    if (!currentTitle) {
      setStatus("idle");
      return false;
    }

    setStatus("saving");
    try {
      if (!noteId) {
        const data = await apiRequest("/notes", {
          method: "POST",
          body: JSON.stringify({
            title: currentTitle,
            content: contentRef.current,
          }),
        });
        setNoteId(data.note._id);
        navigate(`/notes/${data.note._id}`, { replace: true });
      } else {
        await apiRequest(`/notes/${noteId}`, {
          method: "PUT",
          body: JSON.stringify({
            title: currentTitle,
            content: contentRef.current,
          }),
        });
      }
      setStatus("saved");
      setLastSavedAt(new Date());
      return true;
    } catch (err) {
      setStatus("error");
      setNotice(err.message);
      return false;
    }
  }, [noteId, navigate]);

  const scheduleAutosave = () => {
    setStatus("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persist();
    }, 1200);
  };

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const handleTitleChange = (e) => {
    const value = e.target.value;
    setTitle(value);
    if (value.trim() && notice === "Add a title before saving.") {
      setNotice("");
    }
    scheduleAutosave();
  };
  const handleEditorUpdate = (html, text) => {
    contentRef.current = html;
    updateCounts(text);
    scheduleAutosave();
  };

  const handleSaveDraft = async () => {
    const saved = await persist();
    if (saved) setNotice("Draft saved.");
    else if (!titleRef.current.trim()) setNotice("Add a title before saving.");
  };

  const handleSaveNote = async () => {
    const saved = await persist();
    if (saved) {
      navigate("/dashboard");
    } else if (!titleRef.current.trim()) {
      setNotice("Add a title before saving.");
    }
  };

  const handleClose = () => navigate("/dashboard");

  const statusBadge = () => {
    if (status === "saving") {
      return (
        <span className="flex items-center gap-1.5 text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Saving...
        </span>
      );
    }
    if (status === "saved") {
      return (
        <span className="flex items-center gap-1.5 text-emerald-600">
          <CheckCircle2 className="w-4 h-4" /> All changes saved
        </span>
      );
    }
    if (status === "unsaved") {
      return <span className="text-slate-400">Unsaved changes</span>;
    }
    if (status === "error") {
      return (
        <span className="text-rose-500">
          Couldn't save — check your connection
        </span>
      );
    }
    return <span className="text-slate-400">Start writing to save</span>;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {!expanded && (
        <aside className="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col">
          <div className="h-16 flex items-center gap-2 px-5 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <FileText className="w-4.5 h-4.5 text-white" size={18} />
            </div>
            <span className="font-semibold text-slate-800">Notes App</span>
          </div>

          <div className="p-3">
            <button
              onClick={() => navigate("/notes/new")}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" />
              New Note
            </button>
          </div>

          <nav className="flex-1 px-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => navigate("/dashboard")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Icon className="w-4.5 h-4.5" size={18} />
                  {item.label}
                </button>
              );
            })}

            <div className="!mt-4 pt-4 border-t border-slate-100 space-y-1">
              <button
                onClick={() => navigate("/dashboard")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <Settings className="w-4.5 h-4.5" size={18} />
                Settings
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <UserIcon className="w-4.5 h-4.5" size={18} />
                Profile
              </button>
            </div>
          </nav>

          <div className="m-3 rounded-xl bg-gradient-to-b from-indigo-50 to-violet-50 p-4">
            <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mb-3">
              <Cloud className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-sm font-semibold text-slate-800">
              Backup your notes
            </p>
            <p className="text-xs text-slate-500 mt-1 mb-3">
              Keep your notes safe and access them from anywhere.
            </p>
            <button
              onClick={() => setNotice("Cloud backup isn't implemented yet.")}
              className="w-full bg-indigo-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-indigo-700"
            >
              Enable Backup
            </button>
          </div>
        </aside>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center gap-3 px-6">
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-slate-200" />
          <div>
            <h1 className="font-semibold text-slate-800 leading-tight">
              {isNew && !noteId ? "New Note" : "Edit Note"}
            </h1>
            <p className="text-xs text-slate-400">
              {createdOrUpdatedAt
                ? `Last updated: ${new Date(createdOrUpdatedAt).toLocaleString(
                    "en-US",
                    {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    },
                  )}`
                : "Not saved yet"}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-4 text-sm">
            {statusBadge()}
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Toggle fullscreen"
            >
              {expanded ? (
                <Minimize2 className="w-4.5 h-4.5" size={18} />
              ) : (
                <Maximize2 className="w-4.5 h-4.5" size={18} />
              )}
            </button>
          </div>
        </header>

        {notice && (
          <div className="mx-6 mt-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm px-4 py-2.5">
            {notice}
            <button
              onClick={() => setNotice("")}
              className="text-amber-600 font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        <main className="flex-1 p-6 overflow-y-auto">
          {loading ? (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="h-12 rounded-xl bg-white border border-slate-200 animate-pulse" />
              <div className="h-96 rounded-xl bg-white border border-slate-200 animate-pulse" />
            </div>
          ) : (
            <div className="max-w-4xl mx-auto flex flex-col gap-4">
              <input
                value={title}
                onChange={handleTitleChange}
                placeholder="Untitled note"
                className="w-full text-lg font-bold text-slate-900 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-400 bg-white"
              />

              <RichTextEditor
                ref={richTextRef}
                initialContent={contentRef.current}
                placeholder="Start writing your note..."
                onUpdate={handleEditorUpdate}
              />

              <div className="flex items-center justify-between px-1 -mt-2 text-xs text-slate-400">
                <span>
                  Words: {wordCount} &bull; Characters: {charCount}
                </span>
                <span>
                  {lastSavedAt ? `Saved ${timeAgo(lastSavedAt)}` : ""}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={handleClose}
                  className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSaveDraft}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100"
                  >
                    <Save className="w-4 h-4" />
                    Save Draft
                  </button>
                  <button
                    onClick={handleSaveNote}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                  >
                    <Check className="w-4 h-4" />
                    Save Note
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
