'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import Sidebar, { type NavItem } from './Sidebar';
import { useAuthStore } from '@/lib/auth';

interface DashboardLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
}

export default function DashboardLayout({ children, navItems }: DashboardLayoutProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar navItems={navItems} />

      {/* Main area — offset by sidebar width */}
      <div className="pl-64 flex flex-col min-h-screen">
        {/* Top navbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600">
              <span className="text-xs font-bold text-white leading-none">G</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">Gradify</span>
          </div>

          <div className="flex items-center gap-4">
            {mounted && user?.email && (
              <span className="text-sm text-gray-500">{user.email}</span>
            )}
            {mounted && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
                Logout
              </button>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
