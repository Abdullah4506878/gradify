'use client';

import {
  LayoutDashboard,
  FolderOpen,
  Calendar,
  User,
  CalendarClock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import DashboardLayout from '@/components/layout/DashboardLayout';

const navItems = [
  { label: 'Dashboard', href: '/dashboard/supervisor', icon: LayoutDashboard },
  { label: 'My Groups', href: '/dashboard/supervisor/groups', icon: FolderOpen },
  { label: 'Schedule', href: '/dashboard/supervisor/schedule', icon: Calendar },
  { label: 'Profile', href: '/dashboard/supervisor/profile', icon: User },
];

export default function SchedulePage() {
  return (
    <DashboardLayout navItems={navItems}>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Schedule</h1>
        <p className="mt-1 text-sm text-gray-500">Upcoming meetings and deadlines</p>
      </div>

      {/* Placeholder card */}
      <div className="mb-8 max-w-sm">
        <Card className="border-gray-200 shadow-none">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                <CalendarClock className="h-5 w-5 text-indigo-600" strokeWidth={1.75} />
              </div>
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                Coming Soon
              </span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Meeting Scheduler</h3>
            <p className="mt-1 text-sm text-gray-500 leading-relaxed">
              Schedule and manage meetings with your FYP groups directly from the dashboard.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Empty state */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 mb-3">
            <Calendar className="h-5 w-5 text-gray-300" strokeWidth={1.75} />
          </div>
          <p className="text-sm font-medium text-gray-500">No upcoming meetings</p>
          <p className="mt-1 text-xs text-gray-400">
            Scheduled meetings will appear here once the meeting scheduler is available.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
