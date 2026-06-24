'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  User,
  FolderOpen,
  ClipboardCheck,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/lib/auth';
import api from '@/lib/api';

const navItems = [
  { label: 'Dashboard', href: '/dashboard/student', icon: LayoutDashboard },
  { label: 'My Group', href: '/dashboard/student/group', icon: Users },
  { label: 'Tasks', href: '/dashboard/student/tasks', icon: ClipboardList },
  { label: 'Profile', href: '/dashboard/student/profile', icon: User },
];

type TaskStatus = 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'ACCEPTED_MINOR_ISSUES';

interface Task {
  id: number;
  title: string;
  deadline: string;
  status: TaskStatus;
}

interface Member {
  userId: number;
  user: { id: number };
}

interface Group {
  id: number;
  fypId: string;
  members: Member[];
}

const TASK_STATUS_STYLES: Record<TaskStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-yellow-50 text-yellow-700' },
  SUBMITTED: { label: 'Submitted', className: 'bg-blue-50 text-blue-700' },
  APPROVED: { label: 'Approved', className: 'bg-green-50 text-green-700' },
  REJECTED: { label: 'Rejected', className: 'bg-red-50 text-red-700' },
  ACCEPTED_MINOR_ISSUES: { label: 'Minor Issues', className: 'bg-orange-50 text-orange-700' },
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}

const today = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

export default function StudentDashboard() {
  const router = useRouter();
  const { token, user } = useAuthStore();

  const [myGroup, setMyGroup] = useState<Group | null | undefined>(undefined); // undefined = loading
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    const stored =
      token ?? (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    if (!stored) router.replace('/login');
  }, [token, router]);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      try {
        const [groupsRes, tasksRes, meRes] = await Promise.allSettled([
          api.get<Group[]>('/groups'),
          api.get<Task[]>('/tasks'),
          api.get<{ name: string | null }>('/users/me'),
        ]);

        if (meRes.status === 'fulfilled') {
          setUserName(meRes.value.data.name);
        }

        if (groupsRes.status === 'fulfilled' && user?.id) {
          const found = groupsRes.value.data.find((g) =>
            g.members.some((m) => m.user?.id === user.id || m.userId === user.id),
          );
          setMyGroup(found ?? null);
        } else {
          setMyGroup(null);
        }

        if (tasksRes.status === 'fulfilled') {
          setTasks(tasksRes.value.data);
        }
      } catch {
        setMyGroup(null);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user?.id]);

  const pendingCount = tasks.filter((t) => t.status === 'PENDING').length;
  const recentTasks = tasks.slice(0, 3);

  return (
    <DashboardLayout navItems={navItems}>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Student Dashboard</h1>
        {userName !== null && (
          <p className="mt-1 text-lg text-gray-600 font-medium">
            {getGreeting()}, {userName} 👋
          </p>
        )}
        <p className="mt-1 text-sm text-gray-500">{today}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 mb-8 max-w-xl">
        {/* My Group card */}
        <Card className="border-gray-200 shadow-none">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">My Group</p>
                {loading ? (
                  <div className="mt-2 h-7 w-32 animate-pulse rounded-md bg-gray-200" />
                ) : myGroup ? (
                  <p className="mt-1.5 text-xl font-bold text-gray-900 font-mono">{myGroup.fypId}</p>
                ) : (
                  <p className="mt-1.5 text-sm text-gray-400 italic">No Group</p>
                )}
              </div>
              <div className="rounded-xl p-2.5 bg-blue-50 shrink-0">
                <FolderOpen className="h-5 w-5 text-blue-600" strokeWidth={1.75} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Tasks card */}
        <Card className="border-gray-200 shadow-none">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pending Tasks</p>
                {loading ? (
                  <div className="mt-2 h-8 w-16 animate-pulse rounded-md bg-gray-200" />
                ) : (
                  <p className="mt-1.5 text-3xl font-bold text-gray-900">{pendingCount}</p>
                )}
              </div>
              <div className="rounded-xl p-2.5 bg-orange-50 shrink-0">
                <ClipboardCheck className="h-5 w-5 text-orange-600" strokeWidth={1.75} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tasks */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Recent Tasks</h2>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-1/4 animate-pulse rounded bg-gray-200" />
                </div>
                <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
              </div>
            ))}
          </div>
        ) : recentTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 mb-3">
              <ClipboardList className="h-5 w-5 text-gray-300" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium text-gray-500">No tasks assigned yet</p>
            <p className="mt-1 text-xs text-gray-400">Tasks assigned by your supervisor will appear here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recentTasks.map((task) => {
              const s = TASK_STATUS_STYLES[task.status] ?? TASK_STATUS_STYLES.PENDING;
              return (
                <li key={task.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      Due{' '}
                      {new Date(task.deadline).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${s.className}`}>
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
}
