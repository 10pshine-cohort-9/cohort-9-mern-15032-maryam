import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest, getAuthToken } from "../utils/apiRequest";
import ProfilePanel from "../components/profile/ProfilePanel";
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
  Cloud,
  Menu,
  Search,
  Bell,
} from "lucide-react";

const ACCENTS = [
  { icon: "bg-indigo-100 text-indigo-600" },
  { icon: "bg-emerald-100 text-emerald-600" },
  { icon: "bg-amber-100 text-amber-600" },
  { icon: "bg-rose-100 text-rose-600" },
  { icon: "bg-blue-100 text-blue-600" },
  { icon: "bg-violet-100 text-violet-600" },
  { icon: "bg-cyan-100 text-cyan-600" },
  { icon: "bg-orange-100 text-orange-600" },
];

const NAV_ITEMS = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutGrid,
    path: "/dashboard",
  },
  { key: "all", label: "All Notes", icon: FileText, path: "/dashboard" },
  { key: "favorites", label: "Favorites", icon: Star, path: "/dashboard" },
  { key: "trash", label: "Trash", icon: Trash2, path: "/dashboard" },
  { key: "categories", label: "Categories", icon: Folder, path: "/categories" },
  { key: "tags", label: "Tags", icon: Tag, path: null },
];

export default function Categories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!getAuthToken()) {
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiRequest("/notes/categories")
      .then((data) => {
        if (!cancelled) setCategories(data.categories);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const showNotice = (message) => {
    setNotice(message);
    setTimeout(
      () => setNotice((current) => (current === message ? "" : current)),
      3000,
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } shrink-0 bg-white border-r border-slate-200 flex flex-col transition-all duration-200 overflow-hidden`}
      >
        <div className="h-16 flex items-center gap-2 px-5 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <FileText className="w-4.5 h-4.5 text-white" size={18} />
          </div>
          <span className="font-semibold text-slate-800">Notes App</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === "categories";
            return (
              <button
                key={item.key}
                onClick={() => {
                  if (!item.path) {
                    showNotice(`${item.label} view is coming soon.`);
                    return;
                  }
                  navigate(item.path);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon className="w-4.5 h-4.5" size={18} />
                {item.label}
              </button>
            );
          })}

          <div className="!mt-4 pt-4 border-t border-slate-100 space-y-1">
            <button
                onClick={() => navigate("/settings")}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <Settings className="w-4.5 h-4.5" size={18} />
              Settings
            </button>
            <button
              onClick={() => setProfileOpen(true)}
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
            Enable cloud backup to keep your notes safe.
          </p>
          <button
            onClick={() => showNotice("Cloud backup isn't implemented yet.")}
            className="w-full bg-indigo-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-indigo-700"
          >
            Enable Backup
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center gap-4 px-6">
          <button
            onClick={() => setSidebarOpen((s) => !s)}
            className="text-slate-500 hover:text-slate-700"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 max-w-xl">
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-slate-50">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search categories..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
              <kbd className="text-[10px] font-medium text-slate-400 border border-slate-200 rounded px-1.5 py-0.5 bg-white">
                Ctrl + K
              </kbd>
            </div>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <button
              onClick={() => showNotice("No new notifications.")}
              className="relative text-slate-500 hover:text-slate-700"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-indigo-600" />
            </button>

            <button
              onClick={() => setProfileOpen(true)}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center overflow-hidden">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (user?.name || "U")
                    .split(" ")
                    .filter(Boolean)
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()
                )}
              </div>
              <span className="text-sm font-medium text-slate-700">
                {user?.name || "Account"}
              </span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          {notice && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm px-4 py-2.5">
              {notice}
              <button
                onClick={() => setNotice("")}
                className="text-amber-600 font-medium"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
              <p className="text-sm text-slate-500 mt-1">
                Browse your notes grouped by category.
              </p>
            </div>
            <button
              onClick={() => navigate("/notes/new")}
              className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" />
              New Note
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm px-4 py-2.5">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 rounded-xl border border-slate-200 bg-white animate-pulse"
                />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl">
              <p className="text-slate-500 text-sm">
                No categories yet — categories appear here once you add notes.
              </p>
              <button
                onClick={() => navigate("/notes/new")}
                className="mt-3 text-indigo-600 text-sm font-medium hover:underline"
              >
                Create your first note
              </button>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl">
              <p className="text-slate-500 text-sm">
                No categories match "{search}".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredCategories.map((cat, i) => {
                const accent = ACCENTS[i % ACCENTS.length];
                return (
                  <button
                    key={cat.name}
                    onClick={() =>
                      navigate(
                        `/dashboard?category=${encodeURIComponent(cat.name)}`,
                      )
                    }
                    className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <div
                      className={`w-11 h-11 rounded-lg flex items-center justify-center mb-4 ${accent.icon}`}
                    >
                      <Folder className="w-5 h-5" />
                    </div>
                    <p className="font-semibold text-slate-800 truncate">
                      {cat.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {cat.count} {cat.count === 1 ? "note" : "notes"}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </main>
      </div>
      <ProfilePanel
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onUpdate={setUser}
      />
    </div>
  );
}
