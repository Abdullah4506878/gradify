'use client';

import {
  LayoutDashboard,
  Users,
  Briefcase,
  FolderOpen,
  BarChart,
  FileText,
  BarChart2,
  TrendingUp,
  User,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import DashboardLayout from '@/components/layout/DashboardLayout';
import type { LucideIcon } from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard/manager', icon: LayoutDashboard },
  { label: 'Students', href: '/dashboard/manager/students', icon: Users },
  { label: 'Supervisors', href: '/dashboard/manager/supervisors', icon: Briefcase },
  { label: 'Groups', href: '/dashboard/manager/groups', icon: FolderOpen },
  { label: 'Reports', href: '/dashboard/manager/reports', icon: BarChart },
  { label: 'Profile', href: '/dashboard/manager/profile', icon: User },
];

const reportCards: { title: string; description: string; icon: LucideIcon }[] = [
  {
    title: 'Submission Report',
    description: 'Track task submission rates across all groups',
    icon: FileText,
  },
  {
    title: 'Supervisor Performance',
    description: 'Monitor supervisor meeting and review activity',
    icon: BarChart2,
  },
  {
    title: 'Group Progress Report',
    description: 'Overview of group progress and milestone completion',
    icon: TrendingUp,
  },
];

export default function ReportsPage() {
  return (
    <DashboardLayout navItems={navItems}>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">FYP program analytics and insights</p>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {reportCards.map(({ title, description, icon: Icon }) => (
          <Card key={title} className="border-gray-200 shadow-none">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                  <Icon className="h-5 w-5 text-indigo-600" strokeWidth={1.75} />
                </div>
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                  Coming Soon
                </span>
              </div>
              <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
              <p className="mt-1 text-sm text-gray-500 leading-relaxed">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 mb-3">
            <BarChart className="h-5 w-5 text-gray-300" strokeWidth={1.75} />
          </div>
          <p className="text-sm font-medium text-gray-500">No data available yet</p>
          <p className="mt-1 text-xs text-gray-400">
            Reports will populate once your FYP program is underway.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
