'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  GraduationCap,
  BookOpen,
  Calendar,
  Users,
  Activity,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  LayoutGrid,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  type Notification,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  timeAgo,
} from '@/lib/notifications';

// ── Sidebar colours ──────────────────────────────────────────────────────────
const SIDEBAR_BG = '#2D2560';
const ACCENT = '#7C6FF7';
const ACTIVE_BG = 'rgba(124,111,247,0.25)';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard }],
  },
  {
    label: 'Manage',
    items: [
      { label: 'Universities', href: '/dashboard/admin/universities', icon: Building2 },
      { label: 'Departments',  href: '/dashboard/admin/departments',  icon: GraduationCap },
      { label: 'Programs',     href: '/dashboard/admin/programs',     icon: BookOpen },
      { label: 'Sessions',     href: '/dashboard/admin/sessions',     icon: Calendar },
    ],
  },
  {
    label: 'Users',
    items: [{ label: 'Managers', href: '/dashboard/admin/managers', icon: Users }],
  },
  {
    label: 'System',
    items: [
      { label: 'Activity Log', href: '/dashboard/admin/activity-log', icon: Activity },
      { label: 'Settings',     href: '/dashboard/admin/settings',     icon: Settings },
    ],
  },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function AdminSidebar({
  isOpen,
  onClose,
  onLogoutRequest,
}: {
  isOpen: boolean;
  onClose: () => void;
  onLogoutRequest: () => void;
}) {
  const pathname = usePathname();
  const { user } = useAuthStore();

  return (
    <>
      {/* Backdrop (mobile) */}
      <div
        className={`fixed inset-0 z-30 bg-black/50 transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        style={{ backgroundColor: SIDEBAR_BG }}
        className={`fixed inset-y-0 left-0 z-40 flex w-[200px] flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] shrink-0"
              style={{ backgroundColor: ACCENT }}
            >
              <LayoutGrid className="h-3.5 w-3.5 text-white" strokeWidth={1.75} />
            </div>
            <div className="leading-none">
              <p className="text-[15px] font-medium text-white">Gradify</p>
              <p
                className="mt-0.5 text-[10px] uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.45)' }}
              >
                Admin
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-white/10 lg:hidden"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p
                className="mb-1.5 px-[10px] text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === '/dashboard/admin'
                      ? pathname === item.href
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className="flex items-center gap-3 rounded-[6px] px-[10px] py-[8px] text-[13px] font-medium transition-colors"
                      style={{
                        backgroundColor: isActive ? ACTIVE_BG : undefined,
                        color: isActive ? '#fff' : 'rgba(255,255,255,0.65)',
                      }}
                    >
                      <Icon
                        className="h-4 w-4 shrink-0"
                        strokeWidth={1.75}
                        style={{ color: isActive ? ACCENT : undefined }}
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User + logout */}
        <div className="border-t border-white/10 px-3 py-3">
          <div className="flex items-center gap-2.5 rounded-[6px] px-2 py-1.5">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: ACCENT }}
            >
              {(user?.email?.[0] ?? 'A').toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-white">
                {user?.email ?? 'admin@gradify.com'}
              </p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Admin
              </p>
            </div>
            <button
              type="button"
              onClick={onLogoutRequest}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.4)' }}
              aria-label="Logout"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, logout, token } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    setMounted(true);
    setGreeting(getGreeting());
  }, []);

  // Client-side auth guard
  useEffect(() => {
    const stored = token ?? (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    if (!stored) router.replace('/login');
  }, [token, router]);

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

  // ── Notifications ──────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(() => {
    fetchNotifications().then(setNotifications).catch(() => {});
  }, []);

  useEffect(() => {
    loadNotifications();
    const id = setInterval(loadNotifications, 30000);
    return () => clearInterval(id);
  }, [loadNotifications]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleNotifClick = async (n: Notification) => {
    if (!n.isRead) markNotificationRead(n.id).catch(() => {});
    setNotifOpen(false);
    if (n.link) router.push(n.link);
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogoutRequest={() => setLogoutDialogOpen(true)}
      />

      <div className="lg:pl-[200px] flex flex-col min-h-screen">
        {/* Navbar */}
        <header
          className="sticky top-0 z-20 flex h-16 items-center justify-between border-b px-4 sm:px-6"
          style={{ backgroundColor: 'var(--card, #ffffff)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-3">
            {/* Hamburger */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" strokeWidth={1.75} />
            </button>

            {/* Greeting */}
            {mounted && (
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-gray-900">
                  {greeting}, {user?.email?.split('@')[0] ?? 'Admin'}
                </p>
                <p className="text-xs text-gray-400">{today} · System is running normally</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Super Admin badge */}
            {mounted && (
              <span
                className="hidden sm:inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{ backgroundColor: '#EDE9FE', color: '#4F46E5' }}
              >
                Admin
              </span>
            )}

            {/* Notification bell */}
            {mounted && (
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => setNotifOpen((o) => !o)}
                  className="relative flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
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
                          onClick={async () => {
                            await markAllNotificationsRead();
                            setNotifications((p) => p.map((n) => ({ ...n, isRead: true })));
                          }}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                      {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 px-4">
                          <Bell className="h-6 w-6 text-gray-300 mb-2" strokeWidth={1.75} />
                          <p className="text-xs text-gray-400">No notifications yet</p>
                        </div>
                      ) : (
                        notifications.slice(0, 5).map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => handleNotifClick(n)}
                            className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${n.isRead ? 'bg-gray-50/40' : 'bg-white'}`}
                          >
                            <div className="flex items-start gap-2.5">
                              {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />}
                              <div className={n.isRead ? 'pl-4 w-full' : 'w-full'}>
                                <p className={`text-xs font-semibold ${n.isRead ? 'text-gray-500' : 'text-gray-900'}`}>{n.title}</p>
                                <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{n.message}</p>
                                <p className="mt-1 text-[10px] text-gray-400">{timeAgo(n.createdAt)}</p>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Logout */}
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

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>

      {/* Logout dialog */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Confirm Logout</DialogTitle>
            <DialogDescription>Are you sure you want to logout?</DialogDescription>
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
