'use client';

import { useEffect, useState } from 'react';
import { Users, Plus, Pencil, Trash2, Search, ShieldOff, ShieldCheck } from 'lucide-react';
import api from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const ACCENT = '#7C6FF7';

interface University {
  id: number;
  name: string;
}

interface Manager {
  id: number;
  name: string | null;
  email: string;
  isActive: boolean;
  createdAt: string;
  university: { id: number; name: string } | null;
}

interface FormState {
  name: string;
  email: string;
  password: string;
  universityId: string;
}

const EMPTY_FORM: FormState = { name: '', email: '', password: '', universityId: '' };

export default function ManagersPage() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [uniFilter, setUniFilter] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Manager | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<Manager | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    Promise.allSettled([
      api.get<Manager[]>('/admin/managers'),
      api.get<University[]>('/admin/universities'),
    ]).then(([mgrRes, uniRes]) => {
      if (mgrRes.status === 'fulfilled') setManagers(mgrRes.value.data);
      if (uniRes.status === 'fulfilled') setUniversities(uniRes.value.data.map((u: { id: number; name: string }) => ({ id: u.id, name: u.name })));
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setDialogOpen(true);
  };

  const openEdit = (m: Manager) => {
    setEditing(m);
    setForm({ name: m.name ?? '', email: m.email, password: '', universityId: m.university?.id?.toString() ?? '' });
    setFormError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setFormError('Name and Email are required.');
      return;
    }
    if (!editing && !form.password.trim()) {
      setFormError('Password is required for new managers.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        email: form.email.trim(),
        ...(form.password.trim() ? { password: form.password } : {}),
        ...(form.universityId ? { universityId: parseInt(form.universityId) } : {}),
      };
      if (editing) {
        const r = await api.put<Manager>(`/admin/managers/${editing.id}`, payload);
        setManagers((prev) => prev.map((m) => m.id === editing.id ? { ...m, ...r.data } : m));
      } else {
        const r = await api.post<Manager>('/admin/managers', payload);
        setManagers((prev) => [r.data, ...prev]);
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(typeof msg === 'string' ? msg : 'Failed to save manager.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (m: Manager) => {
    setTogglingId(m.id);
    try {
      const r = await api.put<Manager>(`/admin/managers/${m.id}/status`, { isActive: !m.isActive });
      setManagers((prev) => prev.map((x) => x.id === m.id ? { ...x, isActive: r.data.isActive } : x));
    } catch {
      // silent
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/managers/${deleteTarget.id}`);
      setManagers((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      // keep dialog
    } finally {
      setDeleting(false);
    }
  };

  const filtered = managers.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch = !q || (m.name ?? '').toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
    const matchUni = !uniFilter || m.university?.id?.toString() === uniFilter;
    return matchSearch && matchUni;
  });

  const Skeleton = ({ className }: { className: string }) => (
    <div className={`animate-pulse rounded bg-gray-200 ${className}`} />
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Managers</h1>
          <p className="mt-1 text-sm text-gray-500">Manage university managers and their access.</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors shrink-0"
          style={{ backgroundColor: ACCENT }}
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Add Manager
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
        <select
          value={uniFilter}
          onChange={(e) => setUniFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none"
        >
          <option value="">All Universities</option>
          {universities.map((u) => (
            <option key={u.id} value={u.id.toString()}>{u.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50">
              {['Manager', 'Email', 'University', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-5 py-4"><Skeleton className="h-4 w-full max-w-[120px]" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center">
                  <Users className="mx-auto h-8 w-8 text-gray-200 mb-2" strokeWidth={1.5} />
                  <p className="text-sm text-gray-400">No managers found</p>
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                  {/* Avatar + name */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: '#3b82f6' }}
                      >
                        {(m.name ?? m.email)[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{m.name ?? <span className="text-gray-400 italic">—</span>}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{m.email}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {m.university?.name ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${m.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      {m.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(m)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(m)}
                        disabled={togglingId === m.id}
                        className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-50 ${m.isActive ? 'text-gray-400 hover:bg-amber-50 hover:text-amber-600' : 'text-gray-400 hover:bg-green-50 hover:text-green-600'}`}
                        title={m.isActive ? 'Suspend' : 'Activate'}
                      >
                        {m.isActive
                          ? <ShieldOff className="h-3.5 w-3.5" strokeWidth={1.75} />
                          : <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(m)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Manager' : 'Add Manager'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && (
              <p className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">{formError}</p>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm focus:border-indigo-400 focus:bg-white focus:outline-none"
                placeholder="e.g. Dr. Ahmed Khan"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email <span className="text-red-500">*</span></label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                disabled={!!editing}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm focus:border-indigo-400 focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="manager@university.edu"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password {!editing && <span className="text-red-500">*</span>}
                {editing && <span className="text-gray-400 font-normal">(leave blank to keep current)</span>}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm focus:border-indigo-400 focus:bg-white focus:outline-none"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Assign University</label>
              <select
                value={form.universityId}
                onChange={(e) => setForm((p) => ({ ...p, universityId: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm focus:border-indigo-400 focus:outline-none"
              >
                <option value="">No University</option>
                {universities.map((u) => (
                  <option key={u.id} value={u.id.toString()}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDialogOpen(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60"
              style={{ backgroundColor: ACCENT }}
            >
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Manager'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete Manager</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            Are you sure you want to delete <span className="font-medium text-gray-900">{deleteTarget?.name ?? deleteTarget?.email}</span>? This cannot be undone.
          </p>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-60"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
