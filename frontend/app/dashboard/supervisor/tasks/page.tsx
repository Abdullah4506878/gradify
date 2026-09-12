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
  CheckCircle2,
  XCircle,
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

interface GroupMember {
  id: number;
  name: string | null;
  email: string;
}

interface GroupEnrollment {
  userId: number;
  user: GroupMember;
}

interface Group {
  id: number;
  fypId: string | null;
  members: GroupEnrollment[];
}

interface MemberStatus {
  id: number;
  userId: number;
  isDone: boolean;
  user: GroupMember;
}

interface Submission {
  id: number;
  userId: number;
  description?: string | null;
  fileUrl?: string | null;
  githubLink?: string | null;
  createdAt: string;
  user: GroupMember;
}

interface Task {
  id: number;
  title: string;
  description?: string | null;
  deadline: string;
  status: TaskStatus;
  group: {
    id: number;
    fypId: string | null;
    members: GroupEnrollment[];
  };
  memberStatuses: MemberStatus[];
  submissions: Submission[];
}

type Flash = { type: 'success' | 'error'; text: string };

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

function formatDeadline(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) +
    ' by 11:59 PM';
}

export default function SupervisorTasksPage() {
  const [activeTab, setActiveTab] = useState<'assigned' | 'pending'>('assigned');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<Flash | null>(null);

  const [showAssign, setShowAssign] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [memberToggles, setMemberToggles] = useState<Record<number, boolean>>({});
  const [submittingApproval, setSubmittingApproval] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  const showFlash = (f: Flash) => {
    setFlash(f);
    setTimeout(() => setFlash(null), 4000);
  };

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get<Task[]>('/tasks/supervisor/my-tasks');
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
    setTaskTitle('');
    setTaskDesc('');
    setAssignError(null);
    try {
      const res = await api.get<Group[]>('/groups');
      setGroups(res.data);
    } catch {
      setGroups([]);
    }
  };

  const handleAssign = async () => {
    if (!selectedGroupId || !taskTitle.trim() || !taskDesc.trim()) {
      setAssignError('Please fill in all required fields.');
      return;
    }
    setAssignError(null);
    setAssigning(true);
    try {
      await api.post('/tasks', {
        groupId: Number(selectedGroupId),
        title: taskTitle.trim(),
        description: taskDesc.trim(),
      });
      setShowAssign(false);
      await fetchTasks();
      showFlash({ type: 'success', text: 'Task assigned to group successfully.' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setAssignError(typeof msg === 'string' ? msg : 'Failed to assign task. Please try again.');
    } finally {
      setAssigning(false);
    }
  };

  const openDetailDialog = (task: Task) => {
    setDetailTask(task);
    setApprovalError(null);
    const toggles: Record<number, boolean> = {};
    for (const enrollment of task.group.members) {
      const existing = task.memberStatuses.find((s) => s.userId === enrollment.userId);
      toggles[enrollment.userId] = existing?.isDone ?? false;
    }
    setMemberToggles(toggles);
  };

  const handleApproveMembers = async () => {
    if (!detailTask) return;
    const memberStatuses = detailTask.group.members.map((m) => ({
      userId: m.userId,
      isDone: memberToggles[m.userId] ?? false,
    }));

    setApprovalError(null);
    setSubmittingApproval(true);
    try {
      const res = await api.patch<Task>(`/tasks/${detailTask.id}/approve-members`, { memberStatuses });
      setTasks((prev) => prev.map((t) => (t.id === detailTask.id ? res.data : t)));
      setDetailTask(null);
      showFlash({ type: 'success', text: 'Member statuses saved successfully.' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setApprovalError(typeof msg === 'string' ? msg : 'Failed to save member statuses. Please try again.');
    } finally {
      setSubmittingApproval(false);
    }
  };

  const pendingTasks = tasks.filter((t) => t.status === 'PENDING');

  return (
    <DashboardLayout navItems={navItems}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-gray-500">
            {loading ? 'Loading…' : `${tasks.length} group task${tasks.length !== 1 ? 's' : ''}`}
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

      <div className="mb-4 flex gap-1 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('assigned')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === 'assigned' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          All Tasks
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === 'pending' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Pending Approval
          {pendingTasks.length > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 min-w-[1.25rem]">
              {pendingTasks.length}
            </span>
          )}
        </button>
      </div>

      {(activeTab === 'assigned' ? tasks : pendingTasks).length === 0 && !loading ? (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <ClipboardList className="h-8 w-8 text-gray-300 mb-3" strokeWidth={1.5} />
            <p className="text-sm font-medium text-gray-500">
              {activeTab === 'pending' ? 'No tasks pending approval' : 'No tasks assigned yet'}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {activeTab === 'pending' ? 'Tasks awaiting member approval will appear here.' : 'Click "Assign New Task" to get started.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-10">#</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Group</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Task Title</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Due Date</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
              ) : (
                (activeTab === 'assigned' ? tasks : pendingTasks).map((task, idx) => {
                  const status = STATUS_BADGES[task.status] ?? STATUS_BADGES.PENDING;
                  const doneCount = task.memberStatuses.filter((s) => s.isDone).length;
                  const memberCount = task.group.members.length;
                  return (
                    <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-400 tabular-nums">{idx + 1}</td>
                      <td className="px-6 py-4">
                        <p className="font-mono text-sm font-medium text-gray-900">{task.group.fypId ?? `Group #${task.group.id}`}</p>
                        {task.status === 'APPROVED' && memberCount > 0 && (
                          <p className="text-xs text-gray-400">{doneCount}/{memberCount} members done</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 font-medium">{task.title}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDeadline(task.deadline)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openDetailDialog(task)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                            task.status === 'SUBMITTED'
                              ? 'border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                              : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                          }`}
                        >
                          {task.status === 'SUBMITTED' ? 'Approve Members' : 'View'}


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

      <Dialog open={showAssign} onOpenChange={(open) => { if (!open) setShowAssign(false); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" showCloseButton>
          <DialogHeader>
            <DialogTitle>Assign New Task</DialogTitle>
          </DialogHeader>
          <div className="pt-2 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Group <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
              >
                <option value="">Select group…</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.fypId ?? `Group #${g.id}`}</option>
                ))}
              </select>
            </div>

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
                placeholder="Describe what the group needs to do…"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors resize-none"
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

      <Dialog open={!!detailTask} onOpenChange={(open) => { if (!open) setDetailTask(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" showCloseButton>
          <DialogHeader>
            <DialogTitle>
              {(detailTask?.status === 'PENDING' || detailTask?.status === 'SUBMITTED') ? 'Approve Members' : 'Task Details'}

            </DialogTitle>
          </DialogHeader>
          {detailTask && (() => {
            const status = STATUS_BADGES[detailTask.status] ?? STATUS_BADGES.PENDING;
            const isPending = detailTask.status === 'PENDING' || detailTask.status === 'SUBMITTED';


            return (
              <div className="pt-2 space-y-4">
                <div className="rounded-xl bg-gray-50 px-4 py-3 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Task</p>
                      <p className="text-sm font-semibold text-gray-900">{detailTask.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 font-mono">{detailTask.group.fypId ?? `Group #${detailTask.group.id}`}</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${status.className}`}>{status.label}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Due: {formatDeadline(detailTask.deadline)}
                  </p>
                  {detailTask.description && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Description</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{detailTask.description}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-700">Group Members</p>
                  {detailTask.group.members.map((enrollment) => {
                    const member = enrollment.user;
                    const isDone = memberToggles[enrollment.userId] ?? false;
                    const submission = detailTask.submissions.find((s) => s.userId === enrollment.userId);
                    return (
                      <div
                        key={enrollment.userId}
                        className="rounded-xl border border-gray-200 overflow-hidden"
                      >
                        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">{member.name ?? member.email}</p>
                            {member.name && <p className="text-xs text-gray-400 truncate">{member.email}</p>}
                          </div>
                          {isPending ? (
                            <button
                              type="button"
                              onClick={() => setMemberToggles((prev) => ({ ...prev, [enrollment.userId]: !prev[enrollment.userId] }))}
                              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                                isDone
                                  ? 'bg-green-50 text-green-700 border-2 border-green-300 hover:bg-green-100 hover:border-green-400'
                                  : 'bg-red-50 text-red-700 border-2 border-red-300 hover:bg-red-100 hover:border-red-400'
                              }`}
                            >
                              {isDone ? (
                                <><CheckCircle2 className="h-4 w-4" /> Done</>
                              ) : (
                                <><XCircle className="h-4 w-4" /> Not Done</>
                              )}
                            </button>
                          ) : (
                            <span className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${
                              isDone ? 'bg-green-50 text-green-700 border-2 border-green-300' : 'bg-red-50 text-red-700 border-2 border-red-300'
                            }`}>
                              {isDone ? (
                                <><CheckCircle2 className="h-4 w-4" /> Done</>
                              ) : (
                                <><XCircle className="h-4 w-4" /> Not Done</>
                              )}
                            </span>
                          )}
                        </div>
                        {submission ? (
                          <div className="bg-gray-50 px-4 py-3 space-y-2">
                            {submission.fileUrl && (
                              <a
                                href={`http://localhost:4000/uploads/${submission.fileUrl.replace('/uploads/', '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg bg-white border border-gray-200 px-3.5 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                              >
                                <Download className="h-4 w-4" />
                                Download File
                              </a>
                            )}
                            {submission.githubLink && submission.githubLink.trim() !== '' && (
                              <a
                                href={submission.githubLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg bg-white border border-gray-200 px-3.5 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                              >
                                <ExternalLink className="h-4 w-4" />
                                View GitHub Link
                              </a>
                            )}
                          </div>
                        ) : (
                          <div className="bg-gray-50 px-4 py-3">
                            <p className="text-sm text-gray-400 italic">Not submitted yet.</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {approvalError && (
                  <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{approvalError}</div>
                )}

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDetailTask(null)}
                    disabled={submittingApproval}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    {isPending ? 'Cancel' : 'Close'}
                  </button>
                  {isPending && (
                    <button
                      type="button"
                      onClick={handleApproveMembers}
                      disabled={submittingApproval}
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                      {submittingApproval && <Loader2 className="h-4 w-4 animate-spin" />}
                      {submittingApproval ? 'Saving…' : 'Submit All'}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
