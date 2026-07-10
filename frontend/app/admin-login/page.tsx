'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LayoutGrid } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore, type AuthUser } from '@/lib/auth';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

function decodeToken(token: string): AuthUser {
  const payload = JSON.parse(atob(token.split('.')[1]));
  return { id: payload.sub, email: payload.email, role: payload.role };
}

export default function AdminLoginPage() {
  const router = useRouter();
  const { setAuth, token, user } = useAuthStore();
  const [checking, setChecking] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const stored = token ?? (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    const storedUser = user ?? (() => {
      try {
        const u = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        return u ? JSON.parse(u) : null;
      } catch { return null; }
    })();
    if (stored && storedUser?.role === 'SUPER_ADMIN') {
      router.replace('/dashboard/admin');
    } else {
      setChecking(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      const res = await api.post<{ accessToken: string; refreshToken: string }>(
        '/auth/login',
        { email: data.email, password: data.password, role: 'SUPER_ADMIN' },
      );
      const { accessToken, refreshToken } = res.data;
      const decoded = decodeToken(accessToken);
      setAuth(accessToken, decoded, refreshToken);
      router.replace('/dashboard/admin');
    } catch {
      setServerError('Invalid admin credentials');
    }
  };

  if (checking) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#1a1a2e' }}
      >
        <svg className="h-8 w-8 animate-spin text-white/30" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#1a1a2e' }}
    >
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="rounded-2xl bg-white px-8 py-10 shadow-2xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl mb-3"
              style={{ backgroundColor: '#7C6FF7' }}
            >
              <LayoutGrid className="h-6 w-6 text-white" strokeWidth={1.75} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Gradify Admin</h1>
            <p className="mt-1 text-sm text-gray-400">Sign in to your admin account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                spellCheck={false}
                {...register('email')}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="admin@gradify.com"
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password')}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword
                    ? <EyeOff className="h-4 w-4" strokeWidth={1.75} />
                    : <Eye className="h-4 w-4" strokeWidth={1.75} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            {/* Server error */}
            {serverError && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-100 bg-red-50 px-4 py-3">
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-sm text-red-700">{serverError}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 w-full inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#7C6FF7' }}
            >
              {isSubmitting ? (
                <>
                  <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Gradify · Restricted Access
        </p>
      </div>
    </div>
  );
}
