import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthContextValue, AuthState, LoginPayload, AuthUser, UserRole } from './types';
import { loginApi } from '../api/auth';

const STORAGE_KEY = 'erp.auth';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeRole(role: any): UserRole | null {
  if (!role) return null;
  const r = String(role).toLowerCase().replace(/\s+/g, '').replace(/[-_]/g, '');
  // Map common variants
  if (r === 'superadmin' || r === 'superadministrator' || r === 'superadm') return 'superadmin';
  if (r === 'admin' || r === 'administrator') return 'admin';
  if (r === 'teacher' || r === 'instructor') return 'teacher';
  if (r === 'student' || r === 'pupil' || r === 'learner') return 'student';
  if (r === 'parent' || r === 'guardian') return 'parent';
  return null;
}

function normalizeState(raw: AuthState | undefined | null): AuthState {
  if (!raw) return { user: null, token: null, loading: false };
  const next: AuthState = { ...raw };
  if (next.user) {
    const norm = normalizeRole((next.user as any).role);
    if (!norm) {
      console.warn('[AUTH] Invalid role in persisted state, clearing auth');
      return { user: null, token: null, loading: false };
    }
    // Ensure name is a string
    const nameVal: any = (next.user as any).name;
    const displayName = typeof nameVal === 'string' ? nameVal : (next.user.email || 'User');
    
    // Extract userId from JWT token if missing from user object
    let userId = (next.user as any).userId;
    if (!userId && next.token) {
      try {
        // Decode JWT token to extract userId
        const tokenPayload = JSON.parse(atob(next.token.split('.')[1]));
        if (tokenPayload.userId) {
          userId = tokenPayload.userId;
          console.log('[AUTH] Extracted userId from JWT token:', userId);
        }
      } catch (error) {
        console.warn('[AUTH] Failed to decode JWT token:', error);
      }
    }
    
    // Preserve all user fields including userId
    next.user = { 
      ...next.user, 
      role: norm, 
      name: displayName,
      userId: userId // Use extracted or existing userId
    } as AuthUser;
    
    console.log('[AUTH] Normalized user with userId:', next.user.userId);
  }
  next.loading = false;
  return next;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, token: null, loading: true });

  const persist = useCallback((next: AuthState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    
    // Also store the school code separately for easier access
    if (next.user?.schoolCode) {
      localStorage.setItem('erp.schoolCode', next.user.schoolCode);
    } else {
      localStorage.removeItem('erp.schoolCode');
    }
  }, []);

  useEffect(() => {
    console.log('[AUTH] Initializing auth context...');
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AuthState;
        const normalized = normalizeState(parsed);
        console.log('[AUTH] Restored from localStorage:', { user: normalized.user?.email, role: normalized.user?.role, hasToken: !!normalized.token });
        setState(normalized);
        persist(normalized);
      } catch (error) {
        console.error('[AUTH] Failed to parse localStorage data:', error);
        setState((s) => ({ ...s, loading: false }));
      }
    } else {
      console.log('[AUTH] No auth data in localStorage, starting fresh');
      setState((s) => ({ ...s, loading: false }));
    }
  }, [persist]);

  const login = useCallback(async (payload: LoginPayload) => {
    console.log('[AUTH] Login attempt:', payload.email);
    try {
      const { token, user } = await loginApi(payload);
      const normalized = normalizeState({ user, token, loading: false });
      console.log('[AUTH] Login successful:', { user: normalized.user?.email, role: normalized.user?.role });
      setState(normalized);
      persist(normalized);
    } catch (error) {
      console.error('[AUTH] Login failed:', error);
      throw error;
    }
  }, [persist]);

  const logout = useCallback(() => {
    console.log('[AUTH] Logging out');
    const next: AuthState = { user: null, token: null, loading: false };
    setState(next);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('erp.schoolCode');
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ ...state, login, logout }), [state, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // Try to restore from localStorage as fallback
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const fallbackData = normalizeState(JSON.parse(raw) as AuthState);
        console.warn('useAuth used outside AuthProvider, using fallback from localStorage');
        return {
          ...fallbackData,
          loading: false,
          login: async () => { throw new Error('Cannot login outside AuthProvider'); },
          logout: () => { localStorage.removeItem(STORAGE_KEY); }
        };
      } catch (err) {
        console.error('Failed to parse auth data from localStorage', err);
      }
    }
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

export function useRole(): AuthUser['role'] | null {
  const { user } = useAuth();
  return user?.role ?? null;
}
