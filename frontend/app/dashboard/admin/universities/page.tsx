'use client';

import { useEffect, useState } from 'react';
import { Building2, Plus, Pencil, Trash2, Search } from 'lucide-react';
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
  code: string;
  city: string | null;
  isActive: boolean;
  departments: { programs: unknown[] }[];
  users: { id: number; name: string | null; email: string }[];
}

interface FormState {
  name: string;
  code: string;
  city: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = { name: '', code: '', city: '', isActive: true };

export default function UniversitiesPage() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<University | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<University | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    api.get<University[]>('/admin/universities')
      .then((r) => setUniversities(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setDialogOpen(true);
  };

  const openEdit = (u: University) => {
    setEditing(u);
    setForm({ name: u.name, code: u.code, city: u.city ?? '', isActive: u.isActive });
    setFormError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      setFormError('Name and Code are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = { name: form.name.trim(), code: form.code.trim().toUpperCase(), city: form.city.trim() || undefined, isActive: form.isActive };
      if (editing) {
        const r = await api.put<University>(`/admin/universities/${editing.id}`, payload);
        setUniversities((prev) => prev.map((u) => u.id === editing.id ? { ...u, ...r.data } : u));
      } else {
        const r = await api.post<University>('/admin/universities', payload);
        setUniversities((prev) => [r.data, ...prev]);
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(typeof msg === 'string' ? msg : 'Failed to save university.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/universities/${deleteTarget.id}`);
      setUniversities((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      // keep dialog open on failure
    } finally {
      setDeleting(false);
    }
  };

  const filtered = universities.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.code.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? u.isActive : !u.isActive);
    return matchSearch && matchStatus;
  });

  const Skeleton = ({ className }: { className: string }) => (
    <div className={`animate-pulse rounded bg-gray-200 ${className}`} />
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Universities</h1>
          <p className="mt-1 text-sm text-gray-500">Manage all universities in the system.</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors shrink-0"
          style={{ backgroundColor: ACCENT }}
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Add University
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Search by name or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50">
              {['#', 'University', 'Departments', 'Programs', 'Manager', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-5 py-4"><Skeleton className="h-4 w-full max-w-[100px]" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <Building2 className="mx-auto h-8 w-8 text-gray-200 mb-2" strokeWidth={1.5} />
                  <p className="text-sm text-gray-400">No universities found</p>
                </td>
              </tr>
            ) : (
              filtered.map((u, idx) => {
                const deptCount = u.departments?.length ?? 0;
                const progCount = u.departments?.reduce((s, d) => s + (d.programs?.length ?? 0), 0) ?? 0;
                const manager = u.users?.[0];
                return (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 text-sm text-gray-400">{idx + 1}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                          style={{ backgroundColor: ACCENT }}
                        >
                          {u.code.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.code}{u.city ? ` · ${u.city}` : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{deptCount}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{progCount}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{manager ? (manager.name ?? manager.email) : <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${u.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(u)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(u)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Delete"
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

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit University' : 'Add University'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && (
              <p className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">{formError}</p>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm focus:border-indigo-400 focus:bg-white focus:outline-none"
                placeholder="e.g. The Superior University"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Code <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm focus:border-indigo-400 focus:bg-white focus:outline-none uppercase"
                placeholder="e.g. TSU"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm focus:border-indigo-400 focus:bg-white focus:outline-none"
                placeholder="e.g. Lahore"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
              <select
                value={form.isActive ? 'active' : 'inactive'}
                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.value === 'active' }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm focus:border-indigo-400 focus:outline-none"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
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
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add University'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete University</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            Are you sure you want to delete <span className="font-medium text-gray-900">{deleteTarget?.name}</span>? This cannot be undone.
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
