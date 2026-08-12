import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiRequest, getAuthToken } from "../utils/apiRequest";
import ProfilePanel from "../components/profile/ProfilePanel";
import {
  LayoutGrid,
  FileText,
  Star,
  Trash2,
  Folder,
  Tag,
  Settings,
  User as UserIcon,
  Image as ImageIcon,
  Menu,
  Search,
  Bell,
  ChevronDown,
  Plus,
  List,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Cloud,
} from "lucide-react";

const ACCENTS = [
  {
    icon: "bg-indigo-100 text-indigo-600",
    badge: "bg-indigo-100 text-indigo-700",
  },
  {
    icon: "bg-emerald-100 text-emerald-600",
    badge: "bg-emerald-100 text-emerald-700",
  },
  { icon: "bg-amber-100 text-amber-600", badge: "bg-amber-100 text-amber-700" },
  { icon: "bg-rose-100 text-rose-600", badge: "bg-rose-100 text-rose-700" },
  { icon: "bg-blue-100 text-blue-600", badge: "bg-blue-100 text-blue-700" },
  {
    icon: "bg-violet-100 text-violet-600",
    badge: "bg-violet-100 text-violet-700",
  },
  { icon: "bg-cyan-100 text-cyan-600", badge: "bg-cyan-100 text-cyan-700" },
  {
    icon: "bg-orange-100 text-orange-600",
    badge: "bg-orange-100 text-orange-700",
  },
];

function timeAgo(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  return `${Math.floor(days / 365)}y ago`;
}

function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getStoredUser() {
  const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { key: "all", label: "All Notes", icon: FileText },
  { key: "favorites", label: "Favorites", icon: Star },
  { key: "trash", label: "Trash", icon: Trash2 },
  { key: "categories", label: "Categories", icon: Folder },
  { key: "tags", label: "Tags", icon: Tag },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get("category");
  const searchParam = searchParams.get("search");

  const [user, setUser] = useState(getStoredUser);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeNav, setActiveNav] = useState("dashboard");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const cancelDeleteRef = useRef(null);

  useEffect(() => {
    if (!showDeleteModal) return;
    cancelDeleteRef.current?.focus();
    const handleKey = (e) => {
      if (e.key === "Escape") {
        setShowDeleteModal(false);
        setSelectedNote(null);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [showDeleteModal]);

  useEffect(() => {
    if (!openMenuId) return;
    const closeMenu = () => setOpenMenuId(null);
    const handleKey = (e) => {
      if (e.key === "Escape") setOpenMenuId(null);
    };
    document.addEventListener("click", closeMenu);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("click", closeMenu);
      document.removeEventListener("keydown", handleKey);
    };
  }, [openMenuId]);

  const [notice, setNotice] = useState("");

  const showNotice = (message, autoDismiss = false) => {
    setNotice(message);
    if (autoDismiss) {
      setTimeout(
        () => setNotice((current) => (current === message ? "" : current)),
        3000,
      );
    }
  };

  const [stats, setStats] = useState({
    totalNotes: 0,
    favorites: 0,
    categories: 0,
    trashItems: 0,
  });

  const [notes, setNotes] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
    limit: 8,
  });
  const [search, setSearch] = useState(searchParam || "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParam || "");
  const [sort, setSort] = useState("updated_desc");
  const abortRef = useRef(null);
  const [view, setView] = useState("grid");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getAuthToken()) {
      navigate("/");
    }
  }, [navigate]);

  const filterParam = categoryParam || (activeNav === "dashboard" ? "all" : activeNav);

  const loadStats = useCallback(async () => {
    try {
      const data = await apiRequest("/notes/stats");
      setStats(data.stats);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadNotes = useCallback(
    async (page = 1) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          filter: filterParam,
          search: debouncedSearch,
          sort,
          page: String(page),
          limit: "8",
        });
        const data = await apiRequest(`/notes?${params.toString()}`, {
          signal: controller.signal,
        });
        setNotes(data.notes);
        setPagination(data.pagination);
        return data.pagination;
      } catch (err) {
        if (err.name === "AbortError") return null;
        setError(err.message);
        return null;
      } finally {
        if (abortRef.current === controller) setLoading(false);
      }
    },
    [filterParam, debouncedSearch, sort],
  );

  const refreshAfterMutation = useCallback(async () => {
    const result = await loadNotes(pagination.page);
    if (result && result.page > result.totalPages) {
      await loadNotes(result.totalPages);
    }
  }, [loadNotes, pagination.page]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    loadNotes(1);
  }, [loadNotes]);

  const goToNav = (key) => {
    if (categoryParam) setSearchParams({}, { replace: true });
    setNotice("");
    setActiveNav(key);
  };

  const logout = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    navigate("/");
  };

  const toggleFavorite = async (note) => {
    setNotes((prev) =>
      prev.map((n) =>
        n._id === note._id ? { ...n, isFavorite: !n.isFavorite } : n,
      ),
    );
    try {
      await apiRequest(`/notes/${note._id}/favorite`, { method: "PATCH" });
      loadStats();
    } catch (err) {
      setNotes((prev) =>
        prev.map((n) =>
          n._id === note._id ? { ...n, isFavorite: note.isFavorite } : n,
        ),
      );
      setNotice(err.message);
    }
  };

  const moveToTrash = async (note) => {
    try {
      await apiRequest(`/notes/${note._id}/trash`, { method: "PATCH" });
      await refreshAfterMutation();
      loadStats();
    } catch (err) {
      setNotice(err.message);
    }
  };

  const restoreFromTrash = async (note) => {
    try {
      await apiRequest(`/notes/${note._id}/restore`, { method: "PATCH" });
      await refreshAfterMutation();
      loadStats();
    } catch (err) {
      setNotice(err.message);
    }
  };

  const deleteForever = (note) => {
    setSelectedNote(note);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await apiRequest(`/notes/${selectedNote._id}`, {
        method: "DELETE",
      });

      await refreshAfterMutation();
      loadStats();
      setShowDeleteModal(false);
      setSelectedNote(null);

      showNotice("Note permanently deleted.", true);
    } catch (err) {
      setNotice(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const getPageWindow = (current, total) => {
    const delta = 1;
    const range = [];
    const rangeWithDots = [];
    let last;

    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (last !== undefined) {
        if (i - last === 2) {
          rangeWithDots.push(last + 1);
        } else if (i - last > 2) {
          rangeWithDots.push("...");
        }
      }
      rangeWithDots.push(i);
      last = i;
    }

    return rangeWithDots;
  };

  const heading = useMemo(() => {
    if (categoryParam) {
      return {
        title: categoryParam,
        subtitle: `Notes in "${categoryParam}".`,
      };
    }
    switch (activeNav) {
      case "favorites":
        return {
          title: "Favorites",
          subtitle: "Notes you've starred for quick access.",
        };
      case "trash":
        return {
          title: "Trash",
          subtitle:
            "Deleted notes are kept here until you remove them for good.",
        };
      case "all":
        return {
          title: "All Notes",
          subtitle: "Every note you've written, in one place.",
        };
      default:
        return {
          title: "Dashboard",
          subtitle: "Here's what's happening with your notes.",
        };
    }
  }, [activeNav, categoryParam]);

  const statCards = [
    {
      label: "Total Notes",
      value: stats.totalNotes,
      icon: FileText,
      accent: "bg-indigo-100 text-indigo-600",
    },
    {
      label: "Favorites",
      value: stats.favorites,
      icon: Star,
      accent: "bg-emerald-100 text-emerald-600",
    },
    {
      label: "Categories",
      value: stats.categories,
      icon: Folder,
      accent: "bg-amber-100 text-amber-600",
    },
    {
      label: "Trash Items",
      value: stats.trashItems,
      icon: Trash2,
      accent: "bg-rose-100 text-rose-600",
    },
  ];

  const initials = (user?.name || "U")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const showDashboardMode = !categoryParam && activeNav === "dashboard";

  return (
    <>
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
              const isActive = !categoryParam && activeNav === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    if (item.key === "categories") {
                      navigate("/categories");
                      return;
                    }
                    if (item.key === "tags") {
                      showNotice("Tags view is coming soon.", true);
                      return;
                    }
                    goToNav(item.key);
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
              onClick={() => showNotice("Cloud backup isn't implemented yet.", true)}
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
                  placeholder="Search notes..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
                <kbd className="text-[10px] font-medium text-slate-400 border border-slate-200 rounded px-1.5 py-0.5 bg-white">
                  Ctrl + K
                </kbd>
              </div>
            </div>

            <div className="flex items-center gap-4 ml-auto">
              <button
                onClick={() => showNotice("No new notifications.", true)}
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
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  {heading.title} {showDashboardMode && <span></span>}
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  {heading.subtitle}
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

            {showDashboardMode && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {statCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.label}
                      className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4"
                    >
                      <div
                        className={`w-11 h-11 rounded-lg flex items-center justify-center ${card.accent}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-900">
                          {card.value}
                        </p>
                        <p className="text-xs text-slate-500">{card.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {showDashboardMode ? "Recent Notes" : heading.title}
              </h2>

              <div className="flex items-center gap-2">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-600 outline-none"
                >
                  <option value="updated_desc">Sort by: Updated (New)</option>
                  <option value="updated_asc">Sort by: Updated (Old)</option>
                  <option value="created_desc">Sort by: Created (New)</option>
                  <option value="title_asc">Sort by: Title (A-Z)</option>
                </select>

                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setView("grid")}
                    className={`p-2 ${view === "grid" ? "bg-indigo-50 text-indigo-600" : "text-slate-400"}`}
                    aria-label="Grid view"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setView("list")}
                    className={`p-2 ${view === "list" ? "bg-indigo-50 text-indigo-600" : "text-slate-400"}`}
                    aria-label="List view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm px-4 py-2.5">
                {error}
              </div>
            )}

            {loading ? (
              <div
                className={`grid gap-4 ${view === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-1"}`}
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-40 rounded-xl border border-slate-200 bg-white animate-pulse"
                  />
                ))}
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl">
                <p className="text-slate-500 text-sm">
                  {activeNav === "trash" && !categoryParam
                    ? "Trash is empty."
                    : "No notes here yet."}
                </p>
                {!(activeNav === "trash" && !categoryParam) && (
                  <button
                    onClick={() => navigate("/notes/new")}
                    className="mt-3 text-indigo-600 text-sm font-medium hover:underline"
                  >
                    Create your first note
                  </button>
                )}
              </div>
            ) : (
              <div
                className={`grid gap-4 ${view === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-1"}`}
              >
                {notes.map((note, i) => {
                  const accent = ACCENTS[i % ACCENTS.length];
                  return (
                    <div
                      key={note._id}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/notes/${note._id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          navigate(`/notes/${note._id}`);
                        }
                      }}
                      className="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow flex flex-col outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent.icon}`}
                        >
                          <FileText className="w-4.5 h-4.5" size={18} />
                        </div>
                        {!(activeNav === "trash" && !categoryParam) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(note);
                            }}
                            aria-label="Toggle favorite"
                          >
                            <Star
                              className={`w-4.5 h-4.5 ${
                                note.isFavorite
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-slate-300"
                              }`}
                              size={18}
                            />
                          </button>
                        )}
                      </div>

                      <h3 className="font-semibold text-slate-800 mb-1 truncate">
                        {note.title}
                      </h3>
                      <p className="text-sm text-slate-500 line-clamp-2 flex-1 flex items-center gap-1.5">
                        {(() => {
                          const plainText = stripHtml(note.content);
                          if (plainText) return plainText;
                          if (note.content?.includes("<img")) {
                            return (
                              <>
                                <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                                Photo
                              </>
                            );
                          }
                          return "No content yet";
                        })()}
                      </p>

                      <div className="flex items-center justify-between mt-4">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded ${accent.badge}`}
                        >
                          {note.category}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">
                            {timeAgo(note.updatedAt)}
                          </span>
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId((id) =>
                                  id === note._id ? null : note._id,
                                );
                              }}
                              className="text-slate-400 hover:text-slate-600"
                              aria-label="More options"
                              aria-haspopup="menu"
                              aria-expanded={openMenuId === note._id}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {openMenuId === note._id && (
                              <div
                                role="menu"
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 bottom-6 w-32 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-10"
                              >
                                {activeNav === "trash" && !categoryParam ? (
                                  <>
                                    <button
                                      role="menuitem"
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        restoreFromTrash(note);
                                      }}
                                      className="w-full text-left px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                                    >
                                      Restore
                                    </button>
                                    <button
                                      role="menuitem"
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        deleteForever(note);
                                      }}
                                      className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                                    >
                                      Delete Forever
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    role="menuitem"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      moveToTrash(note);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50"
                                  >
                                    Move to Trash
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && notes.length > 0 && (
              <div className="flex items-center justify-between mt-6">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => loadNotes(Math.max(pagination.page - 1, 1))}
                    disabled={pagination.page <= 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {getPageWindow(pagination.page, pagination.totalPages).map((item, i) =>
                    item === "..." ? (
                      <span
                        key={`dots-${i}`}
                        className="w-8 h-8 flex items-center justify-center text-sm text-slate-400"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => loadNotes(item)}
                        aria-current={pagination.page === item ? "page" : undefined}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium ${
                          pagination.page === item
                            ? "bg-indigo-600 text-white"
                            : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}

                  <button
                    onClick={() =>
                      loadNotes(
                        Math.min(pagination.page + 1, pagination.totalPages),
                      )
                    }
                    disabled={pagination.page >= pagination.totalPages}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-sm text-slate-500">
                  Showing {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total,
                  )}{" "}
                  of {pagination.total} notes
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-note-title"
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-2xl">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 id="delete-note-title" className="text-lg font-semibold text-slate-800">
                  Delete Note
                </h2>
                <p className="text-sm text-slate-500">
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <p className="mt-5 text-slate-700">
              Are you sure you want to permanently delete
              <strong> "{selectedNote?.title}"</strong>?
            </p>
            <div className="flex justify-end gap-3 mt-8">
              <button
                ref={cancelDeleteRef}
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedNote(null);
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deleting ? "Deleting..." : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}
      <ProfilePanel
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onUpdate={setUser}
      />
    </>
  );
}
