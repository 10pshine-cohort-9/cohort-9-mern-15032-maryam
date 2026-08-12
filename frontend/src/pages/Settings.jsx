import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuthToken } from "../utils/apiRequest";
import { getStoredTheme, applyTheme } from "../utils/theme";
import ProfilePanel from "../components/profile/ProfilePanel";
import {
  FileText,
  LayoutGrid,
  Star,
  Trash2,
  Folder,
  Tag,
  Settings as SettingsIcon,
  User as UserIcon,
  Cloud,
  Moon,
  Sun,
  Menu,
  Search,
  Bell,
} from "lucide-react";

function getStoredUser() {
  const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid, path: "/dashboard" },
  { key: "all", label: "All Notes", icon: FileText, path: "/dashboard" },
  { key: "favorites", label: "Favorites", icon: Star, path: "/dashboard" },
  { key: "trash", label: "Trash", icon: Trash2, path: "/dashboard" },
  { key: "categories", label: "Categories", icon: Folder, path: "/categories" },
  { key: "tags", label: "Tags", icon: Tag, path: null },
];

export default function Settings() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [theme, setTheme] = useState(getStoredTheme);
  const [user, setUser] = useState(getStoredUser);

  useEffect(() => {
    if (!getAuthToken()) {
      navigate("/");
    }
  }, [navigate]);

  const showNotice = (message) => {
    setNotice(message);
    setTimeout(() => setNotice((current) => (current === message ? "" : current)), 3000);
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  };

  const initials = (user?.name || "U")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

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
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <Icon className="w-4.5 h-4.5" size={18} />
                {item.label}
              </button>
            );
          })}

          <div className="!mt-4 pt-4 border-t border-slate-100 space-y-1">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-indigo-50 text-indigo-700">
              <SettingsIcon className="w-4.5 h-4.5" size={18} />
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
          <p className="text-sm font-semibold text-slate-800">Backup your notes</p>
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
                placeholder="Search notes..."
                onFocus={() => navigate("/dashboard")}
                readOnly
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 cursor-pointer"
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

            <button onClick={() => setProfileOpen(true)} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  initials
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
              <button onClick={() => setNotice("")} className="text-amber-600 font-medium">
                Dismiss
              </button>
            </div>
          )}

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
            <p className="text-sm text-slate-500 mt-1">
              Customize how the app looks and feels.
            </p>
          </div>

          <div className="max-w-lg bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
            <div className="flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  {theme === "dark" ? (
                    <Moon className="w-5 h-5 text-indigo-600" />
                  ) : (
                    <Sun className="w-5 h-5 text-indigo-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">Dark Mode</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {theme === "dark" ? "Currently on" : "Currently off"}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                role="switch"
                aria-checked={theme === "dark"}
                aria-label="Toggle dark mode"
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  theme === "dark" ? "bg-indigo-600" : "bg-slate-200"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    theme === "dark" ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </main>
      </div>
      <ProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} onUpdate={setUser} />
    </div>
  );
}
