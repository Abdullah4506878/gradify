'use client';

import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import api from '@/lib/api';

interface AuditLog {
  id: number;
  userEmail: string | null;
  role: string | null;
  action: string;
  entity: string;
  details: string | null;
  createdAt: string;
}

interface AuditLogsResponse {
  items: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

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

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<AuditLogsResponse>('/audit/logs')
      .then((r) => setLogs(r.data.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const Skeleton = ({ className }: { className: string }) => (
    <div className={`animate-pulse rounded bg-gray-200 ${className}`} />
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Activity Log</h1>
        <p className="mt-1 text-sm text-gray-500">Track all system actions and changes.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
          <Activity className="h-4 w-4 text-gray-400" strokeWidth={1.75} />
          <h2 className="text-sm font-semibold text-gray-900">Recent Actions</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">User Email</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Role</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Action</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Entity</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Details</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-4 flex-1" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-4 w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center justify-center py-20">
                      <Activity className="h-10 w-10 text-gray-200 mb-3" strokeWidth={1.5} />
                      <p className="text-sm font-medium text-gray-400">No activity recorded yet</p>
                      <p className="mt-1 text-xs text-gray-300">Actions across the system will appear here</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 text-sm text-gray-700">{a.userEmail ?? '—'}</td>
                    <td className="px-5 py-4">
                      {a.role ? (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGES[a.role] ?? 'bg-gray-100 text-gray-600'}`}>
                          {a.role}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm font-mono text-gray-700">{a.action}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ENTITY_BADGES[a.entity] ?? 'bg-gray-100 text-gray-600'}`}>
                        {a.entity}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {a.details ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-4 text-right text-xs text-gray-400 whitespace-nowrap">{timeAgo(a.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
