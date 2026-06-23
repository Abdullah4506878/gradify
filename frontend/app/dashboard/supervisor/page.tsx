'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FolderOpen,
  Calendar,
  User,
  ClipboardCheck,
  FileText,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/lib/auth';
import api from '@/lib/api';

const navItems = [
  { label: 'Dashboard', href: '/dashboard/supervisor', icon: LayoutDashboard },
  { label: 'My Groups', href: '/dashboard/supervisor/groups', icon: FolderOpen },
  { label: 'Schedule', href: '/dashboard/supervisor/schedule', icon: Calendar },
  { label: 'Profile', href: '/dashboard/supervisor/profile', icon: User },
];

interface MOM {
  id: number;
  groupId: number;
  meetingDate: string;
  agenda: string;
  status: string;
  group?: { fypId: string };
}

interface Stats {
  myGroups: number;
  pendingReviews: number;
}

const today = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

export default function SupervisorDashboard() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  const [stats, setStats] = useState<Stats>({ myGroups: 0, pendingReviews: 0 });
  const [recentMoms, setRecentMoms] = useState<MOM[]>([]);
  const [loading, setLoading] = useState(true);

  // Auth guard
  useEffect(() => {
    const stored =
      token ?? (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    if (!stored) router.replace('/login');
  }, [token, router]);

  // Fetch stats + recent MOMs
  useEffect(() => {
    async function fetchData() {
      try {
        const [groupsRes, momsRes] = await Promise.allSettled([
          api.get<{ id: number }[]>('/groups'),
          api.get<MOM[]>('/mom'),
        ]);

        const myGroups =
          groupsRes.status === 'fulfilled' ? groupsRes.value.data.length : 0;

        const moms =
          momsRes.status === 'fulfilled' ? momsRes.value.data : [];

        setStats({ myGroups, pendingReviews: 0 });
        setRecentMoms(moms.slice(0, 5));
      } catch {
        // keep defaults
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const statCards = [
    {
      label: 'My Groups',
      value: stats.myGroups,
      icon: FolderOpen,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Pending Reviews',
      value: stats.pendingReviews,
      icon: ClipboardCheck,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ];

  return (
    <DashboardLayout navItems={navItems}>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Supervisor Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">{today}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 mb-8 max-w-xl">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-gray-200 shadow-none">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{label}</p>
                  {loading ? (
                    <div className="mt-2 h-8 w-16 animate-pulse rounded-md bg-gray-200" />
                  ) : (
                    <p className="mt-1.5 text-3xl font-bold text-gray-900">{value}</p>
                  )}
                </div>
                <div className={`rounded-xl p-2.5 ${bg} shrink-0`}>
                  <Icon className={`h-5 w-5 ${color}`} strokeWidth={1.75} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent MOMs */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Recent Minutes of Meeting</h2>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/3 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        ) : recentMoms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 mb-3">
              <FileText className="h-5 w-5 text-gray-300" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium text-gray-500">No meetings recorded yet</p>
            <p className="mt-1 text-xs text-gray-400">
              Minutes of meeting will appear here once submitted.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recentMoms.map((mom) => (
              <li key={mom.id} className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 shrink-0">
                    <FileText className="h-4 w-4 text-indigo-600" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {mom.group?.fypId ?? `Group #${mom.groupId}`}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{mom.agenda}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      mom.status === 'SUBMITTED'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-yellow-50 text-yellow-700'
                    }`}
                  >
                    {mom.status === 'SUBMITTED' ? 'Submitted' : 'Draft'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(mom.meetingDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
}
