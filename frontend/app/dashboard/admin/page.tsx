'use client';

import { useEffect, useState } from 'react';
import { Building2, Users, BookOpen, Calendar, TrendingUp, GraduationCap, Briefcase, FolderOpen, ClipboardList } from 'lucide-react';
import api from '@/lib/api';

const ACCENT = '#7C6FF7';

interface Stats {
  universities: number;
  managers: number;
  programs: number;
  sessions: number;
  totalStudents: number;
  totalSupervisors: number;
  totalGroups: number;
  totalTasks: number;
  totalProposals: number;
}

interface University {
  id: number;
  name: string;
  code: string;
  city: string | null;
  isActive: boolean;
  departments: { programs: unknown[] }[];
  users: { id: number; name: string | null; email: string }[];
}

interface Manager {
  id: number;
  name: string | null;
  email: string;
  isActive: boolean;
  university: { name: string } | null;
}

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
};

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    universities: 0, managers: 0, programs: 0, sessions: 0,
    totalStudents: 0, totalSupervisors: 0, totalGroups: 0, totalTasks: 0, totalProposals: 0,
  });
  const [universities, setUniversities] = useState<University[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get<Stats>('/admin/stats'),
      api.get<University[]>('/admin/universities'),
      api.get<Manager[]>('/admin/managers'),
      api.get<ActivityLog[]>('/admin/activity-log'),
    ]).then(([statsRes, uniRes, mgrRes, actRes]) => {
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (uniRes.status === 'fulfilled') setUniversities(uniRes.value.data.slice(0, 5));
      if (mgrRes.status === 'fulfilled') setManagers(mgrRes.value.data.slice(0, 5));
      if (actRes.status === 'fulfilled') setActivity(actRes.value.data);
    }).finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: 'Universities', value: stats.universities, icon: Building2, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
    { label: 'Active Managers', value: stats.managers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { label: 'Programs', value: stats.programs, icon: BookOpen, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
    { label: 'Active Sessions', value: stats.sessions, icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
    { label: 'Total Students', value: stats.totalStudents, icon: GraduationCap, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
    { label: 'Total Supervisors', value: stats.totalSupervisors, icon: Briefcase, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-100' },
    { label: 'Total Groups', value: stats.totalGroups, icon: FolderOpen, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-100' },
    { label: 'Total Tasks', value: stats.totalTasks, icon: ClipboardList, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
  ];

  const Skeleton = ({ className }: { className: string }) => (
    <div className={`animate-pulse rounded bg-gray-200 ${className}`} />
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">System Overview</h1>
        <p className="mt-1 text-sm text-gray-500">All universities, managers and programs at a glance.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={`rounded-xl border ${border} bg-white p-5`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">{label}</p>
                {loading ? (
                  <Skeleton className="mt-2 h-8 w-12" />
                ) : (
                  <p className="mt-1.5 text-3xl font-bold text-gray-900">{value}</p>
                )}
              </div>
              <div className={`rounded-xl p-2.5 ${bg} shrink-0`}>
                <Icon className={`h-5 w-5 ${color}`} strokeWidth={1.75} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 2-col grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Universities card */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Universities</h2>
            <a href="/dashboard/admin/universities" className="text-xs font-medium hover:underline" style={{ color: ACCENT }}>View all</a>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-2.5 w-1/3" />
                  </div>
                </div>
              ))
            ) : universities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-8 w-8 text-gray-200 mb-2" strokeWidth={1.5} />
                <p className="text-sm text-gray-400">No universities yet</p>
              </div>
            ) : (
              universities.map((u) => {
                const deptCount = u.departments?.length ?? 0;
                const progCount = u.departments?.reduce((s, d) => s + (d.programs?.length ?? 0), 0) ?? 0;
                const manager = u.users?.[0];
                return (
                  <div key={u.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                      style={{ backgroundColor: ACCENT }}
                    >
                      {u.code.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-400">{deptCount} dept · {progCount} prog · {u.city ?? '—'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${u.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {manager && <p className="text-[10px] text-gray-400 truncate max-w-[80px]">{manager.name ?? manager.email}</p>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Managers card */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Managers</h2>
            <a href="/dashboard/admin/managers" className="text-xs font-medium hover:underline" style={{ color: ACCENT }}>View all</a>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-2.5 w-1/2" />
                  </div>
                </div>
              ))
            ) : managers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Users className="h-8 w-8 text-gray-200 mb-2" strokeWidth={1.5} />
                <p className="text-sm text-gray-400">No managers yet</p>
              </div>
            ) : (
              managers.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: '#3b82f6' }}
                  >
                    {(m.name ?? m.email)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{m.name ?? '—'}</p>
                    <p className="truncate text-xs text-gray-400">{m.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${m.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      {m.isActive ? 'Active' : 'Suspended'}
                    </span>
                    {m.university && <p className="text-[10px] text-gray-400 truncate max-w-[80px]">{m.university.name}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
          <TrendingUp className="h-4 w-4 text-gray-400" strokeWidth={1.75} />
          <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                <Skeleton className="h-2.5 w-2.5 rounded-full" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-2.5 w-14" />
              </div>
            ))
          ) : activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <TrendingUp className="h-8 w-8 text-gray-200 mb-2" strokeWidth={1.5} />
              <p className="text-sm text-gray-400">No activity recorded yet</p>
            </div>
          ) : (
            activity.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-3.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: ENTITY_COLORS[a.entityType] ?? '#6b7280' }}
                />
                <p className="flex-1 text-sm text-gray-700 min-w-0">
                  <span className="font-medium capitalize">{a.entityName ?? `#${a.entityId}`}</span>
                  {' '}
                  <span className="text-gray-400">was {a.action}</span>
                  {' '}
                  <span className="capitalize text-gray-500">{a.entityType}</span>
                </p>
                <span className="shrink-0 text-xs text-gray-400">{timeAgo(a.createdAt)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
