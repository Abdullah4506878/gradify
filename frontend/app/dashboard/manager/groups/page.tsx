'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FolderOpen,
  BarChart,
  Search,
  User,
  UserCheck,
  Mail,
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
  { label: 'Groups', href: '/dashboard/manager/groups', icon: FolderOpen },
  { label: 'Proposals', href: '/dashboard/manager/proposals', icon: ClipboardCheck },
  { label: 'Reports', href: '/dashboard/manager/reports', icon: BarChart },
  { label: 'Profile', href: '/dashboard/manager/profile', icon: User },
];

type GroupStatus = 'FORMING' | 'ACTIVE' | 'COMPLETED';

interface Member {
  id: number;
  userId: number;
  user: { id: number; name: string | null; email: string } | null;
}

interface Preference {
  id: number;
  preference: number;
  supervisor: { id: number; name: string | null; email: string };
}

interface Group {
  id: number;
  fypId: string;
  status: GroupStatus;
  createdAt: string;
  phase?: { phase: string; session?: { name: string } };
  leader: { id: number; name: string | null; email: string };
  members: Member[];
  preferences: Preference[];
}

const STATUS_STYLES: Record<GroupStatus, { label: string; className: string }> = {
  FORMING: { label: 'Forming', className: 'bg-yellow-50 text-yellow-700' },
  ACTIVE: { label: 'Active', className: 'bg-green-50 text-green-700' },
  COMPLETED: { label: 'Completed', className: 'bg-blue-50 text-blue-700' },
};

const PREF_LABEL: Record<number, string> = { 1: 'P1', 2: 'P2', 3: 'P3' };

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="px-6 py-4">
          <div
            className="h-4 animate-pulse rounded bg-gray-200"
            style={{ width: i === 6 ? '4rem' : '60%' }}
          />
        </td>
      ))}
    </tr>
  );
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewGroup, setViewGroup] = useState<Group | null>(null);

  useEffect(() => {
    async function fetchGroups() {
      try {
        const res = await api.get<Group[]>('/groups');
        setGroups(res.data);
      } catch {
        // keep empty list on failure
      } finally {
        setLoading(false);
      }
    }
    fetchGroups();
  }, []);

  const filtered = groups.filter((g) => {
    const q = search.toLowerCase();
    const leaderName = (g.leader?.name ?? g.leader?.email ?? '').toLowerCase();
    return g.fypId.toLowerCase().includes(q) || leaderName.includes(q);
  });

  return (
    <DashboardLayout navItems={navItems}>
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Groups</h1>
          <p className="mt-1 text-sm text-gray-500">
            {loading
              ? 'Loading…'
              : `${groups.length} group${groups.length !== 1 ? 's' : ''} registered`}
          </p>
        </div>
        <Link
          href="/dashboard/manager/groups/assign"
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors shrink-0"
        >
          <UserCheck className="h-4 w-4" strokeWidth={1.75} />
          Assign Supervisors
        </Link>
      </div>

      {/* Search */}
      <div className="mb-4 relative max-w-sm">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          strokeWidth={1.75}
        />
        <input
          type="text"
          placeholder="Search by FYP ID or leader name…"
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
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                FYP ID
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Leader
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Members
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Supervisor Preferences
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
                      <FolderOpen className="h-5 w-5 text-gray-300" strokeWidth={1.75} />
                    </div>
                    <p className="text-sm font-medium text-gray-500">
                      {search ? 'No groups match your search' : 'No groups registered yet'}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {search
                        ? 'Try a different FYP ID or leader name.'
                        : 'Groups will appear here once students form them.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((group) => {
                const status = STATUS_STYLES[group.status] ?? STATUS_STYLES.FORMING;
                const prefsSubmitted = group.preferences.length > 0;

                return (
                  <tr key={group.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-medium text-gray-900">{group.fypId}</span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 shrink-0">
                          <span className="text-xs font-semibold text-indigo-600">
                            {(group.leader?.name ?? group.leader?.email ?? '?').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm text-gray-900">
                          {group.leader?.name ?? (
                            <span className="text-gray-400 italic">{group.leader?.email ?? 'Unknown'}</span>
                          )}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-500">{group.members.length}</td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                        {status.label}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {prefsSubmitted ? (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                          Submitted
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                          Pending
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setViewGroup(group)}
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

      {/* View Group Dialog */}
      <Dialog open={!!viewGroup} onOpenChange={(open) => { if (!open) setViewGroup(null); }}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Group Details</DialogTitle>
          </DialogHeader>

          {viewGroup && (() => {
            const status = STATUS_STYLES[viewGroup.status] ?? STATUS_STYLES.FORMING;
            return (
              <div className="pt-2 space-y-5">
                {/* FYP ID + status */}
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold font-mono text-indigo-600">{viewGroup.fypId}</p>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                    {status.label}
                  </span>
                </div>

                {/* Phase */}
                {viewGroup.phase && (
                  <div className="text-sm text-gray-500">
                    <span className="font-medium text-gray-700">Phase: </span>
                    {viewGroup.phase.session?.name} — {viewGroup.phase.phase.replace('_', ' ')}
                  </div>
                )}

                {/* Leader */}
                <div className="rounded-xl bg-gray-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Leader</p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 shrink-0">
                      <span className="text-xs font-bold text-indigo-600">
                        {(viewGroup.leader?.name ?? viewGroup.leader?.email ?? '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {viewGroup.leader?.name ?? <span className="italic text-gray-400">No name</span>}
                      </p>
                      <p className="text-xs text-gray-400">{viewGroup.leader?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Members */}
                <div className="rounded-xl bg-gray-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                    Members ({viewGroup.members.length})
                  </p>
                  {viewGroup.members.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No members yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {viewGroup.members.map((m) => (
                        <li key={m.id} className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 shrink-0">
                            <span className="text-xs font-semibold text-indigo-600">
                              {(m.user?.name ?? m.user?.email ?? '?').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm text-gray-900">{m.user?.name ?? <span className="italic text-gray-400">No name</span>}</p>
                            <p className="text-xs text-gray-400">{m.user?.email}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Preferences */}
                <div className="rounded-xl bg-gray-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Supervisor Preferences</p>
                  {viewGroup.preferences.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">Not submitted yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {[...viewGroup.preferences]
                        .sort((a, b) => a.preference - b.preference)
                        .map((pref) => (
                          <li key={pref.id} className="flex items-center gap-2.5">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shrink-0">
                              {PREF_LABEL[pref.preference] ?? `P${pref.preference}`}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-50 shrink-0">
                                <span className="text-xs font-semibold text-purple-600">
                                  {(pref.supervisor?.name ?? pref.supervisor?.email ?? '?').charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm text-gray-900">{pref.supervisor?.name ?? <span className="italic text-gray-400">{pref.supervisor?.email}</span>}</p>
                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                  <Mail className="h-3 w-3" strokeWidth={1.75} />
                                  {pref.supervisor?.email}
                                </p>
                              </div>
                            </div>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>

                {/* Created date */}
                <p className="text-xs text-gray-400">
                  Created{' '}
                  {new Date(viewGroup.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setViewGroup(null)}
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
