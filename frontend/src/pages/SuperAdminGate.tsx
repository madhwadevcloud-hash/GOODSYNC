import React from "react";
import { useAuth } from "../auth/AuthContext";
import { SuperAdminApp } from "../roles/superadmin/SuperAdminApp";
import SuperAdminLogin from "./SuperAdminLogin";

// Lives at the single public route "/super-admin/*". It does its own
// auth + role check (equivalent to ProtectedRoute + RoleGuard combined)
// so that the SAME url can show:
//   - the login form, if nobody is signed in (or a non-superadmin is)
//   - the actual Super Admin app, once a valid superadmin session exists
// This is what lets typing /super-admin directly open the login page.
export default function SuperAdminGate() {
  const { user, token, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading…</div>;
  }

  if (!token || !user || user.role !== "superadmin") {
    return <SuperAdminLogin />;
  }

  return <SuperAdminApp />;
}