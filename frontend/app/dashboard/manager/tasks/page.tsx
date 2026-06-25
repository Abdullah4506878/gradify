'use client';

import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FolderOpen,
  BarChart,
  BarChart2,
  FileText,
  User,
  Search,
  ClipboardCheck,
  ClipboardList,
  Download,
  ExternalLink,
  BookOpen,
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
  { label: 'Profile', href: '/dashboard/manager/profile', icon: User },
];

type TaskStatus = 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'MINOR_ISSUES' | 'REJECTED';
type TaskType = 'DOCUMENTATION' | 'DEVELOPMENT_WEB' | 'DEVELOPMENT_MOBILE';

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
  supervisor: { id: number; name: string | null; email: string };
  group: { id: number; fypId: string };
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
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 animate-pulse rounded bg-gray-200" style={{ width: i === 1 ? '2rem' : i === 8 ? '5rem' : '65%' }} />
        </td>
      ))}
    </tr>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function ManagerTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [viewTask, setViewTask] = useState<Task | null>(null);

  useEffect(() => {
    api.get<Task[]>('/tasks')
      .then((res) => setTasks(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const uniqueGroups = Array.from(new Map(tasks.map((t) => [t.group.fypId, t.group])).values());

  const filtered = tasks.filter((t) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      (t.assignedTo.name ?? t.assignedTo.email).toLowerCase().includes(q) ||
      t.title.toLowerCase().includes(q);
    const matchesStatus = !statusFilter || t.status === statusFilter;
    const matchesGroup = !groupFilter || t.group.fypId === groupFilter;
    return matchesSearch && matchesStatus && matchesGroup;
  });

  const stats = {
    total: tasks.length,
    approved: tasks.filter((t) => t.status === 'APPROVED').length,
    pending: tasks.filter((t) => t.status === 'PENDING').length,
    rejected: tasks.filter((t) => t.status === 'REJECTED').length,
  };

  return (
    <DashboardLayout navItems={navItems}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Task Progress</h1>
        <p className="mt-1 text-sm text-gray-500">
          {loading ? 'Loading…' : `${tasks.length} task${tasks.length !== 1 ? 's' : ''} total`}
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Tasks" value={stats.total} color="text-gray-900" />
        <StatCard label="Approved" value={stats.approved} color="text-green-600" />
        <StatCard label="Pending" value={stats.pending} color="text-gray-500" />
        <StatCard label="Rejected" value={stats.rejected} color="text-red-600" />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Search by student or title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="SUBMITTED">Awaiting Review</option>
          <option value="APPROVED">Approved</option>
          <option value="MINOR_ISSUES">Minor Issues</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
        >
          <option value="">All Groups</option>
          {uniqueGroups.map((g) => (
            <option key={g.fypId} value={g.fypId}>{g.fypId}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-10">#</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Student</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Group FYP ID</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Task Title</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Due Date</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <ClipboardList className="h-8 w-8 text-gray-300 mb-3" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-gray-500">
                      {search || statusFilter || groupFilter ? 'No tasks match your filters' : 'No tasks found'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((task, idx) => {
                const type = TYPE_BADGES[task.type] ?? { label: task.type, className: 'bg-gray-100 text-gray-600' };
                const status = STATUS_BADGES[task.status] ?? STATUS_BADGES.PENDING;
                return (
                  <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 text-sm text-gray-400 tabular-nums">{idx + 1}</td>
                    <td className="px-5 py-4 text-sm font-medium text-gray-900">{task.assignedTo.name ?? task.assignedTo.email}</td>
                    <td className="px-5 py-4 font-mono text-sm text-gray-700">{task.group.fypId}</td>
                    <td className="px-5 py-4 text-sm text-gray-700 max-w-[180px] truncate">{task.title}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${type.className}`}>{type.label}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {task.deadline ? new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setViewTask(task)}
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

      {/* ── View Task Dialog ── */}
      <Dialog open={!!viewTask} onOpenChange={(open) => { if (!open) setViewTask(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" showCloseButton>
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          {viewTask && (() => {
            const type = TYPE_BADGES[viewTask.type] ?? { label: viewTask.type, className: 'bg-gray-100 text-gray-600' };
            const status = STATUS_BADGES[viewTask.status] ?? STATUS_BADGES.PENDING;

            return (
              <div className="pt-2 space-y-4">
                {/* Task summary */}
                <div className="rounded-xl bg-gray-50 px-4 py-3 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-900">{viewTask.title}</p>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${status.className}`}>{status.label}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${type.className}`}>{type.label}</span>
                    <span>Group: <span className="font-mono font-medium text-gray-700">{viewTask.group.fypId}</span></span>
                    {viewTask.deadline && <span>Due: {new Date(viewTask.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                  </div>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <p>Student: <span className="font-medium text-gray-700">{viewTask.assignedTo.name ?? viewTask.assignedTo.email}</span></p>
                    <p>Supervisor: <span className="font-medium text-gray-700">{viewTask.supervisor.name ?? viewTask.supervisor.email}</span></p>
                  </div>
                  {viewTask.description && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Description</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{viewTask.description}</p>
                    </div>
                  )}
                </div>

                {/* Submissions */}
                {viewTask.submissions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Submissions ({viewTask.submissions.length})
                    </p>
                    {viewTask.submissions.map((sub, i) => (
                      <div key={sub.id} className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 space-y-2">
                        <p className="text-xs text-blue-600 font-medium">
                          Submission #{i + 1} — {new Date(sub.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        {sub.description && (
                          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{sub.description}</p>
                        )}
                        <div className="flex flex-wrap gap-3">
                          {sub.fileUrl && (
                            <a
                              href={`http://localhost:4000${sub.fileUrl}`}
                              download
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-800 underline underline-offset-2"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Download File
                            </a>
                          )}
                          {sub.githubLink && (
                            <a
                              href={sub.githubLink}
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
                    ))}
                  </div>
                )}

                {/* Reviews */}
                {viewTask.reviews.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Reviews ({viewTask.reviews.length})
                    </p>
                    {viewTask.reviews.map((rev, i) => {
                      const revStatus = STATUS_BADGES[rev.status] ?? STATUS_BADGES.PENDING;
                      return (
                        <div key={rev.id} className="rounded-xl border border-gray-200 bg-white px-4 py-3 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-gray-500 font-medium">
                              Review #{i + 1} — {new Date(rev.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${revStatus.className}`}>{revStatus.label}</span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{rev.reason}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex justify-end pt-1">
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
    </DashboardLayout>
  );
}
