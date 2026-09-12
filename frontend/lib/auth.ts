import { create } from 'zustand';

export type UserRole = 'MANAGER' | 'SUPERVISOR' | 'STUDENT' | 'SUPER_ADMIN';

export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
  isFirstLogin?: boolean;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser, refreshToken?: string) => void;
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
  setAuth: (token, user, refreshToken?) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    document.cookie = `auth_token=${token}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;
    // Lets the edge proxy gate first-login users without decoding the JWT body.
    document.cookie = `first_login=${user.isFirstLogin ? '1' : '0'}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    document.cookie = 'auth_token=; path=/; max-age=0';
    document.cookie = 'first_login=; path=/; max-age=0';
    set({ token: null, user: null });
  },
}));
