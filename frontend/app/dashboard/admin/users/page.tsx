'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  Search,
  ShieldOff,
  ShieldCheck,
  KeyRound,
  History,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import api from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const ACCENT = '#7C6FF7';
const LIMIT = 20;

interface AdminUser {
  id: number;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  university: { id: number; name: string } | null;
  lastLogin: string | null;
}

interface UsersResponse {
  items: AdminUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface LoginHistoryEntry {
  id: number;
  action: string;
  ipAddress: string | null;
  createdAt: string;
}

const ROLE_BADGES: Record<string, string> = {
  MANAGER: 'bg-indigo-50 text-indigo-700',
  SUPERVISOR: 'bg-blue-50 text-blue-700',
  STUDENT: 'bg-green-50 text-green-700',
  SUPER_ADMIN: 'bg-purple-50 text-purple-700',
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const [togglingId, setTogglingId] = useState<number | null>(null);

  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const [historyTarget, setHistoryTarget] = useState<AdminUser | null>(null);
  const [history, setHistory] = useState<LoginHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Debounce search input by 300ms.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(handle);
  }, [search]);

  // Filter changes reset pagination.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter]);

  const load = () => {
    setLoading(true);
    api.get<UsersResponse>('/admin/users', {
      params: {
        page,
        limit: LIMIT,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(roleFilter && { role: roleFilter }),
      },
    })
      .then((res) => {
        setUsers(res.data.items);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      })
      .catch(() => {
        setUsers([]);
        setTotal(0);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page, debouncedSearch, roleFilter]);

  const handleToggleActive = async (u: AdminUser) => {
    setTogglingId(u.id);
    try {
      const r = await api.patch<AdminUser>(`/admin/users/${u.id}/suspend`);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, isActive: r.data.isActive } : x)));
    } catch {
      // silent
    } finally {
      setTogglingId(null);
    }
  };

  const openResetDialog = (u: AdminUser) => {
    setResetTarget(u);
    setResetDone(false);
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    setResetting(true);
    try {
      await api.patch(`/admin/users/${resetTarget.id}/reset-password`);
      setResetDone(true);
    } catch {
      // keep dialog open, no message state needed for this simple flow
    } finally {
      setResetting(false);
    }
  };

  const openHistoryDialog = async (u: AdminUser) => {
    setHistoryTarget(u);
    setHistory([]);
    setHistoryLoading(true);
    try {
      const res = await api.get<LoginHistoryEntry[]>(`/admin/users/${u.id}/login-history`);
      setHistory(res.data);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const Skeleton = ({ className }: { className: string }) => (
    <div className={`animate-pulse rounded bg-gray-200 ${className}`} />
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-gray-500">
          {loading ? 'Loading…' : `${total} user${total !== 1 ? 's' : ''} across the system`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none"
        >
          <option value="">All Roles</option>
          <option value="STUDENT">Student</option>
          <option value="SUPERVISOR">Supervisor</option>
          <option value="MANAGER">Manager</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50">
              {['User', 'Email', 'Role', 'Status', 'Last Login', 'Actions'].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-5 py-4"><Skeleton className="h-4 w-full max-w-[120px]" /></td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <Users className="mx-auto h-8 w-8 text-gray-200 mb-2" strokeWidth={1.5} />
                  <p className="text-sm text-gray-400">
                    {search || roleFilter ? 'No users match your filters' : 'No users found'}
                  </p>
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: ACCENT }}
                      >
                        {(u.name ?? u.email)[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {u.name ?? <span className="text-gray-400 italic">No name</span>}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{u.email}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGES[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${u.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      {u.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">
                    {formatDate(u.lastLogin) ?? <span className="text-gray-300 italic">Never</span>}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(u)}
                        disabled={togglingId === u.id}
                        className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-50 ${u.isActive ? 'text-gray-400 hover:bg-amber-50 hover:text-amber-600' : 'text-gray-400 hover:bg-green-50 hover:text-green-600'}`}
                        title={u.isActive ? 'Suspend' : 'Activate'}
                      >
                        {u.isActive
                          ? <ShieldOff className="h-3.5 w-3.5" strokeWidth={1.75} />
                          : <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => openResetDialog(u)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        title="Reset Password"
                      >
                        <KeyRound className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openHistoryDialog(u)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        title="Login History"
                      >
                        <History className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && users.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">Page {page} of {totalPages} · {total} total</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      )}

      {/* Reset Password Confirm Dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => { if (!o) setResetTarget(null); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          {resetDone ? (
            <p className="text-sm text-green-700 py-2">
              Password for <span className="font-medium">{resetTarget?.name ?? resetTarget?.email}</span> has been reset to{' '}
              <span className="font-mono font-medium">Test@123</span>. They will be required to change it on next login.
            </p>
          ) : (
            <p className="text-sm text-gray-600 py-2">
              Reset <span className="font-medium text-gray-900">{resetTarget?.name ?? resetTarget?.email}</span>&apos;s password to the default (<span className="font-mono">Test@123</span>)? They will be forced to change it on next login.
            </p>
          )}
          <DialogFooter>
            <button
              type="button"
              onClick={() => setResetTarget(null)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {resetDone ? 'Close' : 'Cancel'}
            </button>
            {!resetDone && (
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resetting}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60"
                style={{ backgroundColor: ACCENT }}
              >
                {resetting ? 'Resetting…' : 'Reset Password'}
              </button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Login History Dialog */}
      <Dialog open={!!historyTarget} onOpenChange={(o) => { if (!o) setHistoryTarget(null); }}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Login History — {historyTarget?.name ?? historyTarget?.email}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {historyLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <History className="h-8 w-8 text-gray-200 mb-2" strokeWidth={1.5} />
                <p className="text-sm text-gray-400">No login history yet</p>
              </div>
            ) : (
              <ul className="space-y-2 max-h-80 overflow-y-auto">
                {history.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3.5 py-2.5">
                    <div>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${h.action === 'LOGIN_SUCCESS' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {h.action === 'LOGIN_SUCCESS' ? 'Success' : 'Failed'}
                      </span>
                      {h.ipAddress && <span className="ml-2 text-xs text-gray-400 font-mono">{h.ipAddress}</span>}
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(h.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setHistoryTarget(null)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
