'use client';

import { useEffect, useState } from 'react';
import { Activity, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import api from '@/lib/api';

interface AuditLogItem {
  id: number;
  userId: number | null;
  userEmail: string | null;
  role: string | null;
  action: string;
  entity: string;
  entityId: number | null;
  details: string | null;
  createdAt: string;
  user: { id: number; name: string | null; email: string; role: string } | null;
}

interface AuditLogsResponse {
  items: AuditLogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const LIMIT = 20;

const ENTITY_BADGES: Record<string, string> = {
  AUTH: 'bg-purple-50 text-purple-700',
  USER: 'bg-blue-50 text-blue-700',
  GROUP: 'bg-green-50 text-green-700',
  TASK: 'bg-yellow-50 text-yellow-700',
};

const ROLE_BADGES: Record<string, string> = {
  MANAGER: 'bg-indigo-50 text-indigo-700',
  SUPERVISOR: 'bg-blue-50 text-blue-700',
  STUDENT: 'bg-green-50 text-green-700',
  SUPER_ADMIN: 'bg-purple-50 text-purple-700',
};

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 animate-pulse rounded bg-gray-200" style={{ width: i === 1 ? '7rem' : '60%' }} />
        </td>
      ))}
    </tr>
  );
}

export default function AuditLogPage() {
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Debounce the action/details search input by 300ms.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(handle);
  }, [search]);

  // Any filter change resets pagination back to page 1.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, fromDate, toDate]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get<AuditLogsResponse>('/audit/logs', {
      params: {
        page,
        limit: LIMIT,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(fromDate && { from: fromDate }),
        ...(toDate && { to: `${toDate}T23:59:59` }),
      },
    })
      .then((res) => {
        if (cancelled) return;
        setItems(res.data.items);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
        setTotal(0);
        setTotalPages(1);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, fromDate, toDate]);

  const hasFilters = !!(search || fromDate || toDate);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Audit Log</h1>
        <p className="mt-1 text-sm text-gray-500">
          {loading ? 'Loading…' : `${total} action${total !== 1 ? 's' : ''} recorded`}
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Search action or details…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Time</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">User Email</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Role</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Action</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Entity</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 mb-3">
                      <Activity className="h-5 w-5 text-gray-300" strokeWidth={1.75} />
                    </div>
                    <p className="text-sm font-medium text-gray-500">
                      {hasFilters ? 'No logs match your filters' : 'No activity recorded yet'}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {hasFilters ? 'Try a different search term or date range.' : 'Actions across the system will appear here.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((log) => {
                const email = log.userEmail ?? log.user?.email ?? '—';
                const role = log.role ?? log.user?.role ?? null;
                return (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{formatTime(log.createdAt)}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{email}</td>
                    <td className="px-6 py-4">
                      {role ? (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGES[role] ?? 'bg-gray-100 text-gray-600'}`}>
                          {role}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-700">{log.action}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ENTITY_BADGES[log.entity] ?? 'bg-gray-100 text-gray-600'}`}>
                        {log.entity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {log.details ?? <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && items.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Page {page} of {totalPages} · {total} total
          </p>
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
    </>
  );
}
