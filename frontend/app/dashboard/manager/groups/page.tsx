'use client';

import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FolderOpen,
  BarChart,
  Search,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/api';

const navItems = [
  { label: 'Dashboard', href: '/dashboard/manager', icon: LayoutDashboard },
  { label: 'Students', href: '/dashboard/manager/students', icon: Users },
  { label: 'Supervisors', href: '/dashboard/manager/supervisors', icon: Briefcase },
  { label: 'Groups', href: '/dashboard/manager/groups', icon: FolderOpen },
  { label: 'Reports', href: '/dashboard/manager/reports', icon: BarChart },
];

type GroupStatus = 'FORMING' | 'ACTIVE' | 'COMPLETED';

interface Group {
  id: number;
  fypId: string;
  status: GroupStatus;
  leader: { id: number; name: string | null; email: string };
  members: unknown[];
  preferences: unknown[];
}

const STATUS_STYLES: Record<GroupStatus, { label: string; className: string }> = {
  FORMING: { label: 'Forming', className: 'bg-yellow-50 text-yellow-700' },
  ACTIVE: { label: 'Active', className: 'bg-green-50 text-green-700' },
  COMPLETED: { label: 'Completed', className: 'bg-blue-50 text-blue-700' },
};

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
                    {/* FYP ID */}
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-medium text-gray-900">
                        {group.fypId}
                      </span>
                    </td>

                    {/* Leader */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 shrink-0">
                          <span className="text-xs font-semibold text-indigo-600">
                            {(group.leader?.name ?? group.leader?.email ?? '?')
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm text-gray-900">
                          {group.leader?.name ?? (
                            <span className="text-gray-400 italic">
                              {group.leader?.email ?? 'Unknown'}
                            </span>
                          )}
                        </span>
                      </div>
                    </td>

                    {/* Members count */}
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {group.members.length}
                    </td>

                    {/* Status badge */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>

                    {/* Supervisor preferences badge */}
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

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
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
    </DashboardLayout>
  );
}
