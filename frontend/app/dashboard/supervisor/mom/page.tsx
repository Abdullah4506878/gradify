'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  FolderOpen,
  Calendar,
  User,
  FileText,
  Search,
  PlusCircle,
  ClipboardCheck,
  ClipboardList,
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

interface MOM {
  id: number;
  groupId: number;
  meetingDate: string;
  agenda: string;
  status: MOMStatus;
  group?: { fypId: string };
}

type Flash = { type: 'success' | 'error'; text: string };

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
            style={{ width: i === 1 ? '2rem' : i === 6 ? '7rem' : '60%' }}
          />
        </td>
      ))}
    </tr>
  );
}

export default function MOMListPage() {
  const searchParams = useSearchParams();
  const groupIdFilter = searchParams.get('groupId');

  const [moms, setMoms] = useState<MOM[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [flash, setFlash] = useState<Flash | null>(null);

  const showFlash = (f: Flash) => {
    setFlash(f);
    setTimeout(() => setFlash(null), 4000);
  };

  const fetchMoms = useCallback(async () => {
    try {
      const res = await api.get<MOM[]>('/mom');
      let data = res.data;
      if (groupIdFilter) {
        data = data.filter((m) => String(m.groupId) === groupIdFilter);
      }
      setMoms(data);
    } catch {
      // keep empty on failure
    } finally {
      setLoading(false);
    }
  }, [groupIdFilter]);

  useEffect(() => {
    fetchMoms();
  }, [fetchMoms]);

  const handleSubmit = async (id: number) => {
    setSubmittingId(id);
    try {
      await api.post(`/mom/${id}/submit`);
      setMoms((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: 'SUBMITTED' as MOMStatus } : m)),
      );
      showFlash({ type: 'success', text: 'MOM submitted successfully.' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showFlash({ type: 'error', text: typeof msg === 'string' ? msg : 'Failed to submit MOM.' });
    } finally {
      setSubmittingId(null);
    }
  };

  const filtered = moms.filter((m) => {
    const q = search.toLowerCase();
    return (
      (m.group?.fypId ?? '').toLowerCase().includes(q) ||
      m.agenda.toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout navItems={navItems}>
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Minutes of Meeting</h1>
          <p className="mt-1 text-sm text-gray-500">
            {loading
              ? 'Loading…'
              : groupIdFilter
              ? `${moms.length} minute${moms.length !== 1 ? 's' : ''} of meeting for this group`
              : `${moms.length} minute${moms.length !== 1 ? 's' : ''} of meeting recorded`}
          </p>
        </div>
        <Link
          href="/dashboard/supervisor/mom/create"
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors shrink-0"
        >
          <PlusCircle className="h-4 w-4" strokeWidth={1.75} />
          New MOM
        </Link>
      </div>

      {/* Flash */}
      {flash && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            flash.type === 'success'
              ? 'border-green-100 bg-green-50 text-green-700'
              : 'border-red-100 bg-red-50 text-red-700'
          }`}
        >
          {flash.text}
        </div>
      )}

      {/* Search */}
      <div className="mb-4 relative max-w-sm">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          strokeWidth={1.75}
        />
        <input
          type="text"
          placeholder="Search by FYP ID or agenda…"
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
                Group
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Meeting Date
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Agenda
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
                      {search ? 'No minutes of meeting match your search' : 'No meetings recorded yet'}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {search
                        ? 'Try a different FYP ID or agenda.'
                        : 'Create a minutes of meeting record to get started.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((mom, idx) => {
                const statusStyle = STATUS_STYLES[mom.status] ?? STATUS_STYLES.DRAFT;
                const agendaTrunc =
                  mom.agenda.length > 50 ? mom.agenda.slice(0, 50) + '…' : mom.agenda;
                return (
                  <tr key={mom.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-400 tabular-nums">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-medium text-gray-900">
                        {mom.group?.fypId ?? `Group #${mom.groupId}`}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(mom.meetingDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">{agendaTrunc}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle.className}`}
                      >
                        {statusStyle.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/supervisor/mom/${mom.id}`}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                        >
                          View
                        </Link>
                        {mom.status === 'DRAFT' && (
                          <button
                            type="button"
                            onClick={() => handleSubmit(mom.id)}
                            disabled={submittingId === mom.id}
                            className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {submittingId === mom.id ? 'Submitting…' : 'Submit'}
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
    </DashboardLayout>
  );
}
