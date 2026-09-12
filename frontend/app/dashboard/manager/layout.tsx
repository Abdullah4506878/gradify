'use client';

import {
  LayoutDashboard,
  Users,
  Briefcase,
  FolderOpen,
  BarChart,
  User,
  ClipboardCheck,
  ClipboardList,
  FileText,
  BarChart2,
  BookOpen,
  Settings,
  Activity,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';

const navItems = [
  { label: 'Dashboard', href: '/dashboard/manager', icon: LayoutDashboard },
  { label: 'Students', href: '/dashboard/manager/students', icon: Users },
  { label: 'Supervisors', href: '/dashboard/manager/supervisors', icon: Briefcase },
  { label: 'Workload', href: '/dashboard/manager/supervisors/workload', icon: BarChart2 },
  { label: 'Groups', href: '/dashboard/manager/groups', icon: FolderOpen },
  { label: 'FYP Projects', href: '/dashboard/manager/fyp-projects', icon: BookOpen },
  { label: 'Minutes of Meeting', href: '/dashboard/manager/mom', icon: FileText },
  { label: 'Tasks', href: '/dashboard/manager/tasks', icon: ClipboardList },
  { label: 'Proposals', href: '/dashboard/manager/proposals', icon: ClipboardCheck },
  { label: 'Reports', href: '/dashboard/manager/reports', icon: BarChart },
  { label: 'Audit Log', href: '/dashboard/manager/audit', icon: Activity },
  { label: 'Profile', href: '/dashboard/manager/profile', icon: User },
  { label: 'Settings', href: '/dashboard/manager/settings', icon: Settings },
];

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout navItems={navItems}>{children}</DashboardLayout>;
}
