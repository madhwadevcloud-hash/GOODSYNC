import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ShieldAlert } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { superAdminLoginApi } from "../api/auth";

// This page is rendered directly at /super-admin whenever there's no
// authenticated Super Admin session (see SuperAdminGate in App.tsx). It has
// no nav links pointing to it — people get here by typing the URL.
export default function SuperAdminLogin() {
  const { loginWithSession } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Bypasses the normal loginApi entirely — talks straight to the
      // dedicated /auth/superadmin-login backend endpoint.
      const { token, user } = await superAdminLoginApi(email.trim(), password);
      loginWithSession(token, user);

      navigate("/super-admin", { replace: true });
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
            <ShieldAlert className="w-6 h-6 text-red-400" />
          </div>
          <h1 className="text-lg font-semibold text-slate-100">Super Admin Access</h1>
          <p className="text-xs text-slate-500 mt-1">Restricted. All access attempts are logged.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Email</label>
            <input
              type="email"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500/60"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400">Password</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 pr-10 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500/60"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                aria-label={showPass ? "Hide password" : "Show password"}
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && <div className="text-xs text-red-400">{error}</div>}

          <button
            disabled={loading}
            className="w-full h-11 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-500 disabled:opacity-60 transition"
          >
            {loading ? "Verifying…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
