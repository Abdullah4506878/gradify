'use client';

import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import api from '@/lib/api';

const ACCENT = '#7C6FF7';

interface ActivityLog {
  id: number;
  action: string;
  entityType: string;
  entityId: number | null;
  entityName: string | null;
  createdAt: string;
}

const ENTITY_COLORS: Record<string, string> = {
  university: ACCENT,
  manager: '#22c55e',
  program: '#3b82f6',
  department: '#f59e0b',
  session: '#ec4899',
};

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ActivityLog[]>('/admin/activity-log')
      .then((r) => setLogs(r.data))
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
        <div className="divide-y divide-gray-100">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-4">
                <Skeleton className="h-2.5 w-2.5 rounded-full shrink-0" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-3 w-16 shrink-0" />
              </div>
            ))
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Activity className="h-10 w-10 text-gray-200 mb-3" strokeWidth={1.5} />
              <p className="text-sm font-medium text-gray-400">No activity recorded yet</p>
              <p className="mt-1 text-xs text-gray-300">Actions on universities and managers will appear here</p>
            </div>
          ) : (
            logs.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-4">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: ENTITY_COLORS[a.entityType] ?? '#6b7280' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium capitalize">{a.entityName ?? `#${a.entityId}`}</span>
                    {' '}
                    <span className="text-gray-400">was {a.action}</span>
                    {' '}
                    <span className="capitalize text-gray-500">{a.entityType}</span>
                  </p>
                </div>
                <span className="shrink-0 text-xs text-gray-400 whitespace-nowrap">{timeAgo(a.createdAt)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
