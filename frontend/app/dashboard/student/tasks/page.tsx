'use client';

import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  User,
  FileText,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/lib/auth';
import api from '@/lib/api';

const navItems = [
  { label: 'Dashboard', href: '/dashboard/student', icon: LayoutDashboard },
  { label: 'My Group', href: '/dashboard/student/group', icon: Users },
  { label: 'Tasks', href: '/dashboard/student/tasks', icon: ClipboardList },
  { label: 'Minutes of Meeting', href: '/dashboard/student/mom', icon: FileText },
  { label: 'Profile', href: '/dashboard/student/profile', icon: User },
];

type TaskStatus = 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'MINOR_ISSUES' | 'REJECTED';

interface MemberStatus {
  userId: number;
  isDone: boolean;
}

interface Task {
  id: number;
  title: string;
  description?: string | null;
  deadline: string;
  status: TaskStatus;
  group: { id: number; fypId: string | null };
  memberStatuses: MemberStatus[];
}

const STATUS_BADGES: Record<TaskStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-gray-100 text-gray-600' },
  SUBMITTED: { label: 'Awaiting Review', className: 'bg-blue-50 text-blue-700' },
  APPROVED: { label: 'Approved', className: 'bg-green-50 text-green-700' },
  MINOR_ISSUES: { label: 'Minor Issues', className: 'bg-yellow-50 text-yellow-700' },
  REJECTED: { label: 'Rejected', className: 'bg-red-50 text-red-700' },
};

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 animate-pulse rounded bg-gray-200" style={{ width: i === 1 ? '2rem' : i === 5 ? '5rem' : '60%' }} />
        </td>
      ))}
    </tr>
  );
}

function formatDeadline(dateStr: string) {
  const d = new Date(dateStr);
  return 'Due: ' + d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) +
    ' by 11:59 PM';
}

export default function StudentTasksPage() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogTask, setDialogTask] = useState<Task | null>(null);

  useEffect(() => {
    api.get<Task[]>('/tasks/student/my-tasks')
      .then((res) => setTasks(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getMyStatus = (task: Task) => {
    if (!user?.id) return null;
    const status = task.memberStatuses.find((s) => s.userId === user.id);
    return status?.isDone ?? null;
  };

  const renderMyStatusBadge = (task: Task) => {
    if (task.status !== 'APPROVED') {
      const status = STATUS_BADGES[task.status] ?? STATUS_BADGES.PENDING;
      return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
          {status.label}
        </span>
      );
    }
    const isDone = getMyStatus(task);
    if (isDone === null) {
      return <span className="text-xs text-gray-400">—</span>;
    }
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        isDone ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
      }`}>
        {isDone ? 'Done ✅' : 'Not Done ❌'}
      </span>
    );
  };

  return (
    <DashboardLayout navItems={navItems}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tasks</h1>
        <p className="mt-1 text-sm text-gray-500">
          {loading ? 'Loading…' : `${tasks.length} group task${tasks.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-10">#</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Title</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Group</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">My Status</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Due Date</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <ClipboardList className="h-8 w-8 text-gray-300 mb-3" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-gray-500">No group tasks yet</p>
                    <p className="mt-1 text-xs text-gray-400">Tasks assigned to your group will appear here.</p>
                  </div>
                </td>
              </tr>
            ) : (
              tasks.map((task, idx) => (
                <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-400 tabular-nums">{idx + 1}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{task.title}</td>
                  <td className="px-6 py-4 font-mono text-sm text-gray-600">{task.group.fypId ?? `Group #${task.group.id}`}</td>
                  <td className="px-6 py-4">{renderMyStatusBadge(task)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDeadline(task.deadline)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => setDialogTask(task)}
                      className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100 transition-colors"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!dialogTask} onOpenChange={(open) => { if (!open) setDialogTask(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" showCloseButton>
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          {dialogTask && (() => {
            const isDone = getMyStatus(dialogTask);
            return (
              <div className="pt-2 space-y-4">
                <div className="rounded-xl bg-gray-50 px-4 py-3 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-900">{dialogTask.title}</p>
                    {renderMyStatusBadge(dialogTask)}
                  </div>
                  <p className="text-xs text-gray-500 font-mono">{dialogTask.group.fypId ?? `Group #${dialogTask.group.id}`}</p>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Due Date</p>
                    <p className="text-sm text-gray-700">
                      {formatDeadline(dialogTask.deadline)}
                    </p>
                  </div>
                  {dialogTask.description && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Description</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{dialogTask.description}</p>
                    </div>
                  )}
                </div>

                {dialogTask.status === 'APPROVED' && isDone !== null && (
                  <div className={`rounded-xl border px-4 py-4 text-center ${
                    isDone ? 'border-green-100 bg-green-50' : 'border-red-100 bg-red-50'
                  }`}>
                    <p className="text-2xl mb-1">{isDone ? '✅' : '❌'}</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {isDone ? 'Marked as Done' : 'Marked as Not Done'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Your supervisor has reviewed this task.</p>
                  </div>
                )}

                {dialogTask.status === 'PENDING' && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-sm text-gray-500">Submit your work before the deadline</p>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setDialogTask(null)}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
