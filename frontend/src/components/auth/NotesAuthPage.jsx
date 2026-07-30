import React, { useState, useEffect } from "react";
import API_URL from "../../config/api";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Search,
  Plus,
  ShieldCheck,
  Zap,
  Cloud,
} from "lucide-react";

export default function NotesAuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    general: "",
  });
  const [alert, setAlert] = useState({
    type: "",
    title: "",
    message: "",
  });
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    remember: false,
  });

  const isLogin = mode === "login";
 useEffect(() => {
    const token =
        localStorage.getItem("token") ||
        sessionStorage.getItem("token");
    if (token) {
        navigate("/dashboard");
    }
}, [navigate]);
  const update = (key) => (e) => {
    setForm((f) => ({
      ...f,
      [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

    setErrors((prev) => ({
      ...prev,
      [key]: "",
      general: "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({
      name: "",
      email: "",
      password: "",
      confirm: "",
      general: "",
    });
    setSuccess("");
    setAlert({
      type: "",
      title: "",
      message: "",
    });
    setLoading(true);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!isLogin) {
      if (!form.name.trim()) {
        setLoading(false);
        setErrors((prev) => ({
          ...prev,
          name: "Full name is required.",
        }));
        return;
      }

      if (form.name.trim().length < 3) {
        setLoading(false);
        setErrors((prev) => ({
          ...prev,
          name: "Full name must contain at least 3 characters.",
        }));
        return;
      }

      if (!form.email.trim()) {
        setLoading(false);
        setErrors((prev) => ({
          ...prev,
          email: "Email address is required.",
        }));
        return;
      }

      if (!emailRegex.test(form.email)) {
        setLoading(false);
        setErrors((prev) => ({
          ...prev,
          email: "Please enter a valid email address.",
        }));
        return;
      }

      if (!form.password) {
        setLoading(false);
        setErrors((prev) => ({
          ...prev,
          password: "Password is required.",
        }));
        return;
      }

      if (form.password.length < 8) {
        setLoading(false);
        setErrors((prev) => ({
          ...prev,
          password: "Password must be at least 8 characters long.",
        }));
        return;
      }

      if (!/[A-Z]/.test(form.password)) {
        setLoading(false);
        setErrors((prev) => ({
          ...prev,
          password: "Password must contain at least one uppercase letter.",
        }));
        return;
      }

      if (!/[a-z]/.test(form.password)) {
        setLoading(false);
        setErrors((prev) => ({
          ...prev,
          password: "Password must contain at least one lowercase letter.",
        }));
        return;
      }

      if (!/\d/.test(form.password)) {
        setLoading(false);
        setErrors((prev) => ({
          ...prev,
          password: "Password must contain at least one number.",
        }));
        return;
      }

      if (!/[!@#$%^&*(),.?":{}|<>]/.test(form.password)) {
        setLoading(false);
        setErrors((prev) => ({
          ...prev,
          password: "Password must contain at least one special character.",
        }));
        return;
      }

      if (!form.confirm) {
        setLoading(false);
        setErrors((prev) => ({
          ...prev,
          confirm: "Please confirm your password.",
        }));
        return;
      }

      if (form.password !== form.confirm) {
        setLoading(false);
        setErrors((prev) => ({
          ...prev,
          confirm: "Passwords do not match.",
        }));
        return;
      }
    }

    if (isLogin) {
      if (!form.email.trim()) {
        setLoading(false);
        setErrors((prev) => ({
          ...prev,
          email: "Email address is required.",
        }));
        return;
      }

      if (!emailRegex.test(form.email)) {
        setLoading(false);
        setErrors((prev) => ({
          ...prev,
          email: "Please enter a valid email address.",
        }));
        return;
      }

      if (!form.password) {
        setLoading(false);
        setErrors((prev) => ({
          ...prev,
          password: "Password is required.",
        }));
        return;
      }
    }

    const url = isLogin ? `${API_URL}/auth/login` : `${API_URL}/auth/signup`;

    const body = isLogin
      ? {
          email: form.email,
          password: form.password,
        }
      : {
          name: form.name,
          email: form.email,
          password: form.password,
        };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        if (isLogin) {
          const storage = form.remember ? localStorage : sessionStorage;
          storage.setItem("token", data.token);
          storage.setItem("user", JSON.stringify(data.user));
          setAlert({
            type: "success",
            title: "Success",
            message: "Login successful!",
          });
          navigate("/dashboard");
        } else {
          setAlert({
            type: "success",
            title: "Success",
            message: "Account created successfully!",
          });
          setMode("login");
          setForm({
            name: "",
            email: "",
            password: "",
            confirm: "",
            remember: false,
          });
        }
      } else {
        setAlert({
          type: "error",
          title: "Authentication Failed",
          message: data.message,
        });
      }
    } catch (err) {
      setAlert({
        type: "error",
        title: "Server Error",
        message: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const notes = [
    {
      title: "Project Ideas",
      time: "2m ago",
      desc: "Brainstorming ideas for the new project...",
      color: "bg-blue-100 text-blue-500",
    },
    {
      title: "Meeting Notes",
      time: "1h ago",
      desc: "Discussed project timeline and deliverables...",
      color: "bg-emerald-100 text-emerald-500",
    },
    {
      title: "Shopping List",
      time: "1d ago",
      desc: "Milk, Bread, Eggs, Fruits, and Vegetables",
      color: "bg-amber-100 text-amber-500",
    },
    {
      title: "Daily Journal",
      time: "2d ago",
      desc: "Today was a productive day. Learned a lot...",
      color: "bg-violet-100 text-violet-500",
    },
  ];

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-100 p-4 sm:p-8">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden">
        <div className="relative md:w-[46%] bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 text-white px-8 py-10 sm:px-10 sm:py-12 overflow-hidden">
          <div className="absolute top-8 right-8 grid grid-cols-6 gap-2 opacity-30">
            {Array.from({ length: 24 }).map((_, i) => (
              <span key={i} className="w-1 h-1 rounded-full bg-white" />
            ))}
          </div>
          <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-white/10" />
          <div className="absolute top-1/3 -right-10 w-40 h-40 rounded-full bg-white/10" />

          <div className="relative">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shadow-md">
                <FileText
                  className="w-6 h-6 text-indigo-600"
                  strokeWidth={2.25}
                />
              </div>
              <div>
                <p className="font-semibold text-lg leading-tight">Notes App</p>
                <p className="text-xs text-indigo-100">
                  Your notes, organized and always accessible.
                </p>
              </div>
            </div>

            <div className="relative bg-white rounded-xl shadow-lg p-4 mb-10 text-slate-800">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-sm">My Notes</p>
                <Search className="w-4 h-4 text-slate-400" />
              </div>
              <div className="space-y-3">
                {notes.map((n) => (
                  <div key={n.title} className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${n.color}`}
                    >
                      <FileText className="w-4 h-4" strokeWidth={2.25} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">
                          {n.title}
                        </p>
                        <span className="text-[11px] text-slate-400 shrink-0">
                          {n.time}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">
                        {n.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                aria-label="New note"
                className="absolute -bottom-4 -right-4 w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <ul className="space-y-5">
              <li className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Secure &amp; Private</p>
                  <p className="text-xs text-indigo-100">
                    Your notes are encrypted and kept safe.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Fast &amp; Reliable</p>
                  <p className="text-xs text-indigo-100">
                    Access your notes instantly, anytime.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                  <Cloud className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Anywhere Access</p>
                  <p className="text-xs text-indigo-100">
                    Your notes sync across all your devices.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="md:w-[54%] px-8 py-10 sm:px-12 sm:py-12 flex flex-col justify-center">
          <div className="flex border-b border-slate-200 mb-8">
            {["login", "signup"].map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setErrors({
                    name: "",
                    email: "",
                    password: "",
                    confirm: "",
                    general: "",
                  });
                  setAlert({
                    type: "",
                    title: "",
                    message: "",
                  });
                  setSuccess("");
                  setForm({
                    name: "",
                    email: "",
                    password: "",
                    confirm: "",
                    remember: false,
                  });
                }}
                className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${
                  mode === m
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                {m === "login" ? "Log In" : "Sign Up"}
              </button>
            ))}
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900">
              {isLogin ? "Welcome back! " : "Create your account"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {isLogin
                ? "Log in to continue to your account"
                : "Sign up to start saving your notes"}
            </p>
          </div>
          {alert.message && (
            <div
              className={`mb-4 flex items-start gap-3 rounded-lg border p-4 ${
                alert.type === "error"
                  ? "border-red-300 bg-red-50 text-red-800"
                  : alert.type === "warning"
                    ? "border-amber-300 bg-amber-50 text-amber-800"
                    : "border-green-300 bg-green-50 text-green-800"
              }`}
            >
              <div>
                <p className="font-semibold">{alert.title}</p>
                <p className="text-sm">{alert.message}</p>
              </div>
            </div>
          )}
          {success && (
            <div className="mb-4 rounded bg-green-100 border border-green-400 text-green-700 p-3">
              {success}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <Field
                label="Full Name"
                icon={<User className="w-4 h-4" />}
                type="text"
                placeholder="Enter your name"
                value={form.name}
                onChange={update("name")}
                error={errors.name}
              />
            )}

            <Field
              label="Email Address"
              icon={<Mail className="w-4 h-4" />}
              type="text"
              placeholder="Enter your email"
              value={form.email}
              onChange={update("email")}
              error={errors.email}
            />

            <Field
              label="Password"
              icon={<Lock className="w-4 h-4" />}
              type={showPw ? "text" : "password"}
              placeholder="Enter your password"
              value={form.password}
              onChange={update("password")}
              error={errors.password}
              trailing={
                <button
                  type="button"
                  aria-label={showPw ? "Hide password" : "Show password"}
                  onClick={() => setShowPw((s) => !s)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  {showPw ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              }
              rightLabel={
                isLogin && (
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setSuccess("");
                      setAlert({
                        type: "warning",
                        title: "Feature Unavailable",
                        message:
                          "Forgot Password functionality is not implemented yet.",
                      });
                    }}
                    className="text-xs font-medium text-indigo-600 hover:underline"
                  >
                    Forgot password?
                  </a>
                )
              }
            />

            {!isLogin && (
              <Field
                label="Confirm Password"
                icon={<Lock className="w-4 h-4" />}
                type={showPw2 ? "text" : "password"}
                placeholder="Re-enter your password"
                value={form.confirm}
                onChange={update("confirm")}
                error={errors.confirm}
                trailing={
                  <button
                    type="button"
                    aria-label={showPw2 ? "Hide password" : "Show password"}
                    onClick={() => setShowPw2((s) => !s)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    {showPw2 ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                }
              />
            )}
            {isLogin && (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.remember}
                  onChange={update("remember")}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Remember me
              </label>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium py-3 rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Please wait..."
                : isLogin
                  ? "Log In"
                  : "Create Account"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px bg-slate-200 flex-1" />
            <span className="text-xs text-slate-400">or continue with</span>
            <div className="h-px bg-slate-200 flex-1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setSuccess("");
                setAlert({
                  type: "warning",
                  title: "Feature Unavailable",
                  message: "Google Login is not implemented yet.",
                });
              }}
              className="flex items-center justify-center gap-2 border border-slate-200 rounded-lg py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <GoogleIcon className="w-4 h-4" />
              Google
            </button>
            <button
              type="button"
              onClick={() => {
                setSuccess("");
                setAlert({
                  type: "warning",
                  title: "Feature Unavailable",
                  message: "GitHub Login is not implemented yet.",
                });
              }}
              className="flex items-center justify-center gap-2 border border-slate-200 rounded-lg py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <GithubIcon className="w-4 h-4" />
              GitHub
            </button>
          </div>

          <p className="text-center text-sm text-slate-500 mt-6">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => {
                setMode(isLogin ? "signup" : "login");
                setErrors({
                  name: "",
                  email: "",
                  password: "",
                  confirm: "",
                  general: "",
                });
                setAlert({
                  type: "",
                  title: "",
                  message: "",
                });
                setSuccess("");
                setForm({
                  name: "",
                  email: "",
                  password: "",
                  confirm: "",
                  remember: false,
                });
              }}
              className="text-indigo-600 font-medium hover:underline"
            >
              {isLogin ? "Sign up" : "Log in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon, trailing, rightLabel, error, ...inputProps }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        {rightLabel}
      </div>
      <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-colors">
        <span className="text-slate-400">{icon}</span>
        <input
          {...inputProps}
          className="w-full py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
        />
        {trailing}
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}

function GoogleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.54-5.17 3.54-8.65z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.92l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.11 0-5.75-2.1-6.69-4.92H1.3v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.31 14.32A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.58.4-2.32V6.59H1.3A11.98 11.98 0 0 0 0 12c0 1.93.46 3.76 1.3 5.41l4.01-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.23 0 12 0 7.31 0 3.26 2.7 1.3 6.59l4.01 3.09C6.25 6.86 8.89 4.76 12 4.76z"
      />
    </svg>
  );
}

function GithubIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55v-2.15c-3.2.7-3.88-1.36-3.88-1.36-.52-1.34-1.28-1.7-1.28-1.7-1.04-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.77.11 3.06.74.8 1.19 1.83 1.19 3.09 0 4.43-2.7 5.4-5.27 5.69.42.36.78 1.07.78 2.16v3.2c0 .3.2.65.79.55A10.51 10.51 0 0 0 23.5 12c0-6.27-5.23-11.5-11.5-11.5z" />
    </svg>
  );
}
