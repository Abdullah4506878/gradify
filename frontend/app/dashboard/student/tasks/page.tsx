'use client';

import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  User,
  Search,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
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
  type: string;
}

const STATUS_STYLES: Record<TaskStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-yellow-50 text-yellow-700' },
  SUBMITTED: { label: 'Submitted', className: 'bg-blue-50 text-blue-700' },
  APPROVED: { label: 'Approved', className: 'bg-green-50 text-green-700' },
  REJECTED: { label: 'Rejected', className: 'bg-red-50 text-red-700' },
  ACCEPTED_MINOR_ISSUES: { label: 'Minor Issues', className: 'bg-orange-50 text-orange-700' },
};

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      {[1, 2, 3, 4].map((i) => (
        <td key={i} className="px-6 py-4">
          <div
            className="h-4 animate-pulse rounded bg-gray-200"
            style={{ width: i === 4 ? '4rem' : '60%' }}
          />
        </td>
      ))}
    </tr>
  );
}

export default function StudentTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await api.get<Task[]>('/tasks');
        setTasks(res.data);
      } catch {
        // keep empty on failure
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, []);

  const filtered = tasks.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <DashboardLayout navItems={navItems}>
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-gray-500">
            {loading
              ? 'Loading…'
              : `${tasks.length} task${tasks.length !== 1 ? 's' : ''} assigned`}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 relative max-w-sm">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          strokeWidth={1.75}
        />
        <input
          type="text"
          placeholder="Search by title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Title
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Due Date
              </th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 mb-3">
                      <ClipboardList className="h-5 w-5 text-gray-300" strokeWidth={1.75} />
                    </div>
                    <p className="text-sm font-medium text-gray-500">
                      {search ? 'No tasks match your search' : 'No tasks assigned yet'}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {search
                        ? 'Try a different title.'
                        : 'Tasks assigned by your supervisor will appear here.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((task) => {
                const s = STATUS_STYLES[task.status] ?? STATUS_STYLES.PENDING;
                return (
                  <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{task.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5 capitalize">
                        {task.type.replace('_', ' ').toLowerCase()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.className}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(task.deadline).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
