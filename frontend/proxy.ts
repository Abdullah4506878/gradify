import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ROLE_DASHBOARDS: Record<string, string> = {
  MANAGER: '/dashboard/manager',
  SUPERVISOR: '/dashboard/supervisor',
  STUDENT: '/dashboard/student',
  SUPER_ADMIN: '/dashboard/admin',
};

function decodeJwtPayload(token: string): { role?: string; sub?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth_token')?.value;
  const payload = token ? decodeJwtPayload(token) : null;
  const role = payload?.role;

  // Only STUDENT and SUPERVISOR are forced through the first-login password change
  const firstLogin = request.cookies.get('first_login')?.value === '1';
  const mustChangePassword = firstLogin && (role === 'STUDENT' || role === 'SUPERVISOR');

  // Authenticated user visits /login or root → send to their dashboard (or forced flow)
  if ((pathname === '/login' || pathname === '/') && role) {
    if (mustChangePassword) {
      return NextResponse.redirect(new URL('/change-password', request.url));
    }
    const dashboard = ROLE_DASHBOARDS[role];
    if (dashboard) {
      return NextResponse.redirect(new URL(dashboard, request.url));
    }
  }

  // SUPER_ADMIN on /admin-login → redirect to admin dashboard
  if (pathname === '/admin-login' && role === 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL('/dashboard/admin', request.url));
  }

  // /change-password just requires an authenticated session
  if (pathname === '/change-password') {
    if (!token || !role) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/dashboard')) {
    // No session → go to login
    if (!token || !role) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // First-login students/supervisors cannot skip the forced password change
    if (mustChangePassword) {
      return NextResponse.redirect(new URL('/change-password', request.url));
    }

    // SUPER_ADMIN can only access /dashboard/admin/*
    if (pathname.startsWith('/dashboard/admin') && role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL(ROLE_DASHBOARDS[role] ?? '/login', request.url));
    }
    if (!pathname.startsWith('/dashboard/admin') && role === 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/dashboard/admin', request.url));
    }

    // Role-based route protection for other roles
    if (pathname.startsWith('/dashboard/manager') && role !== 'MANAGER') {
      return NextResponse.redirect(new URL(ROLE_DASHBOARDS[role] ?? '/login', request.url));
    }
    if (pathname.startsWith('/dashboard/supervisor') && role !== 'SUPERVISOR') {
      return NextResponse.redirect(new URL(ROLE_DASHBOARDS[role] ?? '/login', request.url));
    }
    if (pathname.startsWith('/dashboard/student') && role !== 'STUDENT') {
      return NextResponse.redirect(new URL(ROLE_DASHBOARDS[role] ?? '/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/admin-login', '/change-password', '/'],
};
