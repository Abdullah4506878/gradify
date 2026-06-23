'use client';

import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  User,
  FolderOpen,
  UserPlus,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/lib/auth';
import api from '@/lib/api';

const navItems = [
  { label: 'Dashboard', href: '/dashboard/student', icon: LayoutDashboard },
  { label: 'My Group', href: '/dashboard/student/group', icon: Users },
  { label: 'Tasks', href: '/dashboard/student/tasks', icon: ClipboardList },
  { label: 'Profile', href: '/dashboard/student/profile', icon: User },
];

type GroupStatus = 'FORMING' | 'ACTIVE' | 'COMPLETED';

interface Member {
  id: number;
  userId: number;
  user: { id: number; name: string | null; email: string };
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

export default function StudentGroupPage() {
  const { user } = useAuthStore();
  const [group, setGroup] = useState<Group | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGroup() {
      try {
        const res = await api.get<Group[]>('/groups');
        const found = res.data.find((g) =>
          g.members.some((m) => m.user?.id === user?.id || m.userId === user?.id),
        );
        setGroup(found ?? null);
      } catch {
        setGroup(null);
      } finally {
        setLoading(false);
      }
    }
    fetchGroup();
  }, [user?.id]);

  const status = group ? STATUS_STYLES[group.status] ?? STATUS_STYLES.FORMING : null;

  return (
    <DashboardLayout navItems={navItems}>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Group</h1>
        <p className="mt-1 text-sm text-gray-500">Your FYP group details and members</p>
      </div>

      {loading ? (
        <div className="max-w-2xl space-y-5">
          {/* Skeleton header card */}
          <Card className="border-gray-200 shadow-none">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
                <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
              </div>
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
            </CardContent>
          </Card>
          {/* Skeleton members card */}
          <Card className="border-gray-200 shadow-none">
            <CardContent className="pt-6 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-1/3 animate-pulse rounded bg-gray-200" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : !group ? (
        /* No group empty state */
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-20 px-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 mb-4">
            <FolderOpen className="h-6 w-6 text-gray-300" strokeWidth={1.75} />
          </div>
          <p className="text-base font-semibold text-gray-700">You are not in a group yet</p>
          <p className="mt-1 text-sm text-gray-400 text-center max-w-xs">
            Create a group to start your FYP journey or wait to be added by a group leader.
          </p>
          <button
            type="button"
            className="mt-6 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            <UserPlus className="h-4 w-4" strokeWidth={1.75} />
            Create Group
          </button>
        </div>
      ) : (
        <div className="max-w-2xl space-y-5">
          {/* Group info card */}
          <Card className="border-gray-200 shadow-none">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">FYP ID</p>
                  <p className="text-2xl font-bold text-gray-900 font-mono">{group.fypId}</p>
                </div>
                {status && (
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                    {status.label}
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-500">
                <span className="font-medium text-gray-700">Leader: </span>
                {group.leader.name ?? group.leader.email}
              </div>
            </CardContent>
          </Card>

          {/* Members card */}
          <Card className="border-gray-200 shadow-none">
            <CardContent className="pt-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">
                Members ({group.members.length})
              </h2>
              <ul className="space-y-3">
                {group.members.map((m) => {
                  const isLeader = m.user?.id === group.leader.id;
                  const initial = (m.user?.name ?? m.user?.email ?? '?').charAt(0).toUpperCase();
                  return (
                    <li key={m.id} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 shrink-0">
                        <span className="text-xs font-semibold text-indigo-600">{initial}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {m.user?.name ?? <span className="text-gray-400 italic">No name</span>}
                          {isLeader && (
                            <span className="ml-2 text-xs text-indigo-500 font-normal">(Leader)</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{m.user?.email}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          {/* Supervisor Preferences card */}
          <Card className="border-gray-200 shadow-none">
            <CardContent className="pt-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Supervisor Preferences</h2>
              {group.preferences.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No preferences submitted yet.</p>
              ) : (
                <ul className="space-y-3">
                  {group.preferences
                    .sort((a, b) => a.preference - b.preference)
                    .map((pref) => {
                      const initial = (pref.supervisor?.name ?? pref.supervisor?.email ?? '?')
                        .charAt(0)
                        .toUpperCase();
                      return (
                        <li key={pref.id} className="flex items-center gap-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shrink-0">
                            {PREF_LABEL[pref.preference] ?? `P${pref.preference}`}
                          </span>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-50 shrink-0">
                              <span className="text-xs font-semibold text-purple-600">{initial}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {pref.supervisor?.name ?? (
                                  <span className="text-gray-400 italic">{pref.supervisor?.email}</span>
                                )}
                              </p>
                              <p className="text-xs text-gray-400 truncate">{pref.supervisor?.email}</p>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
