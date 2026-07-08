import React, { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, GraduationCap, CheckCircle2, XCircle, Check, X } from "lucide-react";
import { resetTeacherPasswordApi } from "../api/auth";
import { checkPasswordStrength } from "../utils/passwordStrength";

export default function TeacherResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token") || "";
  const schoolCode = searchParams.get("schoolCode") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const strength = useMemo(() => checkPasswordStrength(newPassword), [newPassword]);
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const missingLinkParams = !token || !schoolCode;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!strength.valid) {
      setError("Please choose a stronger password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const data = await resetTeacherPasswordApi({
        token,
        schoolCode,
        newPassword,
        confirmPassword,
      });
      setSuccess(true);
      setTimeout(() => navigate("/login", { replace: true }), 2500);
      void data;
    } catch (err: any) {
      setError(err?.message || "Failed to reset password. Please request a new link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-login-gradient relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="floating-emoji left-[5%] top-[12%]">⭐</div>
        <div className="floating-emoji left-[94%] top-[18%]">💖</div>
        <div className="floating-emoji left-[8%] top-[70%]">✨</div>
        <div className="floating-emoji left-[96%] top-[75%]">💚</div>
      </div>

      <div className="container mx-auto px-4 py-6 sm:py-12">
        <div className="max-w-md mx-auto bg-white/90 backdrop-blur shadow-2xl rounded-2xl sm:rounded-3xl px-4 sm:px-6 md:px-10 py-6 sm:py-10">
          <div className="flex flex-col items-center text-center space-y-3 mb-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-violet-100 text-violet-700">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold">
              <span className="bg-gradient-to-r from-fuchsia-500 via-violet-500 to-blue-500 bg-clip-text text-transparent">
                Reset Password
              </span>
            </h1>
            <p className="text-slate-500 text-sm sm:text-base">
              Choose a new password for your Teacher Portal account.
            </p>
          </div>

          {missingLinkParams ? (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">
                This reset link looks incomplete or invalid. Please request a new one from the login page.
              </p>
            </div>
          ) : success ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-800">
                  Your password has been reset successfully. Redirecting you to login…
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4 sm:space-y-5">
              <div className="space-y-1">
                <label className="text-sm text-slate-600">New Password</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    className="w-full border border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 text-sm sm:text-base"
                    placeholder="Enter a new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {newPassword.length > 0 && (
                <div className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                  {strength.rules.map((rule) => (
                    <div
                      key={rule.label}
                      className={`flex items-center gap-2 text-xs ${
                        rule.passed ? "text-emerald-600" : "text-slate-400"
                      }`}
                    >
                      {rule.passed ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      {rule.label}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm text-slate-600">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    className="w-full border border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 text-sm sm:text-base"
                    placeholder="Re-enter the new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="text-xs text-red-600">Passwords do not match.</p>
                )}
              </div>

              {error && <div className="text-sm text-red-600">{error}</div>}

              <button
                disabled={loading}
                className="w-full h-10 sm:h-12 rounded-xl text-white text-sm sm:text-base font-medium shadow-lg disabled:opacity-60
                  bg-gradient-to-r from-violet-600 via-fuchsia-500 to-blue-500 hover:opacity-95 transition"
              >
                {loading ? "Resetting…" : "Reset Password"}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="text-xs sm:text-sm text-slate-600 hover:text-slate-900">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
