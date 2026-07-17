import React, { useState } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Eye, EyeOff, Shield } from "lucide-react";
import { resetPasswordApi } from "../api/auth";

export default function ResetPassword() {
  const { token: pathToken } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const token = pathToken || searchParams.get("token") || "";
  const isStudent = location.pathname.includes("/student/reset-password") || !pathToken;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [schoolCode, setSchoolCode] = useState(searchParams.get("schoolCode") || "");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&]).{8,}$/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!password || !confirmPassword) {
      setError("All fields are required");
      return;
    }
    if (!isStudent && !schoolCode) {
      setError("School Code is required for admin accounts");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!passwordRegex.test(password)) {
      setError("Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character.");
      return;
    }
    if (!token) {
      setError("Invalid or expired password reset session");
      return;
    }

    setLoading(true);

    try {
      // For student, we pass empty string for schoolCode, backend matches the token in collection
      const res = await resetPasswordApi(token, password, isStudent ? "" : schoolCode.trim().toUpperCase());
      setMessage(res.message || "Password has been reset successfully!");
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 sm:p-6 lg:p-8">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-violet-200 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-fuchsia-200 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob animation-delay-2000"></div>
      </div>

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border border-slate-100">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center text-white shadow-lg shadow-violet-200 mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-600 via-fuchsia-500 to-blue-500 bg-clip-text text-transparent">
            Reset Password
          </h2>
          <p className="text-sm text-slate-500 text-center mt-1">
            {isStudent ? "Create a secure new password for your student portal." : "Create a secure new password for your account."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isStudent && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                School Code
              </label>
              <input
                type="text"
                required
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 text-sm"
                placeholder="e.g. CCHS"
                value={schoolCode}
                onChange={(e) => setSchoolCode(e.target.value)}
                disabled={loading || !!message}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                required
                className="w-full border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 text-sm"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || !!message}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPass ? "text" : "password"}
                required
                className="w-full border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 text-sm"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading || !!message}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p className="font-semibold mb-2 text-slate-700">
              Password Requirements
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-500">
              <li>Minimum 8 characters</li>
              <li>At least one uppercase letter</li>
              <li>At least one lowercase letter</li>
              <li>At least one number</li>
              <li>At least one special character</li>
            </ul>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100">
              {error}
            </div>
          )}

          {message && (
            <div className="p-3 bg-green-50 text-green-700 text-xs rounded-xl border border-green-100">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !!message}
            className="w-full h-11 rounded-xl text-white text-sm font-semibold shadow-lg shadow-violet-100 disabled:opacity-60
              bg-gradient-to-r from-violet-600 via-fuchsia-500 to-blue-500 hover:opacity-95 transition"
          >
            {loading ? "Resetting Password…" : "Reset Password"}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium underline"
            >
              Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
