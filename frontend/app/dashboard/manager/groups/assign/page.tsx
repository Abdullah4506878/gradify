'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FolderOpen,
  BarChart,
  User,
  ArrowLeft,
  Check,
  ClipboardCheck,
  ClipboardList,
  FileText,
  BarChart2,
  BookOpen,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '@/lib/api';


interface Supervisor {
  id: number;
  name: string | null;
  email: string;
  maxGroups: number;
  assignedGroupsCount: number;
}

interface Group {
  id: number;
  fypId: string | null;
  supervisorAssigned: boolean;
  members: unknown[];
  preferences: { id: number; preference: number; supervisor: Supervisor }[];
  leader: { id: number; name: string | null; email: string };
}

export default function AssignSupervisorPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);

  const [selections, setSelections] = useState<Record<number, string>>({});
  const [assigning, setAssigning] = useState<Record<number, boolean>>({});
  const [assigned, setAssigned] = useState<Record<number, boolean>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    Promise.allSettled([
      api.get<Group[]>('/groups'),
      api.get<Supervisor[]>('/users', { params: { role: 'SUPERVISOR' } }),
    ]).then(([groupsRes, supervisorsRes]) => {
      if (groupsRes.status === 'fulfilled') setGroups(groupsRes.value.data);
      if (supervisorsRes.status === 'fulfilled') setSupervisors(supervisorsRes.value.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleAssign = async (groupId: number) => {
    const supervisorId = selections[groupId];
    if (!supervisorId) {
      setErrors((prev) => ({ ...prev, [groupId]: 'Please select a supervisor.' }));
      return;
    }
    const sup = supervisors.find((s) => String(s.id) === supervisorId);
    if (sup && sup.assignedGroupsCount >= sup.maxGroups) {
      setErrors((prev) => ({ ...prev, [groupId]: `${sup.name ?? sup.email} is at full capacity (${sup.assignedGroupsCount}/${sup.maxGroups}).` }));
      return;
    }
    setErrors((prev) => { const n = { ...prev }; delete n[groupId]; return n; });
    setAssigning((prev) => ({ ...prev, [groupId]: true }));
    try {
      const response = await api.post<Group>(`/groups/${groupId}/assign`, {
        supervisorId: parseInt(supervisorId, 10),
      });
      setGroups((prev) => prev.map((g) => g.id === groupId ? response.data : g));
      setAssigned((prev) => ({ ...prev, [groupId]: true }));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setErrors((prev) => ({
        ...prev,
        [groupId]: typeof msg === 'string' ? msg : 'Assignment failed.',
      }));
    } finally {
      setAssigning((prev) => ({ ...prev, [groupId]: false }));
    }
  };

  return (
    <>
      {/* Back link + header */}
      <div className="mb-6">
        <Link
          href="/dashboard/manager/groups"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Back to Groups
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Assign Supervisors</h1>
        <p className="mt-1 text-sm text-gray-500">Assign a supervisor to each group</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-20 px-6">
          <FolderOpen className="h-6 w-6 text-gray-300 mb-3" strokeWidth={1.75} />
          <p className="text-sm font-medium text-gray-500">No groups found</p>
          <p className="mt-1 text-xs text-gray-400">Groups will appear here once students form them.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden overflow-x-auto">
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
                  Student Preferences
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Assign
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Save
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {groups.map((group) => {
                const assignedThisSession = assigned[group.id];
                const alreadyAssigned = group.supervisorAssigned || assignedThisSession;
                const assignedSupervisor = group.preferences.find((p) => p.preference === 1)?.supervisor;
                return (
                  <tr key={group.id} className={`transition-colors ${alreadyAssigned ? 'bg-green-50/40' : 'hover:bg-gray-50'}`}>
                    {/* FYP ID */}
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-medium text-gray-900">
                        {group.fypId ?? `Group #${group.id}`}
                      </span>
                    </td>

                    {/* Leader */}
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {group.leader?.name ?? group.leader?.email ?? '—'}
                    </td>

                    {/* Members count */}
                    <td className="px-6 py-4 text-sm text-gray-500">{group.members.length}</td>

                    {/* Student preferences P1/P2/P3 */}
                    <td className="px-6 py-4">
                      {group.preferences.length === 0 ? (
                        <span className="text-xs text-gray-400 italic">None submitted</span>
                      ) : (
                        <div className="space-y-0.5">
                          {[1, 2, 3].map((rank) => {
                            const pref = group.preferences.find((p) => p.preference === rank);
                            return pref ? (
                              <div key={rank} className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-indigo-500 w-5">P{rank}</span>
                                <span className="text-xs text-gray-700">
                                  {pref.supervisor?.name ?? pref.supervisor?.email}
                                </span>
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}
                    </td>

                    {/* Dropdown or assigned supervisor */}
                    <td className="px-6 py-4">
                      {alreadyAssigned ? (
                        <div className="text-sm text-gray-700">
                          {assignedSupervisor
                            ? (assignedSupervisor.name ?? assignedSupervisor.email)
                            : <span className="italic text-gray-400">—</span>}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Select
                            value={selections[group.id] ?? ''}
                            onValueChange={(val) => {
                              setSelections((prev) => ({ ...prev, [group.id]: val }));
                              setErrors((prev) => { const n = { ...prev }; delete n[group.id]; return n; });
                              setAssigned((prev) => { const n = { ...prev }; delete n[group.id]; return n; });
                            }}
                            disabled={supervisors.length === 0}
                          >
                            <SelectTrigger className="w-52 h-9 text-sm border-gray-200 bg-gray-50">
                              <SelectValue placeholder={supervisors.length === 0 ? 'No supervisors' : 'Select supervisor'} />
                            </SelectTrigger>
                            <SelectContent>
                              {supervisors.map((s) => {
                                const isFull = s.assignedGroupsCount >= s.maxGroups;
                                return (
                                  <SelectItem key={s.id} value={String(s.id)} disabled={isFull}>
                                    {s.name ?? s.email} ({s.assignedGroupsCount}/{s.maxGroups} assigned){isFull ? ' — Full' : ''}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          {errors[group.id] && (
                            <p className="text-xs text-red-500">{errors[group.id]}</p>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Save / Assigned badge */}
                    <td className="px-6 py-4 text-right">
                      {alreadyAssigned ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                          <Check className="h-3.5 w-3.5" strokeWidth={2} />
                          Assigned
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAssign(group.id)}
                          disabled={assigning[group.id]}
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                        >
                          {assigning[group.id] ? 'Saving…' : 'Save'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
