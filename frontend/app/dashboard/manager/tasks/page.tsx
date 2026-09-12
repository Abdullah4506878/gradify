'use client';

import { useEffect, useState } from 'react';
import {
  Search,
  ClipboardList,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import api from '@/lib/api';

type TaskStatus = 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'MINOR_ISSUES' | 'REJECTED';

interface MemberStatus {
  userId: number;
  isDone: boolean;
  user: { id: number; name: string | null; email: string };
}

interface Task {
  id: number;
  title: string;
  description?: string | null;
  deadline: string;
  status: TaskStatus;
  supervisor: { id: number; name: string | null; email: string };
  group: {
    id: number;
    fypId: string | null;
    members: { userId: number; user: { id: number; name: string | null; email: string } }[];
    proposal: { projectTitle: string } | null;
  };
  memberStatuses: MemberStatus[];
}

interface SearchResult {
  studentId: number;
  studentName: string | null;
  studentEmail: string;
  rollNumber: string | null;
  groupId: number;
  fypId: string | null;
  groupStatus: string;
  supervisorName: string | null;
  projectTitle: string | null;
  taskStats: { total: number; pending: number; completed: number };
}

const STATUS_BADGES: Record<TaskStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-gray-100 text-gray-600' },
  SUBMITTED: { label: 'Awaiting Review', className: 'bg-blue-50 text-blue-700' },
  APPROVED: { label: 'Approved', className: 'bg-green-50 text-green-700' },
  MINOR_ISSUES: { label: 'Minor Issues', className: 'bg-yellow-50 text-yellow-700' },
  REJECTED: { label: 'Rejected', className: 'bg-red-50 text-red-700' },
};

const GROUP_STATUS_BADGES: Record<string, { label: string; className: string }> = {
  FORMING: { label: 'Forming', className: 'bg-gray-100 text-gray-600' },
  ACTIVE: { label: 'Active', className: 'bg-blue-50 text-blue-700' },
  COMPLETED: { label: 'Completed', className: 'bg-green-50 text-green-700' },
};

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 animate-pulse rounded bg-gray-200" style={{ width: i === 1 ? '2rem' : i === 7 ? '5rem' : '65%' }} />
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

function SearchResultCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200 mb-2" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200 mb-4" />
      <div className="h-3 w-full animate-pulse rounded bg-gray-200 mb-1.5" />
      <div className="h-3 w-full animate-pulse rounded bg-gray-200 mb-1.5" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200" />
    </div>
  );
}

function SearchResultCard({ result }: { result: SearchResult }) {
  const groupStatus = GROUP_STATUS_BADGES[result.groupStatus] ?? GROUP_STATUS_BADGES.FORMING;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{result.studentName ?? result.studentEmail}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {result.rollNumber ?? '—'} · {result.studentEmail}
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${groupStatus.className}`}>
          {groupStatus.label}
        </span>
      </div>

      <div className="mt-3 space-y-0.5 text-xs text-gray-500">
        <p>Group: <span className="font-mono font-medium text-gray-700">{result.fypId ?? `Group #${result.groupId}`}</span></p>
        <p>Supervisor: <span className="font-medium text-gray-700">{result.supervisorName ?? 'Not assigned'}</span></p>
        <p>Project: <span className="font-medium text-gray-700">{result.projectTitle ?? '—'}</span></p>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
          {result.taskStats.total} total
        </span>
        <span className="inline-flex items-center rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
          {result.taskStats.pending} pending
        </span>
        <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
          {result.taskStats.completed} completed
        </span>
      </div>
    </div>
  );
}

function formatDeadline(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) +
    ' by 11:59 PM';
}

export default function ManagerTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [viewTask, setViewTask] = useState<Task | null>(null);

  useEffect(() => {
    api.get<Task[]>('/tasks/manager/all')
      .then((res) => setTasks(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Debounce the raw search input by 300ms before triggering the server search.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    if (!debouncedSearch) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);
    api.get<SearchResult[]>('/tasks/manager/search', { params: { q: debouncedSearch } })
      .then((res) => {
        if (!cancelled) setSearchResults(res.data);
      })
      .catch(() => {
        if (!cancelled) setSearchResults([]);
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  const isSearching = debouncedSearch.length > 0;

  const filtered = tasks.filter((t) => !statusFilter || t.status === statusFilter);

  const stats = {
    total: tasks.length,
    approved: tasks.filter((t) => t.status === 'APPROVED').length,
    pending: tasks.filter((t) => t.status === 'PENDING').length,
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Task Progress</h1>
        <p className="mt-1 text-sm text-gray-500">
          {loading ? 'Loading…' : `${tasks.length} group task${tasks.length !== 1 ? 's' : ''} total`}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Total Tasks" value={stats.total} color="text-gray-900" />
        <StatCard label="Approved" value={stats.approved} color="text-green-600" />
        <StatCard label="Pending" value={stats.pending} color="text-gray-500" />
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Search by student name or group FYP ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
          />
        </div>
        {!isSearching && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
          </select>
        )}
      </div>

      {isSearching ? (
        searchLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <SearchResultCardSkeleton key={i} />)}
          </div>
        ) : !searchResults || searchResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 px-6">
            <Search className="h-8 w-8 text-gray-300 mb-3" strokeWidth={1.5} />
            <p className="text-sm font-medium text-gray-500">No results found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {searchResults.map((r) => (
              <SearchResultCard key={`${r.groupId}-${r.studentId}`} result={r} />
            ))}
          </div>
        )
      ) : (
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-10">#</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Group</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Supervisor</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Project Title</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Task</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Member Stats</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
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
                      {statusFilter ? 'No tasks match your filters' : 'No tasks found'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((task, idx) => {
                const status = STATUS_BADGES[task.status] ?? STATUS_BADGES.PENDING;
                const doneCount = task.memberStatuses.filter((s) => s.isDone).length;
                const memberCount = task.group.members.length;
                return (
                  <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 text-sm text-gray-400 tabular-nums">{idx + 1}</td>
                    <td className="px-5 py-4 font-mono text-sm text-gray-700">{task.group.fypId ?? `Group #${task.group.id}`}</td>
                    <td className="px-5 py-4 text-sm text-gray-700">{task.supervisor.name ?? task.supervisor.email}</td>
                    <td className="px-5 py-4 text-sm text-gray-700 max-w-[160px] truncate">
                      {task.group.proposal?.projectTitle ?? '—'}
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-gray-900 max-w-[140px] truncate">{task.title}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {task.status === 'APPROVED' ? `${doneCount}/${memberCount} done` : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
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
      )}

      <Dialog open={!!viewTask} onOpenChange={(open) => { if (!open) setViewTask(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" showCloseButton>
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          {viewTask && (() => {
            const status = STATUS_BADGES[viewTask.status] ?? STATUS_BADGES.PENDING;
            const doneCount = viewTask.memberStatuses.filter((s) => s.isDone).length;
            return (
              <div className="pt-2 space-y-4">
                <div className="rounded-xl bg-gray-50 px-4 py-3 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-900">{viewTask.title}</p>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${status.className}`}>{status.label}</span>
                  </div>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <p>Group: <span className="font-mono font-medium text-gray-700">{viewTask.group.fypId ?? `Group #${viewTask.group.id}`}</span></p>
                    <p>Supervisor: <span className="font-medium text-gray-700">{viewTask.supervisor.name ?? viewTask.supervisor.email}</span></p>
                    <p>Project: <span className="font-medium text-gray-700">{viewTask.group.proposal?.projectTitle ?? '—'}</span></p>
                    <p>Due: <span className="font-medium text-gray-700">{formatDeadline(viewTask.deadline)}</span></p>
                    {viewTask.status === 'APPROVED' && (
                      <p>Members done: <span className="font-medium text-gray-700">{doneCount}/{viewTask.group.members.length}</span></p>
                    )}
                  </div>
                  {viewTask.description && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Description</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{viewTask.description}</p>
                    </div>
                  )}
                </div>

                {viewTask.memberStatuses.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Member Statuses</p>
                    {viewTask.memberStatuses.map((ms) => (
                      <div key={ms.userId} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2.5">
                        <span className="text-sm text-gray-700">{ms.user.name ?? ms.user.email}</span>
                        <span className={`text-xs font-semibold ${ms.isDone ? 'text-green-700' : 'text-red-700'}`}>
                          {ms.isDone ? 'Done ✅' : 'Not Done ❌'}
                        </span>
                      </div>
                    ))}
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
    </>
  );
}
