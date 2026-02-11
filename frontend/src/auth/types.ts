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
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
  schoolCode?: string;
  role?: string;
}

export interface AuthContextValue extends AuthState {
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
}
