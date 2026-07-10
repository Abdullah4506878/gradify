'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  FolderOpen,
  UserCheck,
  Mail,
  Pencil,
  Trash2,
  Plus,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import api from '@/lib/api';

type GroupStatus = 'FORMING' | 'ACTIVE' | 'COMPLETED';
type EditTab = 'members' | 'leader' | 'supervisor' | 'delete';

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

interface GroupInvite {
  id: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  invited: { id: number; name: string | null; email: string };
  inviter: { id: number; name: string | null; email: string };
}

interface Group {
  id: number;
  fypId: string;
  status: GroupStatus;
  leaderId: number;
  createdAt: string;
  phase?: { phase: string; session?: { name: string } };
  leader: { id: number; name: string | null; email: string };
  members: Member[];
  preferences: Preference[];
  invites?: GroupInvite[];
}

interface Supervisor {
  id: number;
  name: string | null;
  email: string;
}

type Toast = { type: 'success' | 'error'; text: string };

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
            style={{ width: i === 6 ? '6rem' : '60%' }}
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

  // Edit dialog
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [editTab, setEditTab] = useState<EditTab>('members');
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [saving, setSaving] = useState(false);

  // Tab-specific inputs
  const [addEmail, setAddEmail] = useState('');
  const [newLeaderId, setNewLeaderId] = useState('');
  const [newSupervisorId, setNewSupervisorId] = useState('');
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

  const showToast = (t: Toast) => {
    setToast(t);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchGroups = async () => {
    try {
      const res = await api.get<Group[]>('/groups');
      setGroups(res.data);
    } catch {
      // keep empty list on failure
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGroups(); }, []);

  const openEditDialog = (group: Group, tab: EditTab = 'members') => {
    setEditGroup(group);
    setEditTab(tab);
    setAddEmail('');
    setNewLeaderId('');
    setNewSupervisorId('');
    setDeleteConfirmed(false);
    api.get<Supervisor[]>('/users', { params: { role: 'SUPERVISOR' } })
      .then((r) => setSupervisors(r.data))
      .catch(() => {});
  };

  const callEdit = async (action: object): Promise<Group | null> => {
    if (!editGroup) return null;
    setSaving(true);
    try {
      const res = await api.patch<Group>(`/groups/${editGroup.id}/manager-edit`, action);
      const updated = res.data;
      setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      setEditGroup(updated);
      return updated;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast({ type: 'error', text: typeof msg === 'string' ? msg : 'Action failed.' });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async () => {
    if (!addEmail.trim()) return;
    const result = await callEdit({ addMemberEmail: addEmail.trim() });
    if (result) { setAddEmail(''); showToast({ type: 'success', text: 'Member added.' }); }
  };

  const handleRemoveMember = async (userId: number) => {
    const result = await callEdit({ removeMemberId: userId });
    if (result) showToast({ type: 'success', text: 'Member removed.' });
  };

  const handleChangeLeader = async () => {
    if (!newLeaderId) return;
    const result = await callEdit({ newLeaderId: parseInt(newLeaderId, 10) });
    if (result) { setNewLeaderId(''); showToast({ type: 'success', text: 'Leader updated.' }); }
  };

  const handleReassignSupervisor = async () => {
    if (!newSupervisorId) return;
    const result = await callEdit({ newSupervisorId: parseInt(newSupervisorId, 10) });
    if (result) { setNewSupervisorId(''); showToast({ type: 'success', text: 'Supervisor reassigned.' }); }
  };

  const handleDeleteGroup = async () => {
    if (!editGroup) return;
    setSaving(true);
    try {
      await api.delete(`/groups/${editGroup.id}/manager-delete`);
      setGroups((prev) => prev.filter((g) => g.id !== editGroup.id));
      setEditGroup(null);
      showToast({ type: 'success', text: 'Group deleted successfully.' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast({ type: 'error', text: typeof msg === 'string' ? msg : 'Failed to delete group.' });
    } finally {
      setSaving(false);
    }
  };

  const filtered = groups.filter((g) => {
    const q = search.toLowerCase();
    const leaderName = (g.leader?.name ?? g.leader?.email ?? '').toLowerCase();
    return (g.fypId?.toLowerCase() ?? '').includes(q) || leaderName.includes(q);
  });

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === 'success'
              ? 'border-green-100 bg-green-50 text-green-700'
              : 'border-red-100 bg-red-50 text-red-700'
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Groups</h1>
          <p className="mt-1 text-sm text-gray-500">
            {loading ? 'Loading…' : `${groups.length} group${groups.length !== 1 ? 's' : ''} registered`}
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
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={1.75} />
        <input
          type="text"
          placeholder="Search by FYP ID or leader name…"
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
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">FYP ID</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Leader</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Members</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Supervisor Preferences</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
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
                      {search ? 'Try a different FYP ID or leader name.' : 'Groups will appear here once students form them.'}
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
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">Submitted</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewGroup(group)}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditDialog(group, 'members')}
                          className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                          title="Edit group"
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditDialog(group, 'delete')}
                          className="rounded-lg border border-red-100 p-1.5 text-red-400 hover:bg-red-50 hover:border-red-200 transition-colors"
                          title="Delete group"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </button>
                      </div>
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
                                <p className="text-sm text-gray-900">
                                  {pref.supervisor?.name ?? <span className="italic text-gray-400">{pref.supervisor?.email}</span>}
                                </p>
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

                {/* Invite History */}
                {viewGroup.invites && viewGroup.invites.length > 0 && (
                  <div className="rounded-xl bg-gray-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                      Invite History ({viewGroup.invites.length})
                    </p>
                    <ul className="space-y-2">
                      {viewGroup.invites.map((inv) => {
                        const badgeClass =
                          inv.status === 'ACCEPTED'
                            ? 'bg-green-50 text-green-700'
                            : inv.status === 'REJECTED'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-yellow-50 text-yellow-700';
                        return (
                          <li key={inv.id} className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm text-gray-900 truncate">
                                {inv.invited.name ?? <span className="italic text-gray-400">No name</span>}
                              </p>
                              <p className="text-xs text-gray-400 truncate">{inv.invited.email}</p>
                            </div>
                            <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}>
                              {inv.status.charAt(0) + inv.status.slice(1).toLowerCase()}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

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

      {/* Edit Group Dialog */}
      <Dialog open={!!editGroup} onOpenChange={(open) => { if (!open) setEditGroup(null); }}>
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>
              {editGroup ? `Edit Group — ${editGroup.fypId}` : 'Edit Group'}
            </DialogTitle>
          </DialogHeader>

          {editGroup && (
            <div className="pt-2">
              {/* Tab bar */}
              <div className="flex gap-1 rounded-lg bg-gray-100 p-1 mb-5">
                {(['members', 'leader', 'supervisor', 'delete'] as EditTab[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEditTab(t)}
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      editTab === t
                        ? t === 'delete'
                          ? 'bg-white text-red-600 shadow-sm'
                          : 'bg-white text-indigo-600 shadow-sm'
                        : t === 'delete'
                          ? 'text-red-400 hover:text-red-500'
                          : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              {/* Members tab */}
              {editTab === 'members' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {editGroup.members.length === 0 ? (
                      <p className="text-sm text-gray-400 italic py-2">No members yet.</p>
                    ) : (
                      editGroup.members.map((m) => (
                        <div key={m.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 shrink-0">
                              <span className="text-xs font-semibold text-indigo-600">
                                {(m.user?.name ?? m.user?.email ?? '?').charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {m.user?.name ?? <span className="italic text-gray-400">No name</span>}
                              </p>
                              <p className="text-xs text-gray-400 truncate">{m.user?.email}</p>
                            </div>
                            {editGroup.leaderId === m.user?.id && (
                              <span className="shrink-0 inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
                                Leader
                              </span>
                            )}
                          </div>
                          {m.user && editGroup.leaderId !== m.user.id && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(m.user!.id)}
                              disabled={saving}
                              className="ml-3 shrink-0 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1.5">Add member by email</p>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={addEmail}
                        onChange={(e) => setAddEmail(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddMember(); }}
                        placeholder="student@example.com"
                        className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={handleAddMember}
                        disabled={saving || !addEmail.trim()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Leader tab */}
              {editTab === 'leader' && (
                <div className="space-y-4">
                  <div className="rounded-lg bg-gray-50 px-4 py-3">
                    <p className="text-xs font-medium text-gray-400 mb-1">Current Leader</p>
                    <p className="text-sm font-semibold text-gray-900">{editGroup.leader.name ?? editGroup.leader.email}</p>
                    <p className="text-xs text-gray-400">{editGroup.leader.email}</p>
                  </div>

                  {editGroup.members.filter((m) => m.user && m.user.id !== editGroup.leaderId).length === 0 ? (
                    <p className="text-sm text-gray-400 italic">Add more members before changing the leader.</p>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">New Leader</label>
                        <select
                          value={newLeaderId}
                          onChange={(e) => setNewLeaderId(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                        >
                          <option value="">Select member…</option>
                          {editGroup.members
                            .filter((m) => m.user && m.user.id !== editGroup.leaderId)
                            .map((m) => (
                              <option key={m.id} value={m.user!.id}>
                                {m.user!.name ?? m.user!.email}
                              </option>
                            ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={handleChangeLeader}
                        disabled={saving || !newLeaderId}
                        className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                      >
                        {saving ? 'Saving…' : 'Change Leader'}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Supervisor tab */}
              {editTab === 'supervisor' && (
                <div className="space-y-4">
                  {editGroup.preferences.filter((p) => p.preference === 1).length > 0 && (
                    <div className="rounded-lg bg-gray-50 px-4 py-3">
                      <p className="text-xs font-medium text-gray-400 mb-1">Current Supervisor</p>
                      {editGroup.preferences
                        .filter((p) => p.preference === 1)
                        .map((p) => (
                          <div key={p.id}>
                            <p className="text-sm font-semibold text-gray-900">{p.supervisor.name ?? p.supervisor.email}</p>
                            <p className="text-xs text-gray-400">{p.supervisor.email}</p>
                          </div>
                        ))}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Reassign Supervisor</label>
                    {supervisors.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No supervisors available.</p>
                    ) : (
                      <select
                        value={newSupervisorId}
                        onChange={(e) => setNewSupervisorId(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                      >
                        <option value="">Select supervisor…</option>
                        {supervisors.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name ?? s.email}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {supervisors.length > 0 && (
                    <button
                      type="button"
                      onClick={handleReassignSupervisor}
                      disabled={saving || !newSupervisorId}
                      className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                      {saving ? 'Saving…' : 'Reassign Supervisor'}
                    </button>
                  )}
                </div>
              )}

              {/* Delete tab */}
              {editTab === 'delete' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-4">
                    <p className="text-sm font-semibold text-red-800 mb-1">
                      Delete Group {editGroup.fypId}
                    </p>
                    <p className="text-sm text-red-700">
                      This will permanently remove the group, all memberships, supervisor preferences, and invites.
                      Tasks, proposals, and minutes of meeting are preserved.
                    </p>
                  </div>

                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={deleteConfirmed}
                      onChange={(e) => setDeleteConfirmed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">
                      I understand this action cannot be undone.
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={handleDeleteGroup}
                    disabled={saving || !deleteConfirmed}
                    className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? 'Deleting…' : 'Delete Group'}
                  </button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
