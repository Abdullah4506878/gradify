'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { LogOut, X } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface SidebarProps {
  navItems: NavItem[];
  isOpen: boolean;
  onClose: () => void;
  onLogoutRequest: () => void;
}

export default function Sidebar({ navItems, isOpen, onClose, onLogoutRequest }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Backdrop — mobile only, shown when drawer is open */}
      <div
        className={`fixed inset-0 z-30 bg-black/50 transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-gray-900 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo + close button */}
        <div className="flex h-16 items-center justify-between border-b border-gray-800 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shrink-0">
              <span className="text-sm font-bold text-white leading-none">G</span>
            </div>
            <span className="text-base font-semibold text-white tracking-tight">Gradify</span>
          </div>
          {/* Close button — mobile only */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
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
                onClick={onClose}
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
            onClick={onLogoutRequest}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-400 hover:bg-gray-800 hover:text-red-300 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
