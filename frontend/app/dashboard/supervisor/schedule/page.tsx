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
  CalendarClock,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle,
  BookOpen,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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

interface UpcomingMeeting {
  id: number;
  fypId: string | null;
  nextMeetingDate: string | null;
  nextMeetingTime: string | null;
  nextMeetingVenue: string | null;
}

interface TaskDeadline {
  id: number;
  title: string;
  deadline: string;
  status: TaskStatus;
  group: { id: number; fypId: string | null };
}

interface GroupSummary {
  id: number;
  fypId: string | null;
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  nextMeetingDate: string | null;
}

interface ScheduleData {
  upcomingMeetings: UpcomingMeeting[];
  taskDeadlines: TaskDeadline[];
  groupSummary: GroupSummary[];
}

const STATUS_BADGES: Record<TaskStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-gray-100 text-gray-600' },
  SUBMITTED: { label: 'Awaiting Review', className: 'bg-blue-50 text-blue-700' },
  APPROVED: { label: 'Approved', className: 'bg-green-50 text-green-700' },
  MINOR_ISSUES: { label: 'Minor Issues', className: 'bg-yellow-50 text-yellow-700' },
  REJECTED: { label: 'Rejected', className: 'bg-red-50 text-red-700' },
};

function urgencyClass(deadline: string): { row: string; badge: string; label: string } {
  const now = new Date();
  const due = new Date(deadline);
  const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return { row: 'bg-red-50/40', badge: 'bg-red-100 text-red-700', label: 'Overdue' };
  if (diffDays <= 3) return { row: 'bg-yellow-50/40', badge: 'bg-yellow-100 text-yellow-700', label: `${Math.ceil(diffDays)}d left` };
  return { row: '', badge: 'bg-green-50 text-green-700', label: `${Math.ceil(diffDays)}d left` };
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function SkeletonCard() {
  return (
    <Card className="border-gray-200 shadow-none">
      <CardContent className="pt-6 space-y-3">
        <div className="h-5 w-2/3 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200" />
      </CardContent>
    </Card>
  );
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-gray-100">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 animate-pulse rounded bg-gray-200" style={{ width: i === 0 ? '60%' : '50%' }} />
        </td>
      ))}
    </tr>
  );
}

export default function SchedulePage() {
  const [data, setData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'deadlines' | 'meetings'>('overview');

  const load = useCallback(async () => {
    try {
      const res = await api.get<ScheduleData>('/tasks/supervisor/schedule');
      setData(res.data);
    } catch {
      setData({ upcomingMeetings: [], taskDeadlines: [], groupSummary: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const tabs: { key: typeof activeTab; label: string; count?: number }[] = [
    { key: 'overview', label: 'Group Overview', count: data?.groupSummary.length },
    { key: 'deadlines', label: 'Task Deadlines', count: data?.taskDeadlines.length },
    { key: 'meetings', label: 'Upcoming Meetings', count: data?.upcomingMeetings.length },
  ];

  return (
    <DashboardLayout navItems={navItems}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Schedule</h1>
        <p className="mt-1 text-sm text-gray-500">Upcoming meetings and task deadlines</p>
      </div>

      {/* Stats bar */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card className="border-gray-200 shadow-none">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 shrink-0">
                <BookOpen className="h-4.5 w-4.5 text-indigo-600" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Groups</p>
                <p className="text-xl font-bold text-gray-900">{loading ? '—' : (data?.groupSummary.length ?? 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-none">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 shrink-0">
                <AlertTriangle className="h-4.5 w-4.5 text-amber-500" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Open Deadlines</p>
                <p className="text-xl font-bold text-gray-900">{loading ? '—' : (data?.taskDeadlines.length ?? 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-none">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 shrink-0">
                <CalendarClock className="h-4.5 w-4.5 text-green-600" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Upcoming Meetings</p>
                <p className="text-xl font-bold text-gray-900">{loading ? '—' : (data?.upcomingMeetings.length ?? 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                activeTab === tab.key ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-500'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : !data || data.groupSummary.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 px-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 mb-3">
              <FolderOpen className="h-5 w-5 text-gray-300" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium text-gray-500">No groups assigned yet</p>
            <p className="mt-1 text-xs text-gray-400">Groups will appear here once a manager assigns you as supervisor.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.groupSummary.map((g) => {
              const completionPct = g.totalTasks > 0 ? Math.round((g.completedTasks / g.totalTasks) * 100) : 0;
              return (
                <Card key={g.id} className="border-gray-200 shadow-none">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">FYP Group</p>
                        <p className="font-mono text-base font-bold text-gray-900">{g.fypId ?? `Group #${g.id}`}</p>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                        {completionPct}% done
                      </span>
                    </div>

                    {/* Task stats */}
                    <div className="flex gap-3 mb-4">
                      <div className="flex-1 rounded-lg bg-gray-50 px-3 py-2 text-center">
                        <p className="text-lg font-bold text-gray-900">{g.totalTasks}</p>
                        <p className="text-[11px] text-gray-400">Total</p>
                      </div>
                      <div className="flex-1 rounded-lg bg-amber-50 px-3 py-2 text-center">
                        <p className="text-lg font-bold text-amber-700">{g.pendingTasks}</p>
                        <p className="text-[11px] text-amber-500">Pending</p>
                      </div>
                      <div className="flex-1 rounded-lg bg-green-50 px-3 py-2 text-center">
                        <p className="text-lg font-bold text-green-700">{g.completedTasks}</p>
                        <p className="text-[11px] text-green-500">Done</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {g.totalTasks > 0 && (
                      <div className="mb-4">
                        <div className="h-1.5 w-full rounded-full bg-gray-100">
                          <div
                            className="h-1.5 rounded-full bg-indigo-500 transition-all"
                            style={{ width: `${completionPct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Next meeting */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <CalendarClock className="h-3.5 w-3.5 text-gray-400 shrink-0" strokeWidth={1.75} />
                      {g.nextMeetingDate ? (
                        <span>
                          Next meeting:{' '}
                          <span className="font-medium text-gray-700">{formatDate(g.nextMeetingDate)}</span>
                        </span>
                      ) : (
                        <span className="italic text-gray-400">No upcoming meeting</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* ── DEADLINES TAB ── */}
      {activeTab === 'deadlines' && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Task</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Group</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Deadline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
              ) : !data || data.taskDeadlines.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="flex flex-col items-center justify-center py-16 px-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 mb-3">
                        <CheckCircle className="h-5 w-5 text-gray-300" strokeWidth={1.75} />
                      </div>
                      <p className="text-sm font-medium text-gray-500">No open task deadlines</p>
                      <p className="mt-1 text-xs text-gray-400">All tasks are approved or no tasks exist yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.taskDeadlines.map((task) => {
                  const urgency = urgencyClass(task.deadline);
                  const statusBadge = STATUS_BADGES[task.status] ?? { label: task.status, className: 'bg-gray-100 text-gray-600' };
                  const today = isToday(task.deadline);
                  return (
                    <tr key={task.id} className={`transition-colors ${urgency.row}`}>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">{task.title}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-semibold text-gray-700">
                          {task.group.fypId ?? `#${task.group.id}`}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge.className}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700">{formatDate(task.deadline)}</span>
                          {today && (
                            <span className="inline-flex items-center rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">
                              Today
                            </span>
                          )}
                          {!today && (
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${urgency.badge}`}>
                              {urgency.label}
                            </span>
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
      )}

      {/* ── MEETINGS TAB ── */}
      {activeTab === 'meetings' && (
        loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : !data || data.upcomingMeetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 px-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 mb-3">
              <Calendar className="h-5 w-5 text-gray-300" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium text-gray-500">No upcoming meetings</p>
            <p className="mt-1 text-xs text-gray-400">
              Future meeting dates set in Minutes of Meeting will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.upcomingMeetings.map((meeting) => {
              const todayFlag = meeting.nextMeetingDate ? isToday(meeting.nextMeetingDate) : false;
              return (
                <div
                  key={meeting.id}
                  className={`flex items-start gap-4 rounded-xl border px-5 py-4 ${
                    todayFlag ? 'border-indigo-200 bg-indigo-50/40' : 'border-gray-200 bg-white'
                  }`}
                >
                  {/* Date icon */}
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    todayFlag ? 'bg-indigo-600' : 'bg-gray-100'
                  }`}>
                    <CalendarClock className={`h-5 w-5 ${todayFlag ? 'text-white' : 'text-gray-500'}`} strokeWidth={1.75} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-bold text-gray-900">
                        {meeting.fypId ?? `MOM #${meeting.id}`}
                      </span>
                      {todayFlag && (
                        <span className="inline-flex items-center rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          Today
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" strokeWidth={1.75} />
                        {formatDate(meeting.nextMeetingDate)}
                      </span>
                      {meeting.nextMeetingTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" strokeWidth={1.75} />
                          {meeting.nextMeetingTime}
                        </span>
                      )}
                      {meeting.nextMeetingVenue && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" strokeWidth={1.75} />
                          {meeting.nextMeetingVenue}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </DashboardLayout>
  );
}
