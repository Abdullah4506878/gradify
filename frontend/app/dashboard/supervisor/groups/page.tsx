'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  FolderOpen,
  Calendar,
  User,
  Search,
  FileText,
  PlusCircle,
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
  { label: 'MOMs', href: '/dashboard/supervisor/mom', icon: FileText },
  { label: 'Proposals', href: '/dashboard/supervisor/proposals', icon: ClipboardCheck },
  { label: 'Schedule', href: '/dashboard/supervisor/schedule', icon: Calendar },
  { label: 'Profile', href: '/dashboard/supervisor/profile', icon: User },
];

type GroupStatus = 'FORMING' | 'ACTIVE' | 'COMPLETED';

interface Member {
  id: number;
  userId: number;
  user: { id: number; name: string | null; email: string } | null;
}

interface Group {
  id: number;
  fypId: string;
  status: GroupStatus;
  members: Member[];
}

interface MOM {
  id: number;
  groupId: number;
  meetingDate: string;
}

const STATUS_STYLES: Record<GroupStatus, { label: string; className: string }> = {
  FORMING: { label: 'Forming', className: 'bg-yellow-50 text-yellow-700' },
  ACTIVE: { label: 'Active', className: 'bg-green-50 text-green-700' },
  COMPLETED: { label: 'Completed', className: 'bg-blue-50 text-blue-700' },
};

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-6 py-4">
          <div
            className="h-4 animate-pulse rounded bg-gray-200"
            style={{ width: i === 5 ? '4rem' : '60%' }}
          />
        </td>
      ))}
    </tr>
  );
}

export default function SupervisorGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [lastMomDate, setLastMomDate] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewGroup, setViewGroup] = useState<Group | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [groupsRes, momsRes] = await Promise.allSettled([
          api.get<Group[]>('/groups'),
          api.get<MOM[]>('/mom'),
        ]);

        const fetchedGroups =
          groupsRes.status === 'fulfilled' ? groupsRes.value.data : [];

        const moms = momsRes.status === 'fulfilled' ? momsRes.value.data : [];

        const momMap: Record<number, string> = {};
        for (const mom of moms) {
          if (!momMap[mom.groupId]) {
            momMap[mom.groupId] = mom.meetingDate;
          }
        }

        setGroups(fetchedGroups);
        setLastMomDate(momMap);
      } catch {
        // keep empty on failure
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filtered = groups.filter((g) =>
    g.fypId.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <DashboardLayout navItems={navItems}>
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Groups</h1>
          <p className="mt-1 text-sm text-gray-500">
            {loading
              ? 'Loading…'
              : `${groups.length} group${groups.length !== 1 ? 's' : ''} assigned`}
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
          placeholder="Search by FYP ID…"
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
                Members
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Last MOM
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
                <td colSpan={5}>
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 mb-3">
                      <FolderOpen className="h-5 w-5 text-gray-300" strokeWidth={1.75} />
                    </div>
                    <p className="text-sm font-medium text-gray-500">
                      {search ? 'No groups match your search' : 'No groups assigned yet'}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {search
                        ? 'Try a different FYP ID.'
                        : 'Groups will appear here once students select you as their supervisor.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((group) => {
                const status = STATUS_STYLES[group.status] ?? STATUS_STYLES.FORMING;
                const lastMom = lastMomDate[group.id];

                return (
                  <tr key={group.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-medium text-gray-900">
                        {group.fypId}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {group.members.length}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {lastMom ? (
                        new Date(lastMom).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      ) : (
                        <span className="text-gray-400 italic">No MOM yet</span>
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
        <DialogContent className="sm:max-w-sm" showCloseButton>
          <DialogHeader>
            <DialogTitle>Group Details</DialogTitle>
          </DialogHeader>

          {viewGroup && (() => {
            const status = STATUS_STYLES[viewGroup.status] ?? STATUS_STYLES.FORMING;
            const lastMom = lastMomDate[viewGroup.id];
            return (
              <div className="pt-2 space-y-5">
                {/* FYP ID + status */}
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold font-mono text-indigo-600">{viewGroup.fypId}</p>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                    {status.label}
                  </span>
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
                            <p className="text-sm text-gray-900">
                              {m.user?.name ?? <span className="italic text-gray-400">No name</span>}
                            </p>
                            <p className="text-xs text-gray-400">{m.user?.email}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Last MOM */}
                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Last MOM</span>
                  <span className="text-sm text-gray-600">
                    {lastMom
                      ? new Date(lastMom).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : <span className="italic text-gray-400">None yet</span>}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/supervisor/mom/create?groupId=${viewGroup.id}`}
                    onClick={() => setViewGroup(null)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
                  >
                    <PlusCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Create MOM
                  </Link>
                  <Link
                    href={`/dashboard/supervisor/mom?groupId=${viewGroup.id}`}
                    onClick={() => setViewGroup(null)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5" strokeWidth={1.75} />
                    View MOMs
                  </Link>
                </div>

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
