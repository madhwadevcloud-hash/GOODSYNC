import React, { useMemo, useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Shield, GraduationCap, Settings, Users, X, CheckCircle, AlertCircle } from "lucide-react";
import { getDemoCredentialsApi, forgotPasswordApi } from "../api/auth";

type RoleKey = "superadmin" | "admin" | "teacher" | "student";

const initialRoleMeta: Record<
  RoleKey,
  { title: string; subtitle: string; icon: React.ReactNode; demoEmail: string; demoPass: string }
> = {
  superadmin: {
    title: "Super Admin",
    subtitle: "All-powerful ruler",
    icon: <Shield className="w-5 h-5" />,
    demoEmail: "",
    demoPass: "",
  },
  admin: {
    title: "Admin",
    subtitle: "System wizard",
    icon: <Settings className="w-5 h-5" />,
    demoEmail: "",
    demoPass: "",
  },
  teacher: {
    title: "Teacher",
    subtitle: "Knowledge master",
    icon: <GraduationCap className="w-5 h-5" />,
    demoEmail: "",
    demoPass: "",
  },
  student: {
    title: "Students & Parents",
    subtitle: "Student & Parent Portal",
    icon: <Users className="w-5 h-5" />,
    demoEmail: "",
    demoPass: "",
  },
};

export default function Login() {
  const { login } = useAuth();
  const [roleMeta, setRoleMeta] = useState(initialRoleMeta);
  const [selectedRole, setSelectedRole] = useState<RoleKey>("superadmin");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [schoolCode, setSchoolCode] = useState(""); // Start empty, will be set based on role
  const [remember, setRemember] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotSchoolCode, setForgotSchoolCode] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation() as any;

  // Fetch demo credentials on mount
  useEffect(() => {
    const fetchDemoCreds = async () => {
      const data = await getDemoCredentialsApi();
      if (data.success && data.superadmin) {
        setRoleMeta(prev => ({
          ...prev,
          superadmin: {
            ...prev.superadmin,
            demoEmail: data.superadmin.email,
            demoPass: data.superadmin.password
          }
        }));

        // If superadmin is currently selected, update the fields
        if (selectedRole === 'superadmin') {
          setIdentifier(data.superadmin.email);
          setPassword(data.superadmin.password);
        }
      }
    };
    fetchDemoCreds();
  }, []);

  // Set initial school code based on selected role
  useEffect(() => {
    if (selectedRole === 'superadmin') {
      setSchoolCode('');
    } else {
      setSchoolCode(''); // Keep blank for admin/teacher
    }
  }, [selectedRole]);

  // Auto-fill demo creds when role changes
  const onPickRole = (role: RoleKey) => {
    setSelectedRole(role);
    setIdentifier(roleMeta[role].demoEmail);
    setPassword(roleMeta[role].demoPass);
    setSchoolCode('');
  };

  const roleCards = useMemo(
    () =>
      (Object.keys(roleMeta) as RoleKey[]).map((rk) => {
        const active = rk === selectedRole;
        const m = roleMeta[rk];
        return (
          <button
            key={rk}
            type="button"
            onClick={() => onPickRole(rk)}
            className={[
              "flex-1 min-w-[120px] sm:min-w-[160px] p-3 sm:p-4 rounded-xl border transition shadow-sm text-left",
              active
                ? "border-violet-500 bg-white ring-2 ring-violet-200"
                : "border-slate-200 bg-white/80 hover:border-slate-300",
            ].join(" ")}
          >
            <div
              className={[
                "w-9 h-9 rounded-full mb-2 flex items-center justify-center",
                active ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-700",
              ].join(" ")}
              aria-hidden
            >
              {m.icon}
            </div>
            <div className="text-sm sm:font-medium text-slate-800 flex items-center gap-2">
              {m.title}
              {rk === "superadmin" && <span></span>}
              {rk === "admin" && <span></span>}
              {rk === "teacher" && <span></span>}
              {rk === "student" && <span></span>}
            </div>
            <div className="text-xs text-slate-500 hidden sm:block">{m.subtitle}</div>
          </button>
        );
      }),
    [selectedRole, roleMeta]
  );

  const openForgotModal = () => {
    setForgotIdentifier(identifier);
    setForgotSchoolCode(schoolCode);
    setForgotError(null);
    setForgotSuccess(null);
    setShowForgotModal(true);
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotError(null);
    setForgotSuccess(null);
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);

    if (!forgotIdentifier.trim()) {
      setForgotError(selectedRole === "student" ? "Please enter your Student ID" : "Please enter your email address");
      return;
    }
    if (!forgotSchoolCode.trim()) {
      setForgotError("School code is required");
      return;
    }

    setForgotLoading(true);
    try {
      const result = await forgotPasswordApi(forgotIdentifier.trim(), forgotSchoolCode.trim());
      setForgotSuccess(result.message);
    } catch (err: any) {
      setForgotError(err?.message || "Could not process your request. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Include school code if provided (not empty)
      let loginPayload;
      if (selectedRole === "student") {
          loginPayload = {
              email: identifier.trim(),   // Student ID goes here
              password,
              schoolCode: schoolCode.trim(),
              role: "student",
          };
      } else {
          loginPayload = schoolCode.trim()
              ? {
                  email: identifier.trim(),
                  password,
                  schoolCode: schoolCode.trim(),
                  role: selectedRole
              }
              : {
                  email: identifier.trim(),
                  password,
                  role: selectedRole
              };
      }

      await login(loginPayload);

      switch (selectedRole) {
        case "student":
          navigate("/student", { replace: true });
          break;

        case "teacher":
          navigate("/teacher", { replace: true });
          break;

        case "admin":
          navigate("/admin", { replace: true });
          break;

        case "superadmin":
        default:
          navigate("/", { replace: true });
          break;
      }
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-login-gradient relative overflow-hidden">
      {/* subtle floating emojis */}
      <div className="pointer-events-none absolute inset-0">
        <div className="floating-emoji left-[5%] top-[12%]">⭐</div>
        <div className="floating-emoji left-[94%] top-[18%]">💖</div>
        <div className="floating-emoji left-[8%] top-[70%]">✨</div>
        <div className="floating-emoji left-[96%] top-[75%]">💚</div>
      </div>

      <div className="container mx-auto px-4 py-6 sm:py-12">
        <div className="max-w-5xl mx-auto bg-white/90 backdrop-blur shadow-2xl rounded-2xl sm:rounded-3xl px-4 sm:px-6 md:px-12 py-6 sm:py-10">
          <div className="grid md:grid-cols-2 gap-6 sm:gap-10 items-center">
            {/* Left: Brand / Greeting */}
            <div className="space-y-3 sm:space-y-4 flex flex-col items-center text-center">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg bg-black/90">
                <img src="/logo.png" alt="School Logo" className="w-[120%] h-[120%] object-contain" />
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold">
                <span className="bg-gradient-to-r from-fuchsia-500 via-violet-500 to-blue-500 bg-clip-text text-transparent">
                  GOODSYNK ERP
                </span>
              </h1>
              <p className="text-slate-500 text-lg sm:text-xl md:text-2xl font-semibold">Welcome back, superstar! ✨</p>
            </div>

            {/* Right: Form */}
            <form onSubmit={onSubmit} className="space-y-4 sm:space-y-5">
              <div>
                <div className="text-sm font-medium text-slate-700 mb-2 sm:mb-3">Choose your adventure </div>
                <div className="flex flex-wrap gap-2 sm:gap-3">{roleCards}</div>
              </div>

              <div className="space-y-1">
                <label className="text-sm text-slate-600">
                  {selectedRole === "student" ? "Student ID" : "Email Address"}
                </label>
                <div className="relative">
                  <input
                    type={selectedRole === "student" ? "text" : "email"}
                    className="w-full border border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 text-sm sm:text-base"
                    placeholder={
                      selectedRole === "student"
                        ? "Enter Student ID (e.g. VK-S-1208)"
                        : "your.email@school.com"
                    }
                    value={identifier}
                    onChange={(e) => {
                      const value = e.target.value;

                      setIdentifier(
                        selectedRole === "student"
                          ? value.toUpperCase()
                          : value
                      );
                    }}
                    required
                    autoComplete="username"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"></span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm text-slate-600">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    className="w-full border border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 text-sm sm:text-base"
                    placeholder="Your super secret password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
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

              {/* School Code field - only for admin and teacher */}
              {selectedRole !== 'superadmin' && (
                <div className="space-y-1">
                  <label className="text-sm text-slate-600">
                    School Code
                  </label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 text-sm sm:text-base"
                    placeholder="Enter school code (e.g., 'p')"
                    value={schoolCode}
                    onChange={(e) => setSchoolCode(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                <label className="flex items-center gap-2 text-xs sm:text-sm text-slate-600">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={openForgotModal}
                  className="text-xs sm:text-sm text-slate-600 hover:text-slate-900 text-left sm:text-right"
                >
                  Forgot your password?
                </button>
              </div>

              {error && <div className="text-sm text-red-600">{error}</div>}

              <button
                disabled={loading}
                className="w-full h-10 sm:h-12 rounded-xl text-white text-sm sm:text-base font-medium shadow-lg disabled:opacity-60
                  bg-gradient-to-r from-violet-600 via-fuchsia-500 to-blue-500 hover:opacity-95 transition"
              >
                {loading ? "Signing you in…" : "Let's Go!"}
              </button>

              {/* hint for testers */}
              <p className="text-xs text-slate-500 text-center sm:text-left">
                Tip: Only SuperAdmin has auto-filled demo credentials. Admin and Teacher require manual entry.
              </p>
            </form>
          </div>
        </div>
      </div>

      {showForgotModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
            <button
              onClick={closeForgotModal}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-semibold text-slate-900 mb-1">Reset your password</h3>
            <p className="text-sm text-slate-600 mb-4">
              {selectedRole === "student"
                ? "Enter your Student ID and school code — We'll send a secure password reset link to your registered email address."
                : "Enter your email and school code — We'll send a secure password reset link to your email address."}
            </p>

            {forgotSuccess ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-700">{forgotSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
                {forgotError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700">{forgotError}</p>
                  </div>
                )}
                <input
                  type="text"
                  value={forgotIdentifier}
                  onChange={(e) =>
                    setForgotIdentifier(
                      selectedRole === "student"
                        ? e.target.value.toUpperCase()
                        : e.target.value
                    )
                  }
                  placeholder={selectedRole === "student" ? "Student ID" : "Email address"}
                  className="w-full border border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 uppercase focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 text-sm sm:text-base"
                  autoComplete="off"
                  required
                />
                <input
                  type="text"
                  value={forgotSchoolCode}
                  onChange={(e) => setForgotSchoolCode(e.target.value)}
                  placeholder="School code"
                  className="w-full border border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 text-sm sm:text-base"
                  required
                />
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full h-10 sm:h-12 rounded-xl text-white text-sm sm:text-base font-medium shadow-lg disabled:opacity-60 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-blue-500 hover:opacity-95 transition"
                >
                  {forgotLoading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
