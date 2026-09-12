'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Plus, Pencil, Trash2, Search } from 'lucide-react';
import api from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const ACCENT = '#7C6FF7';

interface Department {
  id: number;
  name: string;
  university: { id: number; name: string };
}

interface Program {
  id: number;
  name: string;
  code: string;
  departmentId: number;
  department: { id: number; name: string; university: { id: number; name: string } };
  _count: { sessions: number };
}

interface FormState {
  name: string;
  code: string;
  departmentId: string;
}

const EMPTY_FORM: FormState = { name: '', code: '', departmentId: '' };

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Program | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<Program | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.allSettled([
      api.get<Program[]>('/admin/programs'),
      api.get<Department[]>('/admin/departments'),
    ]).then(([progRes, deptRes]) => {
      if (progRes.status === 'fulfilled') setPrograms(progRes.value.data);
      if (deptRes.status === 'fulfilled') setDepartments(deptRes.value.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setDialogOpen(true);
  };

  const openEdit = (p: Program) => {
    setEditing(p);
    setForm({ name: p.name, code: p.code, departmentId: p.departmentId.toString() });
    setFormError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      setFormError('Name and Code are required.');
      return;
    }
    if (!editing && !form.departmentId) {
      setFormError('Department is required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        const r = await api.put<Program>(`/admin/programs/${editing.id}`, {
          name: form.name.trim(),
          code: form.code.trim(),
        });
        setPrograms((prev) => prev.map((p) => (p.id === editing.id ? { ...p, ...r.data } : p)));
      } else {
        const r = await api.post<Program>('/admin/programs', {
          name: form.name.trim(),
          code: form.code.trim(),
          departmentId: parseInt(form.departmentId, 10),
        });
        setPrograms((prev) => [r.data, ...prev]);
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(typeof msg === 'string' ? msg : 'Failed to save program.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/programs/${deleteTarget.id}`);
      setPrograms((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      // keep dialog open on failure
    } finally {
      setDeleting(false);
    }
  };

  const filtered = programs.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
    const matchDept = !deptFilter || p.departmentId.toString() === deptFilter;
    return matchSearch && matchDept;
  });

  const Skeleton = ({ className }: { className: string }) => (
    <div className={`animate-pulse rounded bg-gray-200 ${className}`} />
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Programs</h1>
          <p className="mt-1 text-sm text-gray-500">View and manage academic programs across all universities.</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors shrink-0"
          style={{ backgroundColor: ACCENT }}
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Add Program
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
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id.toString()}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50">
              {['#', 'Name', 'Code', 'Department', 'University', 'Sessions', 'Actions'].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-5 py-4"><Skeleton className="h-4 w-full max-w-[120px]" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <BookOpen className="mx-auto h-8 w-8 text-gray-200 mb-2" strokeWidth={1.5} />
                  <p className="text-sm text-gray-400">
                    {search || deptFilter ? 'No programs match your filters' : 'No programs yet'}
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((p, idx) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 text-sm text-gray-400 tabular-nums">{idx + 1}</td>
                  <td className="px-5 py-4 text-sm font-medium text-gray-900">{p.name}</td>
                  <td className="px-5 py-4 text-sm font-mono text-gray-600">{p.code}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">{p.department?.name ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">{p.department?.university?.name ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                      {p._count?.sessions ?? 0} session{(p._count?.sessions ?? 0) !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(p)}
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
            <DialogTitle>{editing ? 'Edit Program' : 'Add Program'}</DialogTitle>
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
                placeholder="e.g. BS Software Engineering"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Code <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm focus:border-indigo-400 focus:bg-white focus:outline-none"
                placeholder="e.g. BSSE"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Department {!editing && <span className="text-red-500">*</span>}
              </label>
              {editing ? (
                <p className="rounded-lg bg-gray-50 px-3.5 py-2 text-sm text-gray-500">
                  {editing.department?.name ?? '—'}{' '}
                  <span className="text-xs text-gray-400">(cannot be changed)</span>
                </p>
              ) : (
                <select
                  value={form.departmentId}
                  onChange={(e) => setForm((p) => ({ ...p, departmentId: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                >
                  <option value="">Select department…</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id.toString()}>{d.name} — {d.university?.name}</option>
                  ))}
                </select>
              )}
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
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Program'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete Program</DialogTitle>
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
