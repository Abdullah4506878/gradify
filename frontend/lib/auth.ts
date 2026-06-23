import { create } from 'zustand';

export type UserRole = 'MANAGER' | 'SUPERVISOR' | 'STUDENT';

export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  user:
    typeof window !== 'undefined'
      ? (() => {
          try {
            const stored = localStorage.getItem('user');
            if (!stored || stored === 'undefined' || stored === 'null') return null;
            return JSON.parse(stored);
          } catch {
            localStorage.removeItem('user');
            return null;
          }
        })()
      : null,
  setAuth: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    document.cookie = `auth_token=${token}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    document.cookie = 'auth_token=; path=/; max-age=0';
    set({ token: null, user: null });
  },
}));
