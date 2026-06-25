'use client';

import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FolderOpen,
  BarChart,
  BarChart2,
  FileText,
  User,
  ClipboardCheck,
  ClipboardList,
  Pencil,
  X,
  Check,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/api';

const navItems = [
  { label: 'Dashboard', href: '/dashboard/manager', icon: LayoutDashboard },
  { label: 'Students', href: '/dashboard/manager/students', icon: Users },
  { label: 'Supervisors', href: '/dashboard/manager/supervisors', icon: Briefcase },
  { label: 'Workload', href: '/dashboard/manager/supervisors/workload', icon: BarChart2 },
  { label: 'Groups', href: '/dashboard/manager/groups', icon: FolderOpen },
  { label: 'FYP Projects', href: '/dashboard/manager/fyp-projects', icon: BookOpen },
  { label: 'Minutes of Meeting', href: '/dashboard/manager/mom', icon: FileText },
  { label: 'Tasks', href: '/dashboard/manager/tasks', icon: ClipboardList },
  { label: 'Proposals', href: '/dashboard/manager/proposals', icon: ClipboardCheck },
  { label: 'Reports', href: '/dashboard/manager/reports', icon: BarChart },
  { label: 'Profile', href: '/dashboard/manager/profile', icon: User },
];

interface Supervisor {
  id: number;
  name: string | null;
  email: string;
  maxGroups: number;
  assignedGroupsCount: number;
}

function UtilizationBadge({ assigned, max }: { assigned: number; max: number }) {
  const over = assigned > max;
  const pct = max === 0 ? 100 : Math.round((assigned / max) * 100);
  let cls = 'bg-green-50 text-green-700';
  if (over) cls = 'bg-red-50 text-red-700';
  else if (pct > 80) cls = 'bg-red-50 text-red-700';
  else if (pct > 50) cls = 'bg-yellow-50 text-yellow-700';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {over ? 'Over limit' : `${pct}%`}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-4 animate-pulse rounded bg-gray-200" style={{ width: i === 1 ? '2rem' : '70%' }} />
        </td>
      ))}
    </tr>
  );
}

export default function WorkloadPage() {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);

  const [bulkValue, setBulkValue] = useState('5');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkMsg, setBulkMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    api
      .get<Supervisor[]>('/users', { params: { role: 'SUPERVISOR' } })
      .then((res) => setSupervisors(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleBulkApply = async () => {
    const n = parseInt(bulkValue, 10);
    if (isNaN(n) || n < 1 || n > 10) {
      setBulkMsg({ type: 'error', text: 'Value must be between 1 and 10.' });
      return;
    }
    setBulkSaving(true);
    setBulkMsg(null);
    try {
      await api.patch('/users/supervisors/workload-bulk', { maxGroups: n });
      setSupervisors((prev) => prev.map((s) => ({ ...s, maxGroups: n })));
      setBulkMsg({ type: 'success', text: `All supervisors updated to max ${n} groups.` });
    } catch {
      setBulkMsg({ type: 'error', text: 'Failed to update. Try again.' });
    } finally {
      setBulkSaving(false);
    }
  };

  const startEdit = (s: Supervisor) => {
    setEditingId(s.id);
    setEditValue(String(s.maxGroups));
    setEditError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
    setEditError('');
  };

  const saveEdit = async (id: number) => {
    const n = parseInt(editValue, 10);
    if (isNaN(n) || n < 1 || n > 10) {
      setEditError('Must be 1–10');
      return;
    }
    setEditSaving(true);
    try {
      await api.patch(`/users/${id}/workload`, { maxGroups: n });
      setSupervisors((prev) => prev.map((s) => (s.id === id ? { ...s, maxGroups: n } : s)));
      setEditingId(null);
    } catch {
      setEditError('Save failed.');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <DashboardLayout navItems={navItems}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Supervisor Workload</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage group assignment capacity for each supervisor
        </p>
      </div>

      {/* Global setting card */}
      <Card className="mb-6 border-gray-200">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 mb-0.5">
                Set Workload for All Supervisors
              </p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-yellow-500 shrink-0" strokeWidth={2} />
                This will override individual settings
              </p>
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  type="button"
                  onClick={handleBulkApply}
                  disabled={bulkSaving}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {bulkSaving ? 'Applying…' : 'Apply to All'}
                </button>
              </div>
            </div>
            {bulkMsg && (
              <p
                className={`text-xs font-medium ${bulkMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}
              >
                {bulkMsg.text}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-10">
                #
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Name
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Email
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Max Capacity
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Assigned
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Remaining
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Utilization
              </th>
              <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            ) : supervisors.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <Briefcase className="h-6 w-6 text-gray-300 mb-3" strokeWidth={1.75} />
                    <p className="text-sm font-medium text-gray-500">No supervisors found</p>
                    <p className="mt-1 text-xs text-gray-400">
                      Add supervisors first to manage workload.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              supervisors.map((s, idx) => {
                const remaining = s.maxGroups - s.assignedGroupsCount;
                const isEditing = editingId === s.id;
                return (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 text-sm text-gray-400 tabular-nums">{idx + 1}</td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">{s.name ?? '—'}</td>
                    <td className="px-4 py-4 text-sm text-gray-500">{s.email}</td>

                    {/* Max Capacity — inline editable */}
                    <td className="px-4 py-4">
                      {isEditing ? (
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={editValue}
                          onChange={(e) => {
                            setEditValue(e.target.value);
                            setEditError('');
                          }}
                          className="w-16 rounded border border-indigo-300 px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          autoFocus
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-900">{s.maxGroups}</span>
                      )}
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-700 tabular-nums">
                      {s.assignedGroupsCount}
                    </td>

                    <td className="px-4 py-4 text-sm tabular-nums">
                      <span
                        className={
                          remaining < 0
                            ? 'font-medium text-red-600'
                            : remaining === 0
                              ? 'text-yellow-600'
                              : 'text-gray-700'
                        }
                      >
                        {remaining < 0 ? 0 : remaining}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <UtilizationBadge
                        assigned={s.assignedGroupsCount}
                        max={s.maxGroups}
                      />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1.5">
                          {editError && (
                            <span className="text-xs text-red-500 mr-1">{editError}</span>
                          )}
                          <button
                            type="button"
                            onClick={() => saveEdit(s.id)}
                            disabled={editSaving}
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors"
                          >
                            <Check className="h-3 w-3" strokeWidth={2} />
                            {editSaving ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="inline-flex items-center rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                          >
                            <X className="h-3 w-3" strokeWidth={2} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(s)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                        >
                          <Pencil className="h-3 w-3" strokeWidth={1.75} />
                          Edit
                        </button>
                      )}
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
