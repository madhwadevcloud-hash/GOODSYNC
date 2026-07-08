import React, { useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { forgotTeacherPasswordApi } from "../api/auth";

export default function TeacherForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await forgotTeacherPasswordApi(email.trim());
      setMessage(
        data.message ||
          "If an account with this email exists, a password reset link has been sent."
      );
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-login-gradient relative overflow-hidden">
      {/* subtle floating emojis, matching login page */}
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
                Forgot Password?
              </span>
            </h1>
            <p className="text-slate-500 text-sm sm:text-base">
              Enter your Teacher Portal email and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          {submitted ? (
            <div className="space-y-5">
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-800">{message}</p>
              </div>
              <p className="text-xs text-slate-500 text-center">
                Didn&apos;t get the email? Check your spam folder, or{" "}
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="text-violet-600 hover:text-violet-800 font-medium"
                >
                  try again
                </button>
                .
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4 sm:space-y-5">
              <div className="space-y-1">
                <label className="text-sm text-slate-600">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    className="w-full border border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 text-sm sm:text-base"
                    placeholder="your.email@school.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="username"
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Mail className="w-4 h-4" />
                  </span>
                </div>
              </div>

              {error && <div className="text-sm text-red-600">{error}</div>}

              <button
                disabled={loading}
                className="w-full h-10 sm:h-12 rounded-xl text-white text-sm sm:text-base font-medium shadow-lg disabled:opacity-60
                  bg-gradient-to-r from-violet-600 via-fuchsia-500 to-blue-500 hover:opacity-95 transition"
              >
                {loading ? "Sending reset link…" : "Send Reset Link"}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
