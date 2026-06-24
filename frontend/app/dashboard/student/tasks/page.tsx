'use client';

import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  User,
  Search,
  Loader2,
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
  { label: 'Profile', href: '/dashboard/student/profile', icon: User },
];

type TaskStatus = 'PENDING' | 'SUBMITTED' | 'REVIEWED' | 'APPROVED' | 'REJECTED' | 'ACCEPTED_MINOR_ISSUES';

interface TaskSubmission {
  description: string;
  fileUrl?: string | null;
}

interface Task {
  id: number;
  title: string;
  description?: string;
  deadline: string;
  status: TaskStatus;
  type?: string;
  submission?: TaskSubmission | null;
}

const STATUS_STYLES: Record<TaskStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-yellow-50 text-yellow-700' },
  SUBMITTED: { label: 'Submitted', className: 'bg-blue-50 text-blue-700' },
  REVIEWED: { label: 'Reviewed', className: 'bg-green-50 text-green-700' },
  APPROVED: { label: 'Approved', className: 'bg-green-50 text-green-700' },
  REJECTED: { label: 'Rejected', className: 'bg-red-50 text-red-700' },
  ACCEPTED_MINOR_ISSUES: { label: 'Minor Issues', className: 'bg-orange-50 text-orange-700' },
};

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="px-6 py-4">
          <div
            className="h-4 animate-pulse rounded bg-gray-200"
            style={{ width: i === 1 ? '2rem' : i === 6 ? '7rem' : '60%' }}
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

  // View dialog
  const [viewTask, setViewTask] = useState<Task | null>(null);

  // Submit dialog
  const [submitTask, setSubmitTask] = useState<Task | null>(null);
  const [submitDesc, setSubmitDesc] = useState('');
  const [submitFile, setSubmitFile] = useState<File | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

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

  const handleSubmit = async () => {
    if (!submitTask) return;
    const wordCount = countWords(submitDesc);
    if (wordCount < 100) {
      setSubmitError(`Description must be at least 100 words (currently ${wordCount}).`);
      return;
    }
    setSubmitError(null);
    setSubmitLoading(true);
    try {
      const formData = new FormData();
      formData.append('description', submitDesc.trim());
      if (submitFile) formData.append('file', submitFile);

      await api.post(`/tasks/${submitTask.id}/submit`, formData);

      setTasks((prev) =>
        prev.map((t) =>
          t.id === submitTask.id ? { ...t, status: 'SUBMITTED' as TaskStatus } : t,
        ),
      );
      setSubmitSuccess(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSubmitError(typeof msg === 'string' ? msg : 'Failed to submit task. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const openSubmitDialog = (task: Task) => {
    setSubmitTask(task);
    setSubmitDesc('');
    setSubmitFile(null);
    setSubmitError(null);
    setSubmitSuccess(false);
  };

  const filtered = tasks.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase()),
  );

  const wordCount = countWords(submitDesc);

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
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-12">
                #
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Title
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Description
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
                <td colSpan={6}>
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
              filtered.map((task, idx) => {
                const s = STATUS_STYLES[task.status] ?? STATUS_STYLES.PENDING;
                const descTrunc = task.description
                  ? task.description.length > 80
                    ? task.description.slice(0, 80) + '…'
                    : task.description
                  : null;
                return (
                  <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-400 tabular-nums">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{task.title}</p>
                      {task.type && (
                        <p className="text-xs text-gray-400 mt-0.5 capitalize">
                          {task.type.replace(/_/g, ' ').toLowerCase()}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                      {descTrunc ?? <span className="italic text-gray-300">—</span>}
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
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setViewTask(task)}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                        >
                          View
                        </button>
                        {task.status === 'PENDING' && (
                          <button
                            type="button"
                            onClick={() => openSubmitDialog(task)}
                            className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100 transition-colors"
                          >
                            Submit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── View Task Dialog ── */}
      <Dialog open={!!viewTask} onOpenChange={(open) => { if (!open) setViewTask(null); }}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          {viewTask && (() => {
            const s = STATUS_STYLES[viewTask.status] ?? STATUS_STYLES.PENDING;
            return (
              <div className="pt-2 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold text-gray-900">{viewTask.title}</h3>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${s.className}`}>
                    {s.label}
                  </span>
                </div>

                {viewTask.type && (
                  <p className="text-xs text-gray-400 uppercase tracking-wide">
                    {viewTask.type.replace(/_/g, ' ')}
                  </p>
                )}

                <div className="rounded-xl bg-gray-50 px-4 py-3 space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Due Date</p>
                    <p className="text-sm text-gray-700">
                      {new Date(viewTask.deadline).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  {viewTask.description && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Description</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {viewTask.description}
                      </p>
                    </div>
                  )}
                </div>

                {viewTask.submission && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-500 mb-1">Your Submission</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {viewTask.submission.description}
                    </p>
                    {viewTask.submission.fileUrl && (
                      <a
                        href={`http://localhost:4000${viewTask.submission.fileUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 underline underline-offset-2"
                      >
                        View Attachment
                      </a>
                    )}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setViewTask(null)}
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

      {/* ── Submit Task Dialog ── */}
      <Dialog open={!!submitTask} onOpenChange={(open) => { if (!open) { setSubmitTask(null); setSubmitSuccess(false); } }}>
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Submit Task</DialogTitle>
          </DialogHeader>
          {submitTask && (
            <div className="pt-2 space-y-5">
              <div className="rounded-lg bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Task</p>
                <p className="text-sm font-medium text-gray-900">{submitTask.title}</p>
              </div>

              {submitSuccess ? (
                <div className="flex flex-col items-center py-6 gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <ClipboardList className="h-6 w-6 text-green-600" strokeWidth={1.75} />
                  </div>
                  <p className="text-sm font-semibold text-gray-900">Task Submitted!</p>
                  <p className="text-xs text-gray-400">Your supervisor will review your submission.</p>
                  <button
                    type="button"
                    onClick={() => { setSubmitTask(null); setSubmitSuccess(false); }}
                    className="mt-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <>
                  {/* Description */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="submitDesc" className="block text-sm font-medium text-gray-700">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <span className={`text-xs font-medium ${wordCount >= 100 ? 'text-green-600' : 'text-gray-400'}`}>
                        {wordCount} / 100 words
                      </span>
                    </div>
                    <textarea
                      id="submitDesc"
                      rows={6}
                      value={submitDesc}
                      onChange={(e) => { setSubmitDesc(e.target.value); setSubmitError(null); }}
                      placeholder="Describe your work, methodology, and outcomes in detail…"
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors resize-none"
                    />
                    <p className="mt-1 text-xs text-gray-400">Minimum 100 words required</p>
                  </div>

                  {/* File upload */}
                  <div>
                    <label htmlFor="submitFile" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Attachment
                      <span className="ml-1.5 text-xs text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      id="submitFile"
                      type="file"
                      onChange={(e) => setSubmitFile(e.target.files?.[0] ?? null)}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1 file:text-xs file:font-medium file:text-indigo-700 hover:file:bg-indigo-100 transition-colors cursor-pointer"
                    />
                    {submitFile && (
                      <p className="mt-1 text-xs text-gray-500">{submitFile.name}</p>
                    )}
                  </div>

                  {submitError && (
                    <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {submitError}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSubmitTask(null)}
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
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
