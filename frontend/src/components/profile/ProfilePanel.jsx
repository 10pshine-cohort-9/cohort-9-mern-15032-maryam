import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../utils/apiRequest";
import { X, User as UserIcon, Mail, Clock, Camera, LogOut, Loader2 } from "lucide-react";

function getStoredUser() {
  const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStoredUser(user) {
  if (localStorage.getItem("user")) {
    localStorage.setItem("user", JSON.stringify(user));
  } else if (sessionStorage.getItem("user")) {
    sessionStorage.setItem("user", JSON.stringify(user));
  }
}

function formatJoinDate(dateLike) {
  if (!dateLike) return "—";
  return new Date(dateLike).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function resizeImageFile(file, maxSize = 300, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That doesn't look like a valid image."));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function ProfilePanel({ open, onClose, onUpdate }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(getStoredUser());
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [savingField, setSavingField] = useState(false);

  const startEdit = (field, currentValue) => {
    setEditingField(field);
    setEditValue(currentValue || "");
    setError("");
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const saveEdit = async () => {
    if (!editValue.trim()) {
      setError(editingField === "email" ? "Email is required." : "Name is required.");
      return;
    }
    setSavingField(true);
    setError("");
    try {
      const data = await apiRequest("/auth/profile", {
        method: "PUT",
        body: JSON.stringify({ [editingField]: editValue.trim() }),
      });
      setProfile(data.user);
      saveStoredUser(data.user);
      onUpdate?.(data.user);
      setEditingField(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingField(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    apiRequest("/auth/me")
      .then((data) => {
        if (cancelled) return;
        setProfile(data.user);
        saveStoredUser(data.user);
        onUpdate?.(data.user);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const handlePickPhoto = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; 
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    setUploading(true);
    setError("");
    try {
      const resized = await resizeImageFile(file);
      const data = await apiRequest("/auth/avatar", {
        method: "PUT",
        body: JSON.stringify({ avatar: resized }),
      });
      setProfile(data.user);
      saveStoredUser(data.user);
      onUpdate?.(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    navigate("/");
  };

  const initials = (profile?.name || "U")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-panel-title"
        className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-[slideIn_0.2s_ease-out]"
      >
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div>
            <h2 id="profile-panel-title" className="text-xl font-bold text-slate-900">
              My Profile
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage your account information.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {error && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm px-4 py-2.5">
              {error}
            </div>
          )}

          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              <div className="w-28 h-28 rounded-full bg-indigo-600 text-white text-3xl font-semibold flex items-center justify-center overflow-hidden">
                {profile?.avatar ? (
                  <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <button
                onClick={handlePickPhoto}
                disabled={uploading}
                aria-label="Change profile photo"
                className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md hover:bg-indigo-700 disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <p className="text-xs text-slate-400 mt-3">
              {profile?.avatar ? "Click the camera icon to change your photo" : "Add a photo, or keep your initials"}
            </p>
          </div>

          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            User Information
          </h3>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-3 py-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <UserIcon className="w-4.5 h-4.5 text-indigo-600" size={18} />
                </div>
                {editingField === "name" ? (
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") cancelEdit();
                      }}
                      className="flex-1 min-w-0 text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-400"
                    />
                    <button
                      onClick={saveEdit}
                      disabled={savingField}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button onClick={cancelEdit} className="text-xs text-slate-400 hover:text-slate-600">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-400">Full Name</p>
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {profile?.name || "—"}
                      </p>
                    </div>
                    <button
                      onClick={() => startEdit("name", profile?.name)}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700 shrink-0"
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3 py-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <Mail className="w-4.5 h-4.5 text-indigo-600" size={18} />
                </div>
                {editingField === "email" ? (
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <input
                      autoFocus
                      type="email"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") cancelEdit();
                      }}
                      className="flex-1 min-w-0 text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-400"
                    />
                    <button
                      onClick={saveEdit}
                      disabled={savingField}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button onClick={cancelEdit} className="text-xs text-slate-400 hover:text-slate-600">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-400">Email Address</p>
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {profile?.email || "—"}
                      </p>
                    </div>
                    <button
                      onClick={() => startEdit("email", profile?.email)}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700 shrink-0"
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3 py-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <Clock className="w-4.5 h-4.5 text-indigo-600" size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">Member Since</p>
                  <p className="text-sm font-medium text-slate-800">
                    {formatJoinDate(profile?.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 pt-2">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 bg-rose-50 text-rose-600 text-sm font-medium py-3 rounded-lg hover:bg-rose-100"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
