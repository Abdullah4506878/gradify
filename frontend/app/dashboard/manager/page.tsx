'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FolderOpen,
  BarChart,
  Clock,
  Activity,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/lib/auth';

const navItems = [
  { label: 'Dashboard', href: '/dashboard/manager', icon: LayoutDashboard },
  { label: 'Students', href: '/dashboard/manager/students', icon: Users },
  { label: 'Supervisors', href: '/dashboard/manager/supervisors', icon: Briefcase },
  { label: 'Groups', href: '/dashboard/manager/groups', icon: FolderOpen },
  { label: 'Reports', href: '/dashboard/manager/reports', icon: BarChart },
];

const statCards = [
  {
    label: 'Total Groups',
    value: 0,
    icon: FolderOpen,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    label: 'Total Students',
    value: 0,
    icon: Users,
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  {
    label: 'Total Supervisors',
    value: 0,
    icon: Briefcase,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    label: 'Pending Assignments',
    value: 0,
    icon: Clock,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
];

const today = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

export default function ManagerDashboard() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    const stored =
      token ?? (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    if (!stored) {
      router.replace('/login');
    }
  }, [token, router]);

  return (
    <DashboardLayout navItems={navItems}>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Manager Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">{today}</p>
      </div>

      {/* Stat cards — 2×2 grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-gray-200 shadow-none">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{label}</p>
                  <p className="mt-1.5 text-3xl font-bold text-gray-900">{value}</p>
                </div>
                <div className={`rounded-xl p-2.5 ${bg} shrink-0`}>
                  <Icon className={`h-5 w-5 ${color}`} strokeWidth={1.75} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 mb-3">
            <Activity className="h-5 w-5 text-gray-300" strokeWidth={1.75} />
          </div>
          <p className="text-sm font-medium text-gray-500">No recent activity yet</p>
          <p className="mt-1 text-xs text-gray-400">Activity will appear here as you manage your FYP program.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
