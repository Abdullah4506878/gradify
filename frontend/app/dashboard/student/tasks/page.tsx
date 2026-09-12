'use client';

import { useEffect, useState, useRef } from 'react';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  User,
  FileText,
  Loader2,
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

type Flash = { type: 'success' | 'error'; text: string };

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
  const [flash, setFlash] = useState<Flash | null>(null);

  const [submitFile, setSubmitFile] = useState<File | null>(null);
  const [submitDesc, setSubmitDesc] = useState('');
  const [submitGithub, setSubmitGithub] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showFlash = (f: Flash) => {
    setFlash(f);
    setTimeout(() => setFlash(null), 4000);
  };

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

  const openDialog = (task: Task) => {
    setDialogTask(task);
    setSubmitFile(null);
    setSubmitDesc('');
    setSubmitGithub('');
    setSubmitError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!dialogTask) return;
    if (!submitFile) {
      setSubmitError('Please select a file to upload.');
      return;
    }

    setSubmitError(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', submitFile);
      if (submitDesc.trim()) formData.append('description', submitDesc.trim());
      if (submitGithub.trim()) formData.append('githubLink', submitGithub.trim());

      await api.post(`/tasks/${dialogTask.id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setDialogTask(null);
      showFlash({ type: 'success', text: 'Task submitted successfully.' });

      const res = await api.get<Task[]>('/tasks/student/my-tasks');
      setTasks(res.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSubmitError(typeof msg === 'string' ? msg : 'Failed to submit task. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout navItems={navItems}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tasks</h1>
        <p className="mt-1 text-sm text-gray-500">
          {loading ? 'Loading…' : `${tasks.length} group task${tasks.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {flash && (
        <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${flash.type === 'success' ? 'border-green-100 bg-green-50 text-green-700' : 'border-red-100 bg-red-50 text-red-700'}`}>
          {flash.text}
        </div>
      )}

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
                      onClick={() => openDialog(task)}
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
            const isPending = dialogTask.status === 'PENDING';
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

                {isPending && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Upload File <span className="text-red-500">*</span>
                      </label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={(e) => setSubmitFile(e.target.files?.[0] ?? null)}
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-sm font-medium text-gray-700">
                          Description <span className="text-gray-400">(optional)</span>
                        </label>
                        <span className="text-xs text-gray-400">{submitDesc.length} / 400</span>
                      </div>
                      <textarea
                        rows={3}
                        maxLength={400}
                        value={submitDesc}
                        onChange={(e) => setSubmitDesc(e.target.value)}
                        placeholder="Add any notes about your submission…"
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors resize-none max-h-[120px] overflow-y-auto"

                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        GitHub Link <span className="text-gray-400">(optional)</span>
                      </label>
                      <input
                        type="url"
                        value={submitGithub}
                        onChange={(e) => setSubmitGithub(e.target.value)}
                        placeholder="https://github.com/…"
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                      />
                    </div>

                    {submitError && (
                      <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div>
                    )}

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setDialogTask(null)}
                        disabled={submitting}
                        className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                      >
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {submitting ? 'Submitting…' : 'Submit Task'}
                      </button>
                    </div>
                  </div>
                )}

                {!isPending && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setDialogTask(null)}
                      className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
