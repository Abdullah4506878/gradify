'use client';

import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FolderOpen,
  BarChart,
  Search,
  UserPlus,
  User,
  Upload,
  Trash2,
  Mail,
  Download,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  BarChart2,
  BookOpen,
} from 'lucide-react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import api from '@/lib/api';
import { exportToExcel, exportToPDF } from '@/lib/export';


interface Supervisor {
  id: number;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
}

type Flash = { type: 'success' | 'error'; text: string };

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-6 py-4">
          <div
            className="h-4 animate-pulse rounded bg-gray-200"
            style={{ width: i === 1 ? '2rem' : i === 5 ? '7rem' : '60%' }}
          />
        </td>
      ))}
    </tr>
  );
}

export default function SupervisorsPage() {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [viewSupervisor, setViewSupervisor] = useState<Supervisor | null>(null);

  const showFlash = (f: Flash) => {
    setFlash(f);
    setTimeout(() => setFlash(null), 4000);
  };

  useEffect(() => {
    async function fetchSupervisors() {
      try {
        const res = await api.get<Supervisor[]>('/users', { params: { role: 'SUPERVISOR' } });
        setSupervisors(res.data);
      } catch {
        // keep empty list on failure
      } finally {
        setLoading(false);
      }
    }
    fetchSupervisors();
  }, []);

  const handleDelete = async (supervisor: Supervisor) => {
    if (!window.confirm(`Are you sure you want to delete ${supervisor.name ?? supervisor.email}? This action cannot be undone.`)) return;
    setDeletingId(supervisor.id);
    try {
      await api.delete(`/users/${supervisor.id}`);
      setSupervisors((prev) => prev.filter((s) => s.id !== supervisor.id));
      showFlash({ type: 'success', text: `${supervisor.name ?? supervisor.email} deleted successfully.` });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showFlash({ type: 'error', text: typeof msg === 'string' ? msg : 'Failed to delete supervisor.' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    if (supervisors.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ALL ${supervisors.length} supervisor${supervisors.length !== 1 ? 's' : ''}? This cannot be undone.`)) return;
    setDeleteAllLoading(true);
    try {
      await Promise.allSettled(supervisors.map((s) => api.delete(`/users/${s.id}`)));
      setSupervisors([]);
      showFlash({ type: 'success', text: 'All supervisors deleted successfully.' });
    } catch {
      showFlash({ type: 'error', text: 'Some deletions failed. Please refresh and try again.' });
    } finally {
      setDeleteAllLoading(false);
    }
  };

  const getExportData = () =>
    supervisors.map((s, idx) => ({
      '#': idx + 1,
      Name: s.name ?? '',
      Email: s.email,
      Role: 'Supervisor',
      'Joined Date': new Date(s.createdAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      }),
    }));

  const handleExportExcel = () => {
    exportToExcel(getExportData(), 'supervisors-export.xlsx', 'Supervisors');
  };

  const handleExportPDF = async () => {
    const headers = ['#', 'Name', 'Email', 'Role', 'Joined Date'];
    const rows = supervisors.map((s, idx) => [
      String(idx + 1),
      s.name ?? '',
      s.email,
      'Supervisor',
      new Date(s.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    ]);
    await exportToPDF(headers, rows, 'supervisors-export.pdf', 'Supervisors List — Gradify');
  };

  const filtered = supervisors.filter((s) => {
    const q = search.toLowerCase();
    return (s.name ?? '').toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
  });

  return (
    <>
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Supervisors</h1>
          <p className="mt-1 text-sm text-gray-500">
            {loading
              ? 'Loading…'
              : `${supervisors.length} supervisor${supervisors.length !== 1 ? 's' : ''} registered`}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!loading && supervisors.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleDeleteAll}
                disabled={deleteAllLoading}
                className="flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                {deleteAllLoading ? 'Deleting…' : 'Delete All'}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    <Download className="h-4 w-4" strokeWidth={1.75} />
                    Export
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400" strokeWidth={1.75} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-green-600" strokeWidth={1.75} />
                    Export Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer gap-2">
                    <FileText className="h-4 w-4 text-red-500" strokeWidth={1.75} />
                    Export PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          <Link
            href="/dashboard/manager/supervisors/import"
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <Upload className="h-4 w-4" strokeWidth={1.75} />
            Import
          </Link>
          <Link
            href="/dashboard/manager/supervisors/add"
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            <UserPlus className="h-4 w-4" strokeWidth={1.75} />
            Add Supervisor
          </Link>
        </div>
      </div>

      {/* Flash message */}
      {flash && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            flash.type === 'success'
              ? 'border-green-100 bg-green-50 text-green-700'
              : 'border-red-100 bg-red-50 text-red-700'
          }`}
        >
          {flash.text}
        </div>
      )}

      {/* Search */}
      <div className="mb-4 relative max-w-sm">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          strokeWidth={1.75}
        />
        <input
          type="text"
          placeholder="Search by name or email…"
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
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-12">
                #
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Name
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Email
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Role
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
                      <Briefcase className="h-5 w-5 text-gray-300" strokeWidth={1.75} />
                    </div>
                    <p className="text-sm font-medium text-gray-500">
                      {search ? 'No supervisors match your search' : 'No supervisors registered yet'}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {search ? 'Try a different name or email.' : 'Add a supervisor to get started.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((supervisor, idx) => (
                <tr key={supervisor.id} className="hover:bg-gray-50 transition-colors">
                  {/* Serial # */}
                  <td className="px-6 py-4 text-sm text-gray-400 tabular-nums">
                    {idx + 1}
                  </td>

                  {/* Name */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-50 shrink-0">
                        <span className="text-xs font-semibold text-purple-600">
                          {(supervisor.name ?? supervisor.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {supervisor.name ?? <span className="text-gray-400 italic">No name</span>}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-500">{supervisor.email}</td>

                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                      Supervisor
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setViewSupervisor(supervisor)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(supervisor)}
                        disabled={deletingId === supervisor.id || deleteAllLoading}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {deletingId === supervisor.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* View Supervisor Dialog */}
      <Dialog open={!!viewSupervisor} onOpenChange={(open) => { if (!open) setViewSupervisor(null); }}>
        <DialogContent className="sm:max-w-sm" showCloseButton>
          <DialogHeader>
            <DialogTitle>Supervisor Details</DialogTitle>
          </DialogHeader>

          {viewSupervisor && (
            <div className="pt-2 space-y-5">
              <div className="flex flex-col items-center gap-3 pt-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 shrink-0">
                  <span className="text-2xl font-bold text-purple-600">
                    {(viewSupervisor.name ?? viewSupervisor.email).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold text-gray-900">
                    {viewSupervisor.name ?? <span className="italic text-gray-400">No name</span>}
                  </p>
                </div>
              </div>

              <div className="space-y-3 rounded-xl bg-gray-50 px-4 py-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-400 shrink-0" strokeWidth={1.75} />
                  <span className="text-sm text-gray-700 break-all">{viewSupervisor.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 text-gray-400 shrink-0" strokeWidth={1.75} />
                  <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                    Supervisor
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-gray-400 shrink-0" strokeWidth={1.75} />
                  <span className="text-sm text-gray-500">
                    Joined{' '}
                    {new Date(viewSupervisor.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewSupervisor(null)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
