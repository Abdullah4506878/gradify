'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { BarChart3, Users, Zap, Eye, EyeOff } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '@/lib/api';
import { useAuthStore, type AuthUser } from '@/lib/auth';

const schema = z.object({
  role: z.enum(['STUDENT', 'SUPERVISOR', 'MANAGER'], {
    error: 'Please select a role',
  }),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

function decodeToken(token: string): AuthUser {
  const payload = JSON.parse(atob(token.split('.')[1]));
  return { id: payload.sub, email: payload.email, role: payload.role };
}

const ROLE_REDIRECTS: Record<string, string> = {
  MANAGER: '/dashboard/manager',
  SUPERVISOR: '/dashboard/supervisor',
  STUDENT: '/dashboard/student',
};

const features = [
  {
    icon: BarChart3,
    title: 'Track Progress',
    description: 'Monitor FYP milestones and submission deadlines in real time.',
  },
  {
    icon: Users,
    title: 'Manage Groups',
    description: 'Assign supervisors and organise student groups with ease.',
  },
  {
    icon: Zap,
    title: 'Collaborate',
    description: 'Seamless communication between students and supervisors.',
  },
];

const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Student',
  SUPERVISOR: 'Supervisor',
  MANAGER: 'Manager',
};

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const [checking, setChecking] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Redirect already-authenticated users to their dashboard
  useEffect(() => {
    const stored = token ?? (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    const storedUser = user ?? (() => {
      try {
        const u = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        return u ? JSON.parse(u) : null;
      } catch { return null; }
    })();
    if (stored && storedUser?.role) {
      if (storedUser.isFirstLogin && (storedUser.role === 'STUDENT' || storedUser.role === 'SUPERVISOR')) {
        router.replace('/change-password');
      } else {
        router.replace(ROLE_REDIRECTS[storedUser.role] ?? '/dashboard');
      }
    } else {
      setChecking(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      const res = await api.post<{ accessToken: string; refreshToken: string; isFirstLogin: boolean }>(
        '/auth/login',
        { email: data.email, password: data.password, role: data.role },
      );
      const { accessToken, refreshToken, isFirstLogin } = res.data;
      const decoded = decodeToken(accessToken);
      const authUser = { ...decoded, isFirstLogin };
      setAuth(accessToken, authUser, refreshToken);
      if (isFirstLogin && (decoded.role === 'STUDENT' || decoded.role === 'SUPERVISOR')) {
        router.replace('/change-password');
      } else {
        router.replace(ROLE_REDIRECTS[decoded.role] ?? '/dashboard');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setServerError(typeof msg === 'string' ? msg : 'Invalid email or password. Please try again.');
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <svg className="h-8 w-8 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-2/5 relative flex-col justify-between bg-[#0F172A] px-12 py-12 overflow-hidden">
        {/* Decorative glow */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 w-72 h-72 rounded-full bg-indigo-900/30 blur-3xl" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 shrink-0">
            <span className="text-white font-bold text-lg leading-none">G</span>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">Gradify</span>
        </div>

        {/* Main copy + features */}
        <div className="relative space-y-10">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold text-white leading-tight tracking-tight">
              Your FYP journey,
              <br />
              <span className="text-indigo-400">simplified.</span>
            </h2>
            <p className="text-slate-400 text-base leading-relaxed max-w-xs">
              Everything you need to plan, track, and complete your Final Year
              Project — in one place.
            </p>
          </div>

          <ul className="space-y-6">
            {features.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex items-start gap-4">
                <div className="mt-0.5 flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-600/15 border border-indigo-500/20 shrink-0">
                  <Icon className="w-4 h-4 text-indigo-400" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{title}</p>
                  <p className="text-slate-500 text-sm leading-relaxed mt-0.5">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* University credit */}
        <p className="relative text-xs text-slate-600 tracking-wide">
          The Superior University · Lahore
        </p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 py-12">
        {/* Mobile-only logo */}
        <div className="flex lg:hidden items-center gap-2.5 mb-10">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600">
            <span className="text-white font-bold text-base leading-none">G</span>
          </div>
          <span className="text-gray-900 font-semibold text-lg">Gradify</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome back</h1>
            <p className="mt-1.5 text-sm text-gray-500">
              Sign in with your institutional credentials
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Role
              </label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 h-auto transition-colors focus:border-indigo-500 focus:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 data-placeholder:text-gray-400"
                    >
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.role && (
                <p className="mt-1.5 text-xs text-red-500">{errors.role.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Institutional Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                spellCheck={false}
                {...register('email')}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="Enter your institutional email"
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <a
                  href="#"
                  className="text-xs text-indigo-600 hover:text-indigo-500 transition-colors"
                >
                  Forgot password?
                </a>
              </div>
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
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" strokeWidth={1.75} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={1.75} />
                  )}
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
              className="mt-1 w-full inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="mr-2 h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Signing in…
                </>
              ) : (
                'Sign In to Workspace'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400">
            FYP Management System — The Superior University
          </p>
        </div>
      </div>
    </div>
  );
}
