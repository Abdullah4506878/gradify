'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  User,
  FolderOpen,
  UserPlus,
  Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface FypPhase {
  id: number;
  phase: string;
  session: { id: number; name: string; semester: string; year: number };
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

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [phases, setPhases] = useState<FypPhase[]>([]);
  const [phasesLoading, setPhasesLoading] = useState(false);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadGroup = useCallback(async () => {
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
  }, [user?.id]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  // Fetch all phases once on mount
  useEffect(() => {
    setPhasesLoading(true);
    api
      .get<FypPhase[]>('/fyp-phases')
      .then((res) => setPhases(res.data))
      .catch(() => setPhases([]))
      .finally(() => setPhasesLoading(false));
  }, []);

  const openDialog = () => {
    setSelectedPhaseId('');
    setCreateError(null);
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!selectedPhaseId) {
      setCreateError('Please select a FYP Phase');
      return;
    }
    setCreateError(null);
    setCreateLoading(true);
    try {
      await api.post('/groups', { phaseId: parseInt(selectedPhaseId, 10) });
      setDialogOpen(false);
      setSelectedPhaseId('');
      setLoading(true);
      await loadGroup();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setCreateError(typeof msg === 'string' ? msg : 'Failed to create group. Please try again.');
    } finally {
      setCreateLoading(false);
    }
  };

  const status = group ? (STATUS_STYLES[group.status] ?? STATUS_STYLES.FORMING) : null;

  return (
    <DashboardLayout navItems={navItems}>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Group</h1>
        <p className="mt-1 text-sm text-gray-500">Your FYP group details and members</p>
      </div>

      {loading ? (
        <div className="max-w-2xl space-y-5">
          <Card className="border-gray-200 shadow-none">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
                <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
              </div>
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
            </CardContent>
          </Card>
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
        /* ── No group empty state ── */
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
            onClick={openDialog}
            className="mt-6 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            <UserPlus className="h-4 w-4" strokeWidth={1.75} />
            Create Group
          </button>
        </div>
      ) : (
        /* ── Group details ── */
        <div className="max-w-2xl space-y-5">
          {/* Group info */}
          <Card className="border-gray-200 shadow-none">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                    FYP ID
                  </p>
                  <p className="text-2xl font-bold text-gray-900 font-mono">{group.fypId}</p>
                </div>
                {status && (
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                  >
                    {status.label}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                <span className="font-medium text-gray-700">Leader: </span>
                {group.leader.name ?? group.leader.email}
              </p>
            </CardContent>
          </Card>

          {/* Members */}
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
                          {m.user?.name ?? (
                            <span className="text-gray-400 italic">No name</span>
                          )}
                          {isLeader && (
                            <span className="ml-2 text-xs text-indigo-500 font-normal">
                              (Leader)
                            </span>
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

          {/* Supervisor Preferences */}
          <Card className="border-gray-200 shadow-none">
            <CardContent className="pt-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">
                Supervisor Preferences
              </h2>
              {group.preferences.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Not submitted yet.</p>
              ) : (
                <ul className="space-y-3">
                  {group.preferences
                    .sort((a, b) => a.preference - b.preference)
                    .map((pref) => {
                      const initial = (
                        pref.supervisor?.name ?? pref.supervisor?.email ?? '?'
                      )
                        .charAt(0)
                        .toUpperCase();
                      return (
                        <li key={pref.id} className="flex items-center gap-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shrink-0">
                            {PREF_LABEL[pref.preference] ?? `P${pref.preference}`}
                          </span>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-50 shrink-0">
                              <span className="text-xs font-semibold text-purple-600">
                                {initial}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {pref.supervisor?.name ?? (
                                  <span className="text-gray-400 italic">
                                    {pref.supervisor?.email}
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-400 truncate">
                                {pref.supervisor?.email}
                              </p>
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

      {/* ── Create Group Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Create a New Group</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-1">
            {/* Phase selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                FYP Phase
              </label>
              <Select
                value={selectedPhaseId}
                onValueChange={(val) => {
                  setSelectedPhaseId(val);
                  setCreateError(null);
                }}
                disabled={phasesLoading}
              >
                <SelectTrigger className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 h-auto focus:border-indigo-500 focus:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500">
                  <SelectValue
                    placeholder={phasesLoading ? 'Loading phases…' : 'Select a phase'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {phases.length === 0 && !phasesLoading ? (
                    <div className="px-3 py-4 text-sm text-gray-400 text-center">
                      No phases available
                    </div>
                  ) : (
                    phases.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.session?.name} — {p.phase.replace('_', ' ')}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Error banner */}
            {createError && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {createError}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                disabled={createLoading}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={createLoading || phasesLoading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {createLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {createLoading ? 'Creating…' : 'Create Group'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
