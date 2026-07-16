export type UserRole = 'superadmin' | 'admin' | 'teacher' | 'student' | 'parent';

export interface AuthUser {
  id: string;
  userId?: string;
  name: string;
  email: string;
  role: UserRole;
  schoolId?: string;
  schoolCode?: string;
  schoolName?: string;
  lastLogin?: string;
  academicYear?: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
  role: "superadmin" | "admin" | "teacher" | "student" | "parent";
  schoolCode?: string;
  identifier?: string;
}

export interface AuthContextValue extends AuthState {
  login: (payload: LoginPayload) => Promise<void>;
  // Used by the dedicated Super Admin login page, which authenticates
  // against its own backend endpoint and just needs the resulting
  // token/user persisted into the same session storage as normal login.
  loginWithSession: (token: string, user: AuthUser) => void;
  logout: () => void;
}