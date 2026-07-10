'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  LayoutDashboard,
  FolderOpen,
  Calendar,
  User,
  FileText,
  ArrowLeft,
  CheckCircle,
  ClipboardCheck,
  ClipboardList,
  Printer,
  Lock,
} from 'lucide-react';
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

type MOMStatus = 'DRAFT' | 'SUBMITTED';

interface Participant {
  sr: number;
  name: string;
  role: string;
  present: boolean;
}

interface MOMDetail {
  id: number;
  groupId: number;
  meetingDate: string;
  agenda: string;
  discussion: string;
  decisions: string;
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

type Flash = { type: 'success' | 'error'; text: string };

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

export default function MOMDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [mom, setMom] = useState<MOMDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [logoError, setLogoError] = useState(false);

  const showFlash = (f: Flash) => {
    setFlash(f);
    setTimeout(() => setFlash(null), 4000);
  };

  useEffect(() => {
    api.get<MOMDetail>(`/mom/${id}`)
      .then((res) => setMom(res.data))
      .catch((err) => {
        if (err?.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async () => {
    if (!mom) return;
    setSubmitting(true);
    try {
      await api.post(`/mom/${mom.id}/submit`);
      setMom((prev) => prev ? { ...prev, status: 'SUBMITTED' } : prev);
      showFlash({ type: 'success', text: 'Minutes of meeting submitted successfully.' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showFlash({ type: 'error', text: typeof msg === 'string' ? msg : 'Failed to submit.' });
    } finally {
      setSubmitting(false);
    }
  };

  const meetingDateFormatted = mom
    ? new Date(mom.meetingDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <DashboardLayout navItems={navItems}>
      {/* Print CSS */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #mom-print-area, #mom-print-area * { visibility: visible; }
          #mom-print-area {
            position: fixed;
            top: 0; left: 0;
            width: 100%;
            padding: 40px;
            background: white;
            z-index: 9999;
          }
          @page { margin: 0; size: A4; }
        }
      `}</style>

      {/* Hidden print area */}
      {mom && (() => {
        return (
          <div id="mom-print-area" style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
            <div style={{ textAlign: 'center', borderBottom: '2px solid #1e293b', paddingBottom: '16px', marginBottom: '20px' }}>
              {!logoError && (
                <img
                  src="/superior-logo.png"
                  alt="Superior University"
                  style={{ height: '72px', margin: '0 auto 8px', display: 'block' }}
                  onError={() => setLogoError(true)}
                />
              )}
              <div style={{ fontWeight: '700', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#1e293b' }}>
                The Superior University Lahore
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                Department of Software Engineering
              </div>
              <div style={{ marginTop: '10px', display: 'inline-block', background: '#1e293b', padding: '4px 20px', borderRadius: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'white' }}>
                  Minutes of Meeting
                </span>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '20px' }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: '600', padding: '6px 10px', border: '1px solid #e2e8f0', width: '130px', background: '#f8fafc' }}>Group</td>
                  <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0' }}>{mom.group?.fypId ?? `Group #${mom.groupId}`}</td>
                  <td style={{ fontWeight: '600', padding: '6px 10px', border: '1px solid #e2e8f0', width: '120px', background: '#f8fafc' }}>Status</td>
                  <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0' }}>{STATUS_STYLES[mom.status]?.label ?? 'Draft'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: '600', padding: '6px 10px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>Meeting Date</td>
                  <td colSpan={3} style={{ padding: '6px 10px', border: '1px solid #e2e8f0' }}>{meetingDateFormatted}</td>
                </tr>
              </tbody>
            </table>

            {[
              { label: 'Agenda', value: mom.agenda },
              { label: 'Discussion', value: mom.discussion },
              { label: 'Decisions', value: mom.decisions },
            ].map(({ label, value }) => (
              <div key={label} style={{ marginBottom: '16px' }}>
                <div style={{ fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#475569', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '6px' }}>
                  {label}
                </div>
                <p style={{ fontSize: '12px', color: '#1e293b', lineHeight: '1.7', whiteSpace: 'pre-wrap', margin: 0 }}>{value}</p>
              </div>
            ))}

            {(mom.nextMeetingDate || mom.nextMeetingTime || mom.nextMeetingVenue) && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#475569', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '6px' }}>
                  Next Meeting
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <tbody>
                    {mom.nextMeetingDate && (
                      <tr>
                        <td style={{ fontWeight: '600', padding: '4px 8px', border: '1px solid #e2e8f0', background: '#f8fafc', width: '80px' }}>Date</td>
                        <td style={{ padding: '4px 8px', border: '1px solid #e2e8f0' }}>{mom.nextMeetingDate}</td>
                      </tr>
                    )}
                    {mom.nextMeetingTime && (
                      <tr>
                        <td style={{ fontWeight: '600', padding: '4px 8px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>Time</td>
                        <td style={{ padding: '4px 8px', border: '1px solid #e2e8f0' }}>{mom.nextMeetingTime}</td>
                      </tr>
                    )}
                    {mom.nextMeetingVenue && (
                      <tr>
                        <td style={{ fontWeight: '600', padding: '4px 8px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>Venue</td>
                        <td style={{ padding: '4px 8px', border: '1px solid #e2e8f0' }}>{mom.nextMeetingVenue}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {/* Screen UI */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard/supervisor/mom"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-3"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            Back to Minutes of Meeting
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Minutes of Meeting Details</h1>
        </div>
        {mom && (
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors shrink-0"
          >
            <Printer className="h-4 w-4" strokeWidth={1.75} />
            Download PDF
          </button>
        )}
      </div>

      {loading ? (
        <div className="max-w-2xl rounded-xl border border-gray-200 bg-white p-6 space-y-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
            </div>
          ))}
        </div>
      ) : notFound ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-20 px-6">
          <FileText className="h-6 w-6 text-gray-300 mb-3" strokeWidth={1.75} />
          <p className="text-sm font-medium text-gray-500">Meeting not found</p>
          <p className="mt-1 text-xs text-gray-400">This record may have been deleted or does not exist.</p>
        </div>
      ) : mom ? (() => {
        const parsedParticipants = parseParticipants(mom.participants);
        const hasNextMeeting = mom.nextMeetingDate || mom.nextMeetingTime || mom.nextMeetingVenue;
        return (
          <div className="max-w-2xl space-y-4">
            {/* Flash */}
            {flash && (
              <div
                className={`rounded-lg border px-4 py-3 text-sm ${
                  flash.type === 'success'
                    ? 'border-green-100 bg-green-50 text-green-700'
                    : 'border-red-100 bg-red-50 text-red-700'
                }`}
              >
                {flash.text}
              </div>
            )}

            {/* Header card */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden overflow-x-auto">
              <div className="border-b border-gray-100 bg-gray-50 px-6 py-4 text-center">
                <div className="flex justify-center mb-2">
                  {logoError ? (
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-gray-400" strokeWidth={1.75} />
                    </div>
                  ) : (
                    <img
                      src="/superior-logo.png"
                      alt="Superior University"
                      className="h-10 w-10 object-contain"
                      onError={() => setLogoError(true)}
                    />
                  )}
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-800">
                  The Superior University Lahore
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Department of Software Engineering</p>
                <div className="mt-2 inline-block rounded bg-gray-800 px-3 py-0.5">
                  <p className="text-xs font-bold uppercase tracking-widest text-white">Minutes of Meeting</p>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Group</p>
                    <p className="text-xl font-bold font-mono text-indigo-600">
                      {mom.group?.fypId ?? `Group #${mom.groupId}`}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      STATUS_STYLES[mom.status]?.className ?? STATUS_STYLES.DRAFT.className
                    }`}
                  >
                    {STATUS_STYLES[mom.status]?.label ?? 'Draft'}
                  </span>
                </div>

                <div className="text-sm text-gray-500 mb-2">
                  <span className="font-medium text-gray-700">Meeting Date: </span>
                  {meetingDateFormatted}
                </div>

              </div>
            </div>

            {/* Content card */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
              {/* Participants */}
              {parsedParticipants.length > 0 && (
                <>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Participants</p>
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
                          {parsedParticipants.map((p) => (
                            <tr key={p.sr}>
                              <td className="px-3 py-2.5 text-xs text-gray-400 tabular-nums">{p.sr}</td>
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
                  <div className="border-t border-gray-100" />
                </>
              )}
              <Field label="Agenda" value={mom.agenda} />
              <div className="border-t border-gray-100" />
              <Field label="Discussion" value={mom.discussion} />
              <div className="border-t border-gray-100" />
              <Field label="Decisions" value={mom.decisions} />

              {/* Next Meeting */}
              {hasNextMeeting && (
                <>
                  <div className="border-t border-gray-100" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Next Meeting</p>
                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 grid grid-cols-3 gap-3">
                      {mom.nextMeetingDate && (
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Date</p>
                          <p className="text-sm text-gray-700 font-medium">{mom.nextMeetingDate}</p>
                        </div>
                      )}
                      {mom.nextMeetingTime && (
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Time</p>
                          <p className="text-sm text-gray-700 font-medium">{mom.nextMeetingTime}</p>
                        </div>
                      )}
                      {mom.nextMeetingVenue && (
                        <div className={!mom.nextMeetingDate && !mom.nextMeetingTime ? '' : 'col-span-1'}>
                          <p className="text-xs text-gray-400 mb-0.5">Venue</p>
                          <p className="text-sm text-gray-700 font-medium">{mom.nextMeetingVenue}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Submit / Immutability notice */}
            {mom.status === 'DRAFT' ? (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-indigo-900">Ready to submit?</p>
                  <p className="text-xs text-indigo-600 mt-0.5">
                    Once submitted, this record cannot be edited.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  <CheckCircle className="h-4 w-4" strokeWidth={1.75} />
                  {submitting ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 flex items-center gap-3 text-sm text-gray-500">
                <Lock className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.75} />
                This MOM has been submitted and cannot be edited.
              </div>
            )}
          </div>
        );
      })() : null}
    </DashboardLayout>
  );
}
