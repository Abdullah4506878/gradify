'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  User,
  FolderOpen,
  UserPlus,
  Loader2,
  CheckCircle,
  Star,
  Lightbulb,
  AlertCircle,
  XCircle,
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
  phase?: { phase: string; session?: { name: string } };
  leader: { id: number; name: string | null; email: string };
  members: Member[];
  preferences: Preference[];
}

type ProposalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
interface Proposal {
  id: number;
  projectTitle: string;
  status: ProposalStatus;
  supervisorComments: string | null;
}

interface FypPhase {
  id: number;
  phase: string;
  session: { id: number; name: string; semester: string; year: number };
}

interface Supervisor {
  id: number;
  name: string | null;
  email: string;
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

  // Create group
  const [createOpen, setCreateOpen] = useState(false);
  const [phases, setPhases] = useState<FypPhase[]>([]);
  const [phasesLoading, setPhasesLoading] = useState(false);
  const [selectedPhaseId, setSelectedPhaseId] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Add member
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [addMemberSuccess, setAddMemberSuccess] = useState<string | null>(null);

  // Proposal
  const [proposal, setProposal] = useState<Proposal | null | undefined>(undefined);
  const [proposalLoading, setProposalLoading] = useState(true);

  // Submit preferences
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [supervisorsLoading, setSupervisorsLoading] = useState(false);
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [p3, setP3] = useState('');
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [prefsError, setPrefsError] = useState<string | null>(null);

  const loadGroup = useCallback(async () => {
    try {
      const [groupsRes, proposalRes] = await Promise.allSettled([
        api.get<Group[]>('/groups'),
        api.get<Proposal>('/proposals/my'),
      ]);
      if (groupsRes.status === 'fulfilled') {
        const found = groupsRes.value.data.find(
          (g) =>
            g.leader?.id === user?.id ||
            g.members.some((m) => m.user?.id === user?.id || m.userId === user?.id),
        );
        setGroup(found ?? null);
      } else {
        setGroup(null);
      }
      if (proposalRes.status === 'fulfilled') {
        setProposal(proposalRes.value.data ?? null);
      } else {
        setProposal(null);
      }
      setProposalLoading(false);
    } catch {
      setGroup(null);
      setProposal(null);
      setProposalLoading(false);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  useEffect(() => {
    setPhasesLoading(true);
    api
      .get<FypPhase[]>('/fyp-phases')
      .then((res) => setPhases(res.data))
      .catch(() => setPhases([]))
      .finally(() => setPhasesLoading(false));
  }, []);

  // Fetch supervisors when prefs modal opens
  useEffect(() => {
    if (!prefsOpen) return;
    setSupervisorsLoading(true);
    api
      .get<Supervisor[]>('/users', { params: { role: 'SUPERVISOR' } })
      .then((res) => setSupervisors(res.data))
      .catch(() => setSupervisors([]))
      .finally(() => setSupervisorsLoading(false));
  }, [prefsOpen]);

  const handleCreate = async () => {
    if (!selectedPhaseId) {
      setCreateError('Please select a FYP Phase');
      return;
    }
    setCreateError(null);
    setCreateLoading(true);
    try {
      await api.post('/groups', { phaseId: parseInt(selectedPhaseId, 10) });
      setCreateOpen(false);
      setSelectedPhaseId('');
      setLoading(true);
      await loadGroup();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setCreateError(typeof msg === 'string' ? msg : 'Failed to create group. Please try again.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleAddMember = async () => {
    const email = memberEmail.trim();
    if (!email) {
      setAddMemberError('Please enter an email address.');
      return;
    }
    setAddMemberError(null);
    setAddMemberSuccess(null);
    setAddMemberLoading(true);
    try {
      const usersRes = await api.get<{ id: number; email: string }[]>('/users');
      console.log('All users:', usersRes.data.length);
      const found = usersRes.data.find((u) => u.email === email);
      console.log('Found user:', found);
      if (!found) {
        setAddMemberError('No student found with this email address.');
        return;
      }
      console.log('Posting join with userId:', found.id, 'groupId:', group!.id);
      await api.post(`/groups/${group!.id}/join`, { userId: found.id });
      setAddMemberOpen(false);
      setMemberEmail('');
      setLoading(true);
      await loadGroup();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setAddMemberError(typeof msg === 'string' ? msg : 'Failed to add member. Please try again.');
    } finally {
      setAddMemberLoading(false);
    }
  };

  const handleSubmitPrefs = async () => {
    if (!p1 || !p2 || !p3) {
      setPrefsError('Please select all three supervisor preferences.');
      return;
    }
    const ids = [p1, p2, p3];
    if (new Set(ids).size !== 3) {
      setPrefsError('Please select three different supervisors.');
      return;
    }
    setPrefsError(null);
    setPrefsLoading(true);
    try {
      await api.post(`/groups/${group!.id}/preferences`, {
        preferences: [
          { supervisorId: parseInt(p1, 10), preference: 1 },
          { supervisorId: parseInt(p2, 10), preference: 2 },
          { supervisorId: parseInt(p3, 10), preference: 3 },
        ],
      });
      setPrefsOpen(false);
      setP1(''); setP2(''); setP3('');
      setLoading(true);
      await loadGroup();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setPrefsError(typeof msg === 'string' ? msg : 'Failed to submit preferences. Please try again.');
    } finally {
      setPrefsLoading(false);
    }
  };

  const isLeader = group?.leader?.id === user?.id;
  const status = group ? (STATUS_STYLES[group.status] ?? STATUS_STYLES.FORMING) : null;

  console.log('Proposal state:', { proposalLoading, proposal, isLeader });

  return (
    <DashboardLayout navItems={navItems}>
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
        /* ── No group ── */
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
            onClick={() => { setSelectedPhaseId(''); setCreateError(null); setCreateOpen(true); }}
            className="mt-6 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            <UserPlus className="h-4 w-4" strokeWidth={1.75} />
            Create Group
          </button>
        </div>
      ) : (
        /* ── Group details ── */
        <div className="max-w-2xl space-y-5">
          {/* Group info card */}
          <Card className="border-gray-200 shadow-none">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                    FYP ID
                  </p>
                  <p className="text-2xl font-bold text-indigo-600 font-mono">{group.fypId}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {status && (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                      {status.label}
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    isLeader ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {isLeader && <Star className="h-3 w-3" strokeWidth={2} />}
                    {isLeader ? 'Group Leader' : 'Member'}
                  </span>
                </div>
              </div>

              {group.phase && (
                <p className="text-sm text-gray-500 mt-1">
                  <span className="font-medium text-gray-700">Phase: </span>
                  {group.phase.session?.name} — {group.phase.phase.replace('_', ' ')}
                </p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                <span className="font-medium text-gray-700">Leader: </span>
                {group.leader.name ?? group.leader.email}
              </p>
            </CardContent>
          </Card>

          {/* Members card */}
          <Card className="border-gray-200 shadow-none">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">
                  Members ({group.members.length})
                </h2>
                {isLeader && (
                  <button
                    type="button"
                    onClick={() => { setMemberEmail(''); setAddMemberError(null); setAddMemberSuccess(null); setAddMemberOpen(true); }}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    <UserPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Add Member
                  </button>
                )}
              </div>
              <ul className="space-y-3">
                {group.members.map((m) => {
                  const isThisLeader = m.user?.id === group.leader.id;
                  const initial = (m.user?.name ?? m.user?.email ?? '?').charAt(0).toUpperCase();
                  return (
                    <li key={m.id} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 shrink-0">
                        <span className="text-xs font-semibold text-indigo-600">{initial}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {m.user?.name ?? <span className="text-gray-400 italic">No name</span>}
                          {isThisLeader && (
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

          {/* Project Idea card */}
          <Card className="border-gray-200 shadow-none">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">Project Idea</h2>
                {proposalLoading && (
                  <div className="h-5 w-20 animate-pulse rounded-full bg-gray-200" />
                )}
                {proposal?.status === 'APPROVED' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    <CheckCircle className="h-3 w-3" strokeWidth={2} />
                    Approved
                  </span>
                )}
                {proposal?.status === 'PENDING' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                    <AlertCircle className="h-3 w-3" strokeWidth={2} />
                    Under Review
                  </span>
                )}
                {proposal?.status === 'REJECTED' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                    <XCircle className="h-3 w-3" strokeWidth={2} />
                    Rejected
                  </span>
                )}
              </div>

              {proposalLoading ? (
                <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
              ) : !proposal ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-400 italic">No project idea submitted yet.</p>
                  {!proposalLoading && group && isLeader && !proposal && (
                    <Link
                      href="/dashboard/student/proposal"
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
                    >
                      <Lightbulb className="h-4 w-4" strokeWidth={1.75} />
                      Submit Project Idea
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-900">{proposal.projectTitle}</p>
                  {proposal.status === 'REJECTED' && proposal.supervisorComments && (
                    <div className="rounded-lg border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                      <p className="font-medium mb-0.5">Supervisor feedback:</p>
                      <p>{proposal.supervisorComments}</p>
                    </div>
                  )}
                  {proposal.status === 'REJECTED' && isLeader && (
                    <Link
                      href="/dashboard/student/proposal"
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors mt-2"
                    >
                      <Lightbulb className="h-4 w-4" strokeWidth={1.75} />
                      Resubmit Proposal
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Supervisor Preferences card */}
          <Card className="border-gray-200 shadow-none">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">Supervisor Preferences</h2>
                {group.preferences.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    <CheckCircle className="h-3 w-3" strokeWidth={2} />
                    Submitted
                  </span>
                )}
              </div>

              {group.preferences.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-400 italic">Not submitted yet.</p>
                  {isLeader && (
                    <button
                      type="button"
                      onClick={() => { setP1(''); setP2(''); setP3(''); setPrefsError(null); setPrefsOpen(true); }}
                      className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
                    >
                      <Star className="h-4 w-4" strokeWidth={1.75} />
                      Submit Preferences
                    </button>
                  )}
                </div>
              ) : (
                <ul className="space-y-3">
                  {[...group.preferences]
                    .sort((a, b) => a.preference - b.preference)
                    .map((pref) => {
                      const initial = (pref.supervisor?.name ?? pref.supervisor?.email ?? '?')
                        .charAt(0).toUpperCase();
                      return (
                        <li key={pref.id} className="flex items-center gap-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shrink-0">
                            {PREF_LABEL[pref.preference] ?? `P${pref.preference}`}
                          </span>
                          <div className="flex items-center gap-2.5 min-w-0">
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

      {/* ── Create Group Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Create a New Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">FYP Phase</label>
              <Select
                value={selectedPhaseId}
                onValueChange={(val) => { setSelectedPhaseId(val); setCreateError(null); }}
                disabled={phasesLoading}
              >
                <SelectTrigger className="w-full border-gray-200 bg-gray-50 focus:border-indigo-500">
                  <SelectValue placeholder={phasesLoading ? 'Loading phases…' : 'Select a phase'} />
                </SelectTrigger>
                <SelectContent>
                  {phases.length === 0 && !phasesLoading ? (
                    <div className="px-3 py-4 text-sm text-gray-400 text-center">No phases available</div>
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
            {createError && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {createError}
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                disabled={createLoading}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={createLoading || phasesLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {createLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {createLoading ? 'Creating…' : 'Create Group'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Member Dialog ── */}
      <Dialog open={addMemberOpen} onOpenChange={(open) => { if (!open) { setAddMemberError(null); setAddMemberSuccess(null); } setAddMemberOpen(open); }}>
        <DialogContent className="sm:max-w-sm" showCloseButton>
          <DialogHeader>
            <DialogTitle>Add Group Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <label htmlFor="memberEmail" className="block text-sm font-medium text-gray-700 mb-1.5">
                Student Email
              </label>
              <input
                id="memberEmail"
                type="email"
                value={memberEmail}
                onChange={(e) => { setMemberEmail(e.target.value); setAddMemberError(null); setAddMemberSuccess(null); }}
                placeholder="student@university.edu"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
              />
            </div>
            {addMemberError && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {addMemberError}
              </div>
            )}
            {addMemberSuccess && (
              <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
                {addMemberSuccess}
              </div>
            )}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddMemberOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleAddMember}
                disabled={addMemberLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {addMemberLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {addMemberLoading ? 'Adding…' : 'Add Member'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Submit Preferences Dialog ── */}
      <Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Submit Supervisor Preferences</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-1">
            <p className="text-sm text-gray-500">
              Rank your top 3 supervisor choices. All three must be different.
            </p>

            {supervisorsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-200" />
                ))}
              </div>
            ) : (
              <>
                {/* P1 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <span className="inline-flex items-center justify-center h-5 w-8 rounded-full bg-indigo-600 text-xs font-bold text-white mr-2">P1</span>
                    First Choice
                  </label>
                  <Select value={p1} onValueChange={(v) => { setP1(v); setPrefsError(null); }} disabled={supervisors.length === 0}>
                    <SelectTrigger className="w-full border-gray-200 bg-gray-50">
                      <SelectValue placeholder={supervisors.length === 0 ? 'No supervisors available' : 'Select supervisor'} />
                    </SelectTrigger>
                    <SelectContent>
                      {supervisors.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name ?? s.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* P2 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <span className="inline-flex items-center justify-center h-5 w-8 rounded-full bg-indigo-500 text-xs font-bold text-white mr-2">P2</span>
                    Second Choice
                  </label>
                  <Select value={p2} onValueChange={(v) => { setP2(v); setPrefsError(null); }} disabled={supervisors.length === 0}>
                    <SelectTrigger className="w-full border-gray-200 bg-gray-50">
                      <SelectValue placeholder="Select supervisor" />
                    </SelectTrigger>
                    <SelectContent>
                      {supervisors.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name ?? s.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* P3 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <span className="inline-flex items-center justify-center h-5 w-8 rounded-full bg-indigo-400 text-xs font-bold text-white mr-2">P3</span>
                    Third Choice
                  </label>
                  <Select value={p3} onValueChange={(v) => { setP3(v); setPrefsError(null); }} disabled={supervisors.length === 0}>
                    <SelectTrigger className="w-full border-gray-200 bg-gray-50">
                      <SelectValue placeholder="Select supervisor" />
                    </SelectTrigger>
                    <SelectContent>
                      {supervisors.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name ?? s.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {prefsError && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {prefsError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPrefsOpen(false)}
                disabled={prefsLoading}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitPrefs}
                disabled={prefsLoading || supervisorsLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {prefsLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {prefsLoading ? 'Submitting…' : 'Submit Preferences'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
