'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  Calendar,
  User,
  FileText,
  ClipboardList,
  ClipboardCheck,
  PlusCircle,
  Loader2,
  ExternalLink,
  Download,
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
  { label: 'Dashboard', href: '/dashboard/supervisor', icon: LayoutDashboard },
  { label: 'My Groups', href: '/dashboard/supervisor/groups', icon: FolderOpen },
  { label: 'Minutes of Meeting', href: '/dashboard/supervisor/mom', icon: FileText },
  { label: 'Tasks', href: '/dashboard/supervisor/tasks', icon: ClipboardList },
  { label: 'Proposals', href: '/dashboard/supervisor/proposals', icon: ClipboardCheck },
  { label: 'Schedule', href: '/dashboard/supervisor/schedule', icon: Calendar },
  { label: 'Profile', href: '/dashboard/supervisor/profile', icon: User },
];

type TaskStatus = 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'MINOR_ISSUES' | 'REJECTED';
type TaskType = 'DOCUMENTATION' | 'DEVELOPMENT_WEB' | 'DEVELOPMENT_MOBILE';

type FypRole = 'DOCUMENTATION' | 'DEVELOPMENT';

interface GroupMember {
  id: number;
  name: string | null;
  email: string;
}

interface GroupEnrollment {
  userId: number;
  fypRole: FypRole | null;
  user: GroupMember;
}

interface Group {
  id: number;
  fypId: string | null;
  members: GroupEnrollment[];
}

interface TaskSubmission {
  id: number;
  description?: string | null;
  fileUrl?: string | null;
  githubLink?: string | null;
  createdAt: string;
  user: { id: number; name: string | null; email: string };
}

interface TaskReview {
  id: number;
  status: TaskStatus;
  reason: string;
  createdAt: string;
  reviewer: { id: number; name: string | null; email: string };
}

interface Task {
  id: number;
  title: string;
  description?: string | null;
  type: TaskType;
  deadline?: string | null;
  status: TaskStatus;
  assignedTo: { id: number; name: string | null; email: string };
  group: { id: number; fypId: string | null };
  submissions: TaskSubmission[];
  reviews: TaskReview[];
}

type Flash = { type: 'success' | 'error'; text: string };

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

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-gray-100">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 animate-pulse rounded bg-gray-200" style={{ width: i === 0 ? '2rem' : i === cols - 1 ? '6rem' : '60%' }} />
        </td>
      ))}
    </tr>
  );
}

export default function SupervisorTasksPage() {
  const [activeTab, setActiveTab] = useState<'assigned' | 'reviews'>('assigned');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<Flash | null>(null);

  // Assign dialog
  const [showAssign, setShowAssign] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [taskType, setTaskType] = useState<TaskType | ''>('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Review dialog
  const [reviewTask, setReviewTask] = useState<Task | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'APPROVED' | 'MINOR_ISSUES' | 'REJECTED' | ''>('');
  const [reviewReason, setReviewReason] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const showFlash = (f: Flash) => {
    setFlash(f);
    setTimeout(() => setFlash(null), 4000);
  };

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get<Task[]>('/tasks');
      setTasks(res.data);
    } catch {
      // keep empty on failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const openAssignDialog = async () => {
    setShowAssign(true);
    setSelectedGroupId('');
    setSelectedStudentId('');
    setTaskType('');
    setTaskTitle('');
    setTaskDesc('');
    setTaskDue('');
    setAssignError(null);
    try {
      const res = await api.get<Group[]>('/groups');
      setGroups(res.data);
    } catch {
      setGroups([]);
    }
  };

  const selectedGroup = groups.find((g) => String(g.id) === selectedGroupId);
  const groupEnrollments = selectedGroup?.members ?? [];
  const groupMembers = groupEnrollments.map((e) => e.user);
  const selectedEnrollment = groupEnrollments.find((e) => String(e.user.id) === selectedStudentId);
  const selectedStudentRole = selectedEnrollment?.fypRole ?? null;

  const handleAssign = async () => {
    if (!selectedGroupId || !selectedStudentId || !taskType || !taskTitle.trim() || !taskDesc.trim()) {
      setAssignError('Please fill in all required fields.');
      return;
    }
    setAssignError(null);
    setAssigning(true);
    try {
      await api.post('/tasks', {
        groupId: Number(selectedGroupId),
        assignedToId: Number(selectedStudentId),
        type: taskType,
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        deadline: taskDue || undefined,
      });
      setShowAssign(false);
      await fetchTasks();
      showFlash({ type: 'success', text: 'Task assigned successfully.' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setAssignError(typeof msg === 'string' ? msg : 'Failed to assign task. Please try again.');
    } finally {
      setAssigning(false);
    }
  };

  const openReviewDialog = (task: Task) => {
    setReviewTask(task);
    setReviewStatus('');
    setReviewReason('');
    setReviewError(null);
  };

  const handleReview = async () => {
    if (!reviewTask || !reviewStatus) {
      setReviewError('Please select a review decision.');
      return;
    }
    if (!reviewReason.trim()) {
      setReviewError('Please provide a reason for your decision.');
      return;
    }
    setReviewError(null);
    setSubmittingReview(true);
    try {
      const res = await api.post<Task>(`/tasks/${reviewTask.id}/review`, {
        status: reviewStatus,
        reason: reviewReason,
      });
      setTasks((prev) => prev.map((t) => t.id === reviewTask.id ? res.data : t));
      setReviewTask(null);
      showFlash({ type: 'success', text: 'Review submitted successfully.' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setReviewError(typeof msg === 'string' ? msg : 'Failed to submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const submittedTasks = tasks.filter((t) => t.status === 'SUBMITTED');

  return (
    <DashboardLayout navItems={navItems}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-gray-500">
            {loading ? 'Loading…' : `${tasks.length} task${tasks.length !== 1 ? 's' : ''} assigned`}
          </p>
        </div>
        <button
          type="button"
          onClick={openAssignDialog}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors shrink-0"
        >
          <PlusCircle className="h-4 w-4" strokeWidth={1.75} />
          Assign New Task
        </button>
      </div>

      {flash && (
        <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${flash.type === 'success' ? 'border-green-100 bg-green-50 text-green-700' : 'border-red-100 bg-red-50 text-red-700'}`}>
          {flash.text}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('assigned')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === 'assigned' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Assigned Tasks
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reviews')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === 'reviews' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Pending Reviews
          {submittedTasks.length > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 min-w-[1.25rem]">
              {submittedTasks.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Assigned Tasks */}
      {activeTab === 'assigned' && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-10">#</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Student</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Task Title</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Due Date</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-16 px-6">
                      <ClipboardList className="h-8 w-8 text-gray-300 mb-3" strokeWidth={1.5} />
                      <p className="text-sm font-medium text-gray-500">No tasks assigned yet</p>
                      <p className="mt-1 text-xs text-gray-400">Click "Assign New Task" to get started.</p>
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
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">{task.assignedTo.name ?? task.assignedTo.email}</p>
                        <p className="text-xs text-gray-400">{task.group.fypId}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 font-medium">{task.title}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${type.className}`}>{type.label}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {task.deadline ? new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openReviewDialog(task)}
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
      )}

      {/* Tab 2: Pending Reviews */}
      {activeTab === 'reviews' && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-10">#</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Student</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Task Title</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Submitted</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
              ) : submittedTasks.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center justify-center py-16 px-6">
                      <ClipboardCheck className="h-8 w-8 text-gray-300 mb-3" strokeWidth={1.5} />
                      <p className="text-sm font-medium text-gray-500">No pending reviews</p>
                      <p className="mt-1 text-xs text-gray-400">Tasks submitted by students will appear here.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                submittedTasks.map((task, idx) => {
                  const type = TYPE_BADGES[task.type] ?? { label: task.type, className: 'bg-gray-100 text-gray-600' };
                  const latestSubmission = task.submissions[0];
                  return (
                    <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-400 tabular-nums">{idx + 1}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">{task.assignedTo.name ?? task.assignedTo.email}</p>
                        <p className="text-xs text-gray-400">{task.group.fypId}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 font-medium">{task.title}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${type.className}`}>{type.label}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {latestSubmission ? new Date(latestSubmission.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openReviewDialog(task)}
                          className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100 transition-colors"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Assign Task Dialog ── */}
      <Dialog open={showAssign} onOpenChange={(open) => { if (!open) setShowAssign(false); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" showCloseButton>
          <DialogHeader>
            <DialogTitle>Assign New Task</DialogTitle>
          </DialogHeader>
          <div className="pt-2 space-y-4">
            {/* Group */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Group <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedGroupId}
                onChange={(e) => { setSelectedGroupId(e.target.value); setSelectedStudentId(''); }}
                className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
              >
                <option value="">Select group…</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.fypId ?? `Group #${g.id}`}</option>
                ))}
              </select>
            </div>

            {/* Student */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Student <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedStudentId(newId);
                  const enrollment = groupEnrollments.find((en) => String(en.user.id) === newId);
                  const role = enrollment?.fypRole;
                  if (role === 'DOCUMENTATION') setTaskType('DOCUMENTATION');
                  else if (role === 'DEVELOPMENT') setTaskType('DEVELOPMENT_WEB');
                  else setTaskType('');
                }}
                disabled={!selectedGroupId}
                className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors disabled:opacity-50"
              >
                <option value="">Select student…</option>
                {groupMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name ?? m.email}</option>
                ))}
              </select>
              {selectedStudentId && selectedStudentRole && (
                <div className="mt-1.5">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${selectedStudentRole === 'DOCUMENTATION' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                    {selectedStudentRole === 'DOCUMENTATION' ? '📄 Documentation' : '💻 Development'}
                  </span>
                </div>
              )}
            </div>

            {/* Task Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Task Type <span className="text-red-500">*</span>
              </label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as TaskType)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
              >
                {selectedStudentRole !== 'DOCUMENTATION' && selectedStudentRole !== 'DEVELOPMENT' && (
                  <option value="">Select type…</option>
                )}
                {(!selectedStudentRole || selectedStudentRole === 'DOCUMENTATION') && (
                  <option value="DOCUMENTATION">📄 Documentation</option>
                )}
                {(!selectedStudentRole || selectedStudentRole === 'DEVELOPMENT') && (
                  <option value="DEVELOPMENT_WEB">🌐 Development – Web</option>
                )}
                {(!selectedStudentRole || selectedStudentRole === 'DEVELOPMENT') && (
                  <option value="DEVELOPMENT_MOBILE">📱 Development – Mobile</option>
                )}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Enter task title…"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Description <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-gray-400">{taskDesc.length} / 400</span>
              </div>
              <textarea
                rows={5}
                maxLength={400}
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                placeholder="Describe what the student needs to do…"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors resize-none"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Due Date <span className="text-xs text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <input
                type="date"
                value={taskDue}
                onChange={(e) => setTaskDue(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
              />
            </div>

            {assignError && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{assignError}</div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAssign(false)}
                disabled={assigning}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssign}
                disabled={assigning}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {assigning && <Loader2 className="h-4 w-4 animate-spin" />}
                {assigning ? 'Assigning…' : 'Assign Task'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Review / View Task Dialog ── */}
      <Dialog open={!!reviewTask} onOpenChange={(open) => { if (!open) setReviewTask(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" showCloseButton>
          <DialogHeader>
            <DialogTitle>{reviewTask?.status === 'SUBMITTED' ? 'Review Task' : 'Task Details'}</DialogTitle>
          </DialogHeader>
          {reviewTask && (() => {
            const type = TYPE_BADGES[reviewTask.type] ?? { label: reviewTask.type, className: 'bg-gray-100 text-gray-600' };
            const status = STATUS_BADGES[reviewTask.status] ?? STATUS_BADGES.PENDING;
            const latestSubmission = reviewTask.submissions[0] ?? null;

            return (
              <div className="pt-2 space-y-4">
                {/* Task info */}
                <div className="rounded-xl bg-gray-50 px-4 py-3 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Task</p>
                      <p className="text-sm font-semibold text-gray-900">{reviewTask.title}</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${status.className}`}>{status.label}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${type.className}`}>{type.label}</span>
                    {reviewTask.deadline && (
                      <span className="text-xs text-gray-500">Due: {new Date(reviewTask.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    )}
                  </div>
                  {reviewTask.description && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Description</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{reviewTask.description}</p>
                    </div>
                  )}
                </div>

                {/* Student submission */}
                {latestSubmission ? (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Student Submission</p>
                    {latestSubmission.description && (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{latestSubmission.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3">
                      {latestSubmission.fileUrl && (
                        <a
                          href={`http://localhost:4000${latestSubmission.fileUrl}`}
                          download
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-800 underline underline-offset-2"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download File
                        </a>
                      )}
                      {latestSubmission.githubLink && (
                        <a
                          href={latestSubmission.githubLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-800 underline underline-offset-2"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          GitHub Link
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-sm text-gray-400 italic">No submission yet.</p>
                  </div>
                )}

                {/* Review section — only for SUBMITTED tasks */}
                {reviewTask.status === 'SUBMITTED' && (
                  <div className="space-y-3 pt-1">
                    <p className="text-sm font-semibold text-gray-700">Submit Review</p>

                    {/* Decision buttons */}
                    <div className="flex gap-2">
                      {(['APPROVED', 'MINOR_ISSUES', 'REJECTED'] as const).map((s) => {
                        const styles = {
                          APPROVED: { active: 'bg-green-600 text-white border-green-600', inactive: 'border-green-200 text-green-700 hover:bg-green-50' },
                          MINOR_ISSUES: { active: 'bg-yellow-500 text-white border-yellow-500', inactive: 'border-yellow-200 text-yellow-700 hover:bg-yellow-50' },
                          REJECTED: { active: 'bg-red-600 text-white border-red-600', inactive: 'border-red-200 text-red-700 hover:bg-red-50' },
                        };
                        const labels = { APPROVED: 'Approve', MINOR_ISSUES: 'Minor Issues', REJECTED: 'Reject' };
                        const isActive = reviewStatus === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setReviewStatus(s)}
                            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${isActive ? styles[s].active : styles[s].inactive}`}
                          >
                            {labels[s]}
                          </button>
                        );
                      })}
                    </div>

                    {/* Reason */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-sm font-medium text-gray-700">
                          Reason <span className="text-red-500">*</span>
                        </label>
                        <span className="text-xs text-gray-400">{reviewReason.length} / 300</span>
                      </div>
                      <textarea
                        rows={4}
                        maxLength={300}
                        value={reviewReason}
                        onChange={(e) => { setReviewReason(e.target.value); setReviewError(null); }}
                        placeholder="Provide detailed feedback (min. 30 characters)…"
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors resize-none"
                      />
                    </div>

                    {reviewError && (
                      <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{reviewError}</div>
                    )}

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setReviewTask(null)}
                        disabled={submittingReview}
                        className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleReview}
                        disabled={submittingReview}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                      >
                        {submittingReview && <Loader2 className="h-4 w-4 animate-spin" />}
                        {submittingReview ? 'Submitting…' : 'Submit Review'}
                      </button>
                    </div>
                  </div>
                )}

                {reviewTask.status !== 'SUBMITTED' && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setReviewTask(null)}
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
