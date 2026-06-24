'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '@/lib/auth';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface SidebarProps {
  navItems: NavItem[];
}

export default function Sidebar({ navItems }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-gray-900">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-gray-800 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shrink-0">
          <span className="text-sm font-bold text-white leading-none">G</span>
        </div>
        <span className="text-base font-semibold text-white tracking-tight">Gradify</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          // Use exact match when another nav item's href starts with this one
          // (prevents the root Dashboard link highlighting on child pages)
          const hasChildRoute = navItems.some(
            (other) => other.href !== item.href && other.href.startsWith(item.href + '/'),
          );
          const isActive = hasChildRoute
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-gray-800 px-3 py-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-400 hover:bg-gray-800 hover:text-red-300 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          Logout
        </button>
      </div>
    </aside>
  );
}
