'use client';

import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  FileText,
  User,
  Search,
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

type MOMStatus = 'DRAFT' | 'SUBMITTED';

interface Participant {
  sr: number;
  name: string;
  role: string;
  present: boolean;
}

interface MOM {
  id: number;
  groupId: number;
  meetingDate: string;
  agenda: string;
  discussion: string;
  decisions: string;
  nextSteps?: string | null;
  attendees?: string | null;
  participants?: string | null;
  nextMeetingDate?: string | null;
  nextMeetingTime?: string | null;
  nextMeetingVenue?: string | null;
  status: MOMStatus;
  group?: { fypId: string | null };
}

const STATUS_STYLES: Record<MOMStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-yellow-50 text-yellow-700' },
  SUBMITTED: { label: 'Submitted', className: 'bg-green-50 text-green-700' },
};

function parseParticipants(raw: string | null | undefined): Participant[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as Participant[];
  } catch {
    // ignore
  }
  return [];
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">{label}</p>
      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
        {value || <span className="italic text-gray-400">Not provided</span>}
      </p>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-6 py-4">
          <div
            className="h-4 animate-pulse rounded bg-gray-200"
            style={{ width: i === 1 ? '2rem' : i === 5 ? '5rem' : '60%' }}
          />
        </td>
      ))}
    </tr>
  );
}

export default function StudentMOMPage() {
  const [moms, setMoms] = useState<MOM[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<MOM | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    api
      .get<MOM[]>('/mom')
      .then((r) => setMoms(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openDetail = async (mom: MOM) => {
    setSelected(mom);
    if (!mom.discussion) {
      setDetailLoading(true);
      try {
        const res = await api.get<MOM>(`/mom/${mom.id}`);
        setSelected(res.data);
      } catch {
        // keep partial
      } finally {
        setDetailLoading(false);
      }
    }
  };

  const filtered = moms.filter((m) => {
    const q = search.toLowerCase();
    return (
      (m.group?.fypId ?? '').toLowerCase().includes(q) ||
      m.agenda.toLowerCase().includes(q)
    );
  });

  const participantsList = parseParticipants(selected?.participants);

  return (
    <DashboardLayout navItems={navItems}>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Minutes of Meeting</h1>
        <p className="mt-1 text-sm text-gray-500">
          {loading
            ? 'Loading…'
            : `${moms.length} minute${moms.length !== 1 ? 's' : ''} of meeting recorded`}
        </p>
      </div>

      {/* Search */}
      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={1.75} />
        <input
          type="text"
          placeholder="Search by agenda…"
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
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-12">#</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Meeting Date</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Agenda</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 mb-3">
                      <FileText className="h-5 w-5 text-gray-300" strokeWidth={1.75} />
                    </div>
                    <p className="text-sm font-medium text-gray-500">
                      {search ? 'No meetings match your search' : 'No meetings recorded yet'}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {search ? 'Try a different search term.' : 'Your supervisor will add meeting records here.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((mom, idx) => {
                const statusStyle = STATUS_STYLES[mom.status] ?? STATUS_STYLES.SUBMITTED;
                const agendaTrunc = mom.agenda.length > 60 ? mom.agenda.slice(0, 60) + '…' : mom.agenda;
                return (
                  <tr key={mom.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-400 tabular-nums">{idx + 1}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(mom.meetingDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">{agendaTrunc}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle.className}`}>
                        {statusStyle.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openDetail(mom)}
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

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="text-base">Minutes of Meeting</DialogTitle>
              {selected && (
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mr-8 ${(STATUS_STYLES[selected.status] ?? STATUS_STYLES.SUBMITTED).className}`}>
                  {(STATUS_STYLES[selected.status] ?? STATUS_STYLES.SUBMITTED).label}
                </span>
              )}
            </div>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            </div>
          ) : selected && (
            <div className="space-y-5 pt-2">
              {/* Header info */}
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Group</p>
                  <p className="text-sm font-mono font-semibold text-gray-900">
                    {selected.group?.fypId ?? `Group #${selected.groupId}`}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Meeting Date</p>
                  <p className="text-sm text-gray-700">{formatDate(selected.meetingDate)}</p>
                </div>
              </div>

              {/* Participants table */}
              {participantsList.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Participants</p>
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 w-10">Sr.</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Name</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Role</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Attendance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {participantsList.map((p) => (
                          <tr key={p.sr}>
                            <td className="px-4 py-2.5 text-sm text-gray-400">{p.sr}</td>
                            <td className="px-4 py-2.5 text-sm text-gray-700">{p.name}</td>
                            <td className="px-4 py-2.5 text-sm text-gray-600">{p.role}</td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${p.present ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {p.present ? 'Present' : 'Absent'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <Field label="Agenda" value={selected.agenda} />
              <Field label="Discussion" value={selected.discussion} />
              <Field label="Decisions" value={selected.decisions} />

              {/* Next meeting */}
              {(selected.nextMeetingDate || selected.nextMeetingTime || selected.nextMeetingVenue) && (
                <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500 mb-2">Next Meeting</p>
                  <div className="grid grid-cols-3 gap-3">
                    {selected.nextMeetingDate && (
                      <div>
                        <p className="text-xs text-indigo-400 mb-0.5">Date</p>
                        <p className="text-sm text-indigo-900 font-medium">{formatDate(selected.nextMeetingDate)}</p>
                      </div>
                    )}
                    {selected.nextMeetingTime && (
                      <div>
                        <p className="text-xs text-indigo-400 mb-0.5">Time</p>
                        <p className="text-sm text-indigo-900 font-medium">{selected.nextMeetingTime}</p>
                      </div>
                    )}
                    {selected.nextMeetingVenue && (
                      <div>
                        <p className="text-xs text-indigo-400 mb-0.5">Venue</p>
                        <p className="text-sm text-indigo-900 font-medium">{selected.nextMeetingVenue}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
