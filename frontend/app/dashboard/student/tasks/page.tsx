'use client';

import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  User,
  Loader2,
  ExternalLink,
  FileText,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/api';

const navItems = [
  { label: 'Dashboard', href: '/dashboard/student', icon: LayoutDashboard },
  { label: 'My Group', href: '/dashboard/student/group', icon: Users },
  { label: 'Tasks', href: '/dashboard/student/tasks', icon: ClipboardList },
  { label: 'Minutes of Meeting', href: '/dashboard/student/mom', icon: FileText },
  { label: 'Profile', href: '/dashboard/student/profile', icon: User },
];

type TaskStatus = 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'MINOR_ISSUES' | 'REJECTED';
type TaskType = 'DOCUMENTATION' | 'DEVELOPMENT_WEB' | 'DEVELOPMENT_MOBILE';

interface TaskSubmission {
  id: number;
  description?: string | null;
  fileUrl?: string | null;
  githubLink?: string | null;
  createdAt: string;
}

interface TaskReview {
  id: number;
  status: TaskStatus;
  reason: string;
  createdAt: string;
}

interface Task {
  id: number;
  title: string;
  description?: string | null;
  deadline?: string | null;
  status: TaskStatus;
  type: TaskType;
  submissions: TaskSubmission[];
  reviews: TaskReview[];
}

const TYPE_BADGES: Record<TaskType, { label: string; className: string }> = {
  DOCUMENTATION: { label: '📄 Documentation', className: 'bg-blue-50 text-blue-700' },
  DEVELOPMENT_WEB: { label: '🌐 Web Dev', className: 'bg-green-50 text-green-700' },
  DEVELOPMENT_MOBILE: { label: '📱 Mobile Dev', className: 'bg-purple-50 text-purple-700' },
};

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
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 animate-pulse rounded bg-gray-200" style={{ width: i === 1 ? '2rem' : i === 6 ? '7rem' : '60%' }} />
        </td>
      ))}
    </tr>
  );
}

export default function StudentTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogTask, setDialogTask] = useState<Task | null>(null);
  const [submitDesc, setSubmitDesc] = useState('');
  const [submitFile, setSubmitFile] = useState<File | null>(null);
  const [submitGithub, setSubmitGithub] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Task[]>('/tasks')
      .then((res) => setTasks(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openDialog = (task: Task) => {
    setDialogTask(task);
    setSubmitDesc('');
    setSubmitFile(null);
    setSubmitGithub('');
    setSubmitError(null);
    setFileError(null);
    setSubmitSuccess(false);
  };

  const canSubmit = (status: TaskStatus) =>
    status === 'PENDING' || status === 'REJECTED' || status === 'MINOR_ISSUES';

  const handleSubmit = async () => {
    if (!dialogTask) return;

    let hasError = false;
    if (!submitFile) {
      setFileError('A file attachment is required.');
      hasError = true;
    } else {
      setFileError(null);
    }
    if (hasError) return;

    setSubmitError(null);
    setSubmitLoading(true);
    try {
      const formData = new FormData();
      if (submitDesc.trim()) formData.append('description', submitDesc.trim());
      formData.append('file', submitFile!);
      if (submitGithub.trim()) formData.append('githubLink', submitGithub.trim());

      await api.post(`/tasks/${dialogTask.id}/submit`, formData);

      setTasks((prev) =>
        prev.map((t) => t.id === dialogTask.id ? { ...t, status: 'SUBMITTED' as TaskStatus } : t),
      );
      setSubmitSuccess(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSubmitError(typeof msg === 'string' ? msg : 'Failed to submit. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <DashboardLayout navItems={navItems}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tasks</h1>
        <p className="mt-1 text-sm text-gray-500">
          {loading ? 'Loading…' : `${tasks.length} task${tasks.length !== 1 ? 's' : ''} assigned`}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-10">#</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Title</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
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
                    <p className="text-sm font-medium text-gray-500">No tasks assigned yet</p>
                    <p className="mt-1 text-xs text-gray-400">Tasks assigned by your supervisor will appear here.</p>
                  </div>
                </td>
              </tr>
            ) : (
              tasks.map((task, idx) => {
                const type = TYPE_BADGES[task.type] ?? { label: task.type, className: 'bg-gray-100 text-gray-600' };
                const status = STATUS_BADGES[task.status] ?? STATUS_BADGES.PENDING;
                return (
                  <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-400 tabular-nums">{idx + 1}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{task.title}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${type.className}`}>{type.label}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {task.deadline ? new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openDialog(task)}
                        className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100 transition-colors"
                      >
                        View &amp; Submit
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── View & Submit Dialog ── */}
      <Dialog open={!!dialogTask} onOpenChange={(open) => { if (!open) { setDialogTask(null); setSubmitSuccess(false); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" showCloseButton>
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          {dialogTask && (() => {
            const type = TYPE_BADGES[dialogTask.type] ?? { label: dialogTask.type, className: 'bg-gray-100 text-gray-600' };
            const status = STATUS_BADGES[dialogTask.status] ?? STATUS_BADGES.PENDING;
            const latestReview = dialogTask.reviews[0] ?? null;

            return (
              <div className="pt-2 space-y-4">
                {/* Task info */}
                <div className="rounded-xl bg-gray-50 px-4 py-3 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-900">{dialogTask.title}</p>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${status.className}`}>{status.label}</span>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${type.className}`}>{type.label}</span>
                  {dialogTask.deadline && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Due Date</p>
                      <p className="text-sm text-gray-700">{new Date(dialogTask.deadline).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                  )}
                  {dialogTask.description && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Description</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{dialogTask.description}</p>
                    </div>
                  )}
                </div>

                {/* Previous review feedback */}
                {(dialogTask.status === 'REJECTED' || dialogTask.status === 'MINOR_ISSUES') && latestReview && (
                  <div className={`rounded-xl border px-4 py-3 space-y-1 ${dialogTask.status === 'REJECTED' ? 'border-red-100 bg-red-50' : 'border-yellow-100 bg-yellow-50'}`}>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${dialogTask.status === 'REJECTED' ? 'text-red-600' : 'text-yellow-700'}`}>
                      {dialogTask.status === 'REJECTED' ? 'Rejection Feedback' : 'Minor Issues Feedback'}
                    </p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{latestReview.reason}</p>
                  </div>
                )}

                {/* Approved state */}
                {dialogTask.status === 'APPROVED' && (
                  <div className="flex flex-col items-center py-6 gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                      <span className="text-2xl">✅</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">Approved</p>
                    <p className="text-xs text-gray-400">Your supervisor has approved this task.</p>
                    <button
                      type="button"
                      onClick={() => setDialogTask(null)}
                      className="mt-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                )}

                {/* Submitted state — no form */}
                {dialogTask.status === 'SUBMITTED' && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Awaiting Review</p>
                    <p className="text-sm text-gray-600">Your submission is being reviewed by your supervisor.</p>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setDialogTask(null)}
                        className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}

                {/* Submit form */}
                {canSubmit(dialogTask.status) && (
                  submitSuccess ? (
                    <div className="flex flex-col items-center py-6 gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                        <ClipboardList className="h-6 w-6 text-green-600" strokeWidth={1.75} />
                      </div>
                      <p className="text-sm font-semibold text-gray-900">Task Submitted!</p>
                      <p className="text-xs text-gray-400">Your supervisor will review your submission.</p>
                      <button
                        type="button"
                        onClick={() => { setDialogTask(null); setSubmitSuccess(false); }}
                        className="mt-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm font-semibold text-gray-700">Submit Your Work</p>

                      {/* Description */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-sm font-medium text-gray-700">
                            Description
                            <span className="ml-1 text-xs text-gray-400 font-normal">(optional)</span>
                          </label>
                          <span className="text-xs text-gray-400">{submitDesc.length} / 400</span>
                        </div>
                        <textarea
                          rows={4}
                          maxLength={400}
                          value={submitDesc}
                          onChange={(e) => setSubmitDesc(e.target.value)}
                          placeholder="Describe your work, methodology, and outcomes…"
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors resize-none"
                        />
                      </div>

                      {/* File upload */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          File Attachment <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="file"
                          onChange={(e) => { setSubmitFile(e.target.files?.[0] ?? null); setFileError(null); }}
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1 file:text-xs file:font-medium file:text-indigo-700 hover:file:bg-indigo-100 transition-colors cursor-pointer"
                        />
                        {fileError && <p className="mt-1 text-xs text-red-600">{fileError}</p>}
                        {submitFile && !fileError && (
                          <p className="mt-1 text-xs text-gray-500">{submitFile.name}</p>
                        )}
                      </div>

                      {/* GitHub link */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          GitHub Link
                          <span className="ml-1 text-xs text-gray-400 font-normal">(optional)</span>
                        </label>
                        <div className="relative">
                          <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={1.75} />
                          <input
                            type="url"
                            value={submitGithub}
                            onChange={(e) => setSubmitGithub(e.target.value)}
                            placeholder="https://github.com/…"
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                          />
                        </div>
                      </div>

                      {submitError && (
                        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setDialogTask(null)}
                          disabled={submitLoading}
                          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSubmit}
                          disabled={submitLoading}
                          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                        >
                          {submitLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                          {submitLoading ? 'Submitting…' : 'Submit Task'}
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
