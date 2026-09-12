'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Bell, Menu, X } from 'lucide-react';
import Sidebar, { type NavItem } from './Sidebar';
import { useAuthStore } from '@/lib/auth';
import api from '@/lib/api';
import {
  type Notification,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  timeAgo,
} from '@/lib/notifications';

interface Announcement {
  id: number;
  title: string;
  message: string;
  createdAt: string;
}

const DISMISSED_KEY = 'dismissedAnnouncements';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface DashboardLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
}

export default function DashboardLayout({ children, navItems }: DashboardLayoutProps) {
  const router = useRouter();
  const { user, logout, token } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  // Client-side auth guard — middleware is primary; this is defense-in-depth
  useEffect(() => {
    const stored = token ?? (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    if (!stored) router.replace('/login');
  }, [token, router]);

  // Auto-close sidebar when resizing to desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 1024) setSidebarOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleLogoutConfirm = () => {
    setLogoutDialogOpen(false);
    logout();
    router.replace('/login');
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

  // ── Announcements ──
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<number[]>([]);

  useEffect(() => {
    api.get<Announcement[]>('/announcements/active')
      .then((res) => setAnnouncements(res.data))
      .catch(() => {});
    try {
      const stored = localStorage.getItem(DISMISSED_KEY);
      if (stored) setDismissedIds(JSON.parse(stored));
    } catch {
      // ignore malformed/unavailable storage
    }
  }, []);

  const dismissAnnouncement = (id: number) => {
    setDismissedIds((prev) => {
      const next = [...prev, id];
      try {
        localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
      } catch {
        // ignore storage failures — dismissal just won't persist
      }
      return next;
    });
  };

  const visibleAnnouncements = announcements.filter((a) => !dismissedIds.includes(a.id));

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
      <Sidebar
        navItems={navItems}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogoutRequest={() => setLogoutDialogOpen(true)}
      />

      {/* Main area — no left offset on mobile; lg:pl-64 on desktop */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top navbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" strokeWidth={1.75} />
            </button>

            {/* Logo / brand */}
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600">
                <span className="text-xs font-bold text-white leading-none">G</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">Gradify</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Email — hidden on small screens */}
            {mounted && user?.email && (
              <span className="hidden sm:block text-sm text-gray-500 truncate max-w-[180px]">
                {user.email}
              </span>
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
                  <div className="absolute right-0 top-10 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white shadow-xl">
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
                                <p className={`text-xs font-semibold leading-snug ${n.isRead ? 'text-gray-500' : 'text-gray-900'}`}>
                                  {n.title}
                                </p>
                                <p className="mt-0.5 text-xs text-gray-500 leading-relaxed line-clamp-2">
                                  {n.message}
                                </p>
                                <p className="mt-1 text-[10px] text-gray-400">{timeAgo(n.createdAt)}</p>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>

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

            {/* Logout — opens confirmation dialog */}
            {mounted && (
              <button
                onClick={() => setLogoutDialogOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2 py-1.5 sm:px-3 text-sm font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                aria-label="Logout"
              >
                <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
          </div>
        </header>

        {/* Announcements */}
        {mounted && visibleAnnouncements.length > 0 && (
          <div className="space-y-2 px-4 pt-4 sm:px-6">
            {visibleAnnouncements.map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
              >
                <Bell className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" strokeWidth={1.75} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-amber-800">{a.title}</p>
                  <p className="mt-0.5 text-sm text-amber-700">{a.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => dismissAnnouncement(a.id)}
                  className="shrink-0 text-amber-500 hover:text-amber-700 transition-colors"
                  aria-label="Dismiss announcement"
                >
                  <X className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>

      {/* Logout confirmation dialog */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Confirm Logout</DialogTitle>
            <DialogDescription>
              Are you sure you want to logout?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setLogoutDialogOpen(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleLogoutConfirm}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition-colors"
            >
              Logout
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
