'use client';

import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FolderOpen,
  BarChart,
  Search,
  Upload,
  UserPlus,
  GraduationCap,
  User,
  Trash2,
  Mail,
  Download,
  FileSpreadsheet,
  FileText,
  ChevronDown,
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
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { exportToExcel, exportToPDF } from '@/lib/export';

const navItems = [
  { label: 'Dashboard', href: '/dashboard/manager', icon: LayoutDashboard },
  { label: 'Students', href: '/dashboard/manager/students', icon: Users },
  { label: 'Supervisors', href: '/dashboard/manager/supervisors', icon: Briefcase },
  { label: 'Groups', href: '/dashboard/manager/groups', icon: FolderOpen },
  { label: 'Proposals', href: '/dashboard/manager/proposals', icon: ClipboardCheck },
  { label: 'Reports', href: '/dashboard/manager/reports', icon: BarChart },
  { label: 'Profile', href: '/dashboard/manager/profile', icon: User },
];

interface Student {
  id: number;
  name: string | null;
  rollNumber: string | null;
  email: string;
  role: string;
  createdAt: string;
}

type Flash = { type: 'success' | 'error'; text: string };

function getRollNumber(student: Student): string {
  return student.rollNumber ?? student.email.split('@')[0].toUpperCase();
}

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

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [viewStudent, setViewStudent] = useState<Student | null>(null);

  const showFlash = (f: Flash) => {
    setFlash(f);
    setTimeout(() => setFlash(null), 4000);
  };

  useEffect(() => {
    async function fetchStudents() {
      try {
        const res = await api.get<Student[]>('/users', { params: { role: 'STUDENT' } });
        setStudents(res.data);
      } catch {
        // keep empty list on failure
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, []);

  const handleDelete = async (student: Student) => {
    if (!window.confirm(`Are you sure you want to delete ${student.name ?? student.email}? This action cannot be undone.`)) return;
    setDeletingId(student.id);
    try {
      await api.delete(`/users/${student.id}`);
      setStudents((prev) => prev.filter((s) => s.id !== student.id));
      showFlash({ type: 'success', text: `${student.name ?? student.email} deleted successfully.` });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showFlash({ type: 'error', text: typeof msg === 'string' ? msg : 'Failed to delete student.' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    if (students.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ALL ${students.length} student${students.length !== 1 ? 's' : ''}? This cannot be undone.`)) return;
    setDeleteAllLoading(true);
    try {
      await Promise.allSettled(students.map((s) => api.delete(`/users/${s.id}`)));
      setStudents([]);
      showFlash({ type: 'success', text: 'All students deleted successfully.' });
    } catch {
      showFlash({ type: 'error', text: 'Some deletions failed. Please refresh and try again.' });
    } finally {
      setDeleteAllLoading(false);
    }
  };

  const getExportData = () =>
    students.map((s, idx) => ({
      '#': idx + 1,
      Name: s.name ?? '',
      'Roll Number': getRollNumber(s),
      Email: s.email,
      Role: 'Student',
      'Joined Date': new Date(s.createdAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      }),
    }));

  const handleExportExcel = () => {
    exportToExcel(getExportData(), 'students-export.xlsx', 'Students');
  };

  const handleExportPDF = async () => {
    const headers = ['#', 'Name', 'Roll Number', 'Email', 'Role', 'Joined Date'];
    const rows = students.map((s, idx) => [
      String(idx + 1),
      s.name ?? '',
      getRollNumber(s),
      s.email,
      'Student',
      new Date(s.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    ]);
    await exportToPDF(headers, rows, 'students-export.pdf', 'Students List — Gradify');
  };

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    return (
      (s.name ?? '').toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      getRollNumber(s).toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout navItems={navItems}>
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Students</h1>
          <p className="mt-1 text-sm text-gray-500">
            {loading ? 'Loading…' : `${students.length} student${students.length !== 1 ? 's' : ''} registered`}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!loading && students.length > 0 && (
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
            href="/dashboard/manager/students/import"
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <Upload className="h-4 w-4" strokeWidth={1.75} />
            Import
          </Link>
          <Link
            href="/dashboard/manager/students/add"
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            <UserPlus className="h-4 w-4" strokeWidth={1.75} />
            Add Student
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
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={1.75} />
        <input
          type="text"
          placeholder="Search by name, roll number or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
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
                      <GraduationCap className="h-5 w-5 text-gray-300" strokeWidth={1.75} />
                    </div>
                    <p className="text-sm font-medium text-gray-500">
                      {search ? 'No students match your search' : 'No students registered yet'}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {search ? 'Try a different name or email.' : 'Add a student or import from a file.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((student, idx) => (
                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-400 tabular-nums">{idx + 1}</td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 shrink-0">
                        <span className="text-xs font-semibold text-indigo-600">
                          {(student.name ?? student.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {student.name ?? <span className="text-gray-400 italic">No name</span>}
                        </p>
                        <p className="text-xs text-gray-400">{getRollNumber(student)}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-500">{student.email}</td>

                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                      Student
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setViewStudent(student)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(student)}
                        disabled={deletingId === student.id || deleteAllLoading}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {deletingId === student.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* View Student Dialog */}
      <Dialog open={!!viewStudent} onOpenChange={(open) => { if (!open) setViewStudent(null); }}>
        <DialogContent className="sm:max-w-sm" showCloseButton>
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
          </DialogHeader>

          {viewStudent && (
            <div className="pt-2 space-y-5">
              <div className="flex flex-col items-center gap-3 pt-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 shrink-0">
                  <span className="text-2xl font-bold text-indigo-600">
                    {(viewStudent.name ?? viewStudent.email).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold text-gray-900">
                    {viewStudent.name ?? <span className="italic text-gray-400">No name</span>}
                  </p>
                  <p className="text-sm text-gray-500 font-mono">{getRollNumber(viewStudent)}</p>
                </div>
              </div>

              <div className="space-y-3 rounded-xl bg-gray-50 px-4 py-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-400 shrink-0" strokeWidth={1.75} />
                  <span className="text-sm text-gray-700 break-all">{viewStudent.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <GraduationCap className="h-4 w-4 text-gray-400 shrink-0" strokeWidth={1.75} />
                  <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    Student
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-gray-400 shrink-0" strokeWidth={1.75} />
                  <span className="text-sm text-gray-500">
                    Joined{' '}
                    {new Date(viewStudent.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewStudent(null)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
