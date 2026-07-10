'use client';

import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FolderOpen,
  BarChart,
  FileText,
  Search,
  User,
  ClipboardCheck,
  ClipboardList,
  Eye,
  BarChart2,
  BookOpen,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import api from '@/lib/api';


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
  submittedAt: string | null;
  agenda: string;
  discussion: string;
  decisions: string;
  participants?: string | null;
  nextMeetingDate?: string | null;
  nextMeetingTime?: string | null;
  nextMeetingVenue?: string | null;
  status: MOMStatus;
  group?: { id: number; fypId: string | null };
  supervisor?: { id: number; name: string | null; email: string };
}

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

const STATUS_STYLES: Record<MOMStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-yellow-50 text-yellow-700' },
  SUBMITTED: { label: 'Submitted', className: 'bg-green-50 text-green-700' },
};

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="px-6 py-4">
          <div
            className="h-4 animate-pulse rounded bg-gray-200"
            style={{ width: i === 1 ? '2rem' : i === 6 ? '5rem' : '65%' }}
          />
        </td>
      ))}
    </tr>
  );
}

export default function ManagerMOMPage() {
  const [moms, setMoms] = useState<MOM[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMom, setViewMom] = useState<MOM | null>(null);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    api
      .get<MOM[]>('/mom')
      .then((res) => setMoms(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = moms.filter((m) => {
    const q = search.toLowerCase();
    return (
      (m.group?.fypId ?? '').toLowerCase().includes(q) ||
      (m.supervisor?.name ?? '').toLowerCase().includes(q) ||
      (m.supervisor?.email ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Minutes of Meeting</h1>
        <p className="mt-1 text-sm text-gray-500">
          {loading ? 'Loading…' : `${moms.length} record${moms.length !== 1 ? 's' : ''} total`}
        </p>
      </div>

      {/* Search */}
      <div className="mb-4 relative max-w-sm">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          strokeWidth={1.75}
        />
        <input
          type="text"
          placeholder="Search by FYP ID or supervisor…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-12">
                #
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Group FYP ID
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Supervisor
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Meeting Date
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
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
                      <FileText className="h-5 w-5 text-gray-300" strokeWidth={1.75} />
                    </div>
                    <p className="text-sm font-medium text-gray-500">
                      {search ? 'No records match your search' : 'No minutes of meeting yet'}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {search
                        ? 'Try a different FYP ID or supervisor name.'
                        : 'Records will appear once supervisors create them.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((mom, idx) => {
                const statusStyle = STATUS_STYLES[mom.status] ?? STATUS_STYLES.DRAFT;
                return (
                  <tr key={mom.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-400 tabular-nums">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-medium text-gray-900">
                        {mom.group?.fypId ?? `Group #${mom.groupId}`}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {mom.supervisor?.name ?? mom.supervisor?.email ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(mom.meetingDate).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle.className}`}
                      >
                        {statusStyle.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setViewMom(mom)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
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

      {/* View Dialog */}
      <Dialog open={!!viewMom} onOpenChange={(open) => { if (!open) setViewMom(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Minutes of Meeting Detail</DialogTitle>
          </DialogHeader>

          {viewMom && (
            <div className="space-y-5">
              {/* University header */}
              <div className="flex flex-col items-center gap-2 border-b border-gray-100 pb-5">
                {!logoError ? (
                  <img
                    src="/superior-logo-real.png"
                    alt="Superior University"
                    className="h-16 w-auto object-contain"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600">
                    <span className="text-2xl font-bold text-white">S</span>
                  </div>
                )}
                <div className="text-center">
                  <p className="text-base font-bold text-gray-900">The Superior University Lahore</p>
                  <p className="text-xs text-gray-500">Department of Software Engineering</p>
                </div>
                <span className="mt-1 rounded-md bg-gray-900 px-3 py-1 text-xs font-semibold tracking-widest text-white uppercase">
                  Minutes of Meeting
                </span>
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Group</p>
                  <p className="mt-0.5 font-mono font-semibold text-gray-900">
                    {viewMom.group?.fypId ?? `#${viewMom.groupId}`}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Supervisor</p>
                  <p className="mt-0.5 font-semibold text-gray-900">
                    {viewMom.supervisor?.name ?? viewMom.supervisor?.email ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Meeting Date</p>
                  <p className="mt-0.5 text-gray-700">
                    {new Date(viewMom.meetingDate).toLocaleString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Status</p>
                  <p className="mt-0.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${(STATUS_STYLES[viewMom.status] ?? STATUS_STYLES.DRAFT).className}`}
                    >
                      {(STATUS_STYLES[viewMom.status] ?? STATUS_STYLES.DRAFT).label}
                    </span>
                  </p>
                </div>
              </div>

              {/* Participants */}
              {(() => {
                const pts = parseParticipants(viewMom.participants);
                if (pts.length === 0) return null;
                return (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Participants</p>
                    <div className="rounded-lg border border-gray-100 overflow-hidden">
                      <table className="min-w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 w-10">Sr#</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Name</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Role</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Attendance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {pts.map((p) => (
                            <tr key={p.sr}>
                              <td className="px-3 py-2.5 text-xs text-gray-400">{p.sr}</td>
                              <td className="px-3 py-2.5 text-sm text-gray-700">{p.name}</td>
                              <td className="px-3 py-2.5 text-sm text-gray-600">{p.role}</td>
                              <td className="px-3 py-2.5">
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
                );
              })()}

              {/* Content sections */}
              {[
                { label: 'Agenda', value: viewMom.agenda },
                { label: 'Discussion', value: viewMom.discussion },
                { label: 'Decisions', value: viewMom.decisions },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                    {label}
                  </p>
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {value}
                  </div>
                </div>
              ))}

              {/* Next Meeting */}
              {(viewMom.nextMeetingDate || viewMom.nextMeetingTime || viewMom.nextMeetingVenue) && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                    Next Meeting
                  </p>
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 grid grid-cols-3 gap-3">
                    {viewMom.nextMeetingDate && (
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Date</p>
                        <p className="text-sm text-gray-700 font-medium">{viewMom.nextMeetingDate}</p>
                      </div>
                    )}
                    {viewMom.nextMeetingTime && (
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Time</p>
                        <p className="text-sm text-gray-700 font-medium">{viewMom.nextMeetingTime}</p>
                      </div>
                    )}
                    {viewMom.nextMeetingVenue && (
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Venue</p>
                        <p className="text-sm text-gray-700 font-medium">{viewMom.nextMeetingVenue}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
