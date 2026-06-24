'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Bell } from 'lucide-react';
import Sidebar, { type NavItem } from './Sidebar';
import { useAuthStore } from '@/lib/auth';
import {
  type Notification,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  timeAgo,
} from '@/lib/notifications';

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

  // ── Notifications ──
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(() => {
    fetchNotifications().then(setNotifications);
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const recent = notifications.slice(0, 5);

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleNotifClick = async (n: Notification) => {
    if (!n.isRead) {
      markNotificationRead(n.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)),
      );
    }
    setNotifOpen(false);
    if (n.link) router.push(n.link);
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

          <div className="flex items-center gap-3">
            {mounted && user?.email && (
              <span className="text-sm text-gray-500">{user.email}</span>
            )}

            {/* Notification bell */}
            {mounted && (
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => setNotifOpen((o) => !o)}
                  className="relative flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" strokeWidth={1.75} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white leading-none">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-gray-200 bg-white shadow-xl">
                    {/* Dropdown header */}
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">Notifications</p>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    {/* List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                      {recent.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 px-4">
                          <Bell className="h-6 w-6 text-gray-300 mb-2" strokeWidth={1.75} />
                          <p className="text-xs text-gray-400">No notifications yet</p>
                        </div>
                      ) : (
                        recent.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => handleNotifClick(n)}
                            className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                              n.isRead ? 'bg-gray-50/40' : 'bg-white'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              {!n.isRead && (
                                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                              )}
                              <div className={n.isRead ? 'pl-4 w-full' : 'w-full'}>
                                <p
                                  className={`text-xs font-semibold leading-snug ${
                                    n.isRead ? 'text-gray-500' : 'text-gray-900'
                                  }`}
                                >
                                  {n.title}
                                </p>
                                <p className="mt-0.5 text-xs text-gray-500 leading-relaxed line-clamp-2">
                                  {n.message}
                                </p>
                                <p className="mt-1 text-[10px] text-gray-400">
                                  {timeAgo(n.createdAt)}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 5 && (
                      <div className="border-t border-gray-100 px-4 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => { setNotifOpen(false); router.push('/notifications'); }}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                        >
                          View all {notifications.length} notifications
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
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
