'use client';

import { useEffect, useState } from 'react';
import {
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
  Code2,
  Link as LinkIcon,
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


interface Student {
  id: number;
  name: string | null;
  rollNumber: string | null;
  section?: string | null;
  email: string;
  role: string;
  createdAt: string;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
}

interface WeeklyCommit {
  id: number;
  userId: number;
  weekStart: string;
  commitCount: number;
  lastCommit: string | null;
  repos: string | null;
}

type Flash = { type: 'success' | 'error'; text: string };

function commitBadge(count: number): { label: string; className: string } {
  if (count === 0) return { label: `${count} commits`, className: 'bg-red-50 text-red-700' };
  if (count >= 5) return { label: `${count} commits`, className: 'bg-green-50 text-green-700' };
  return { label: `${count} commits`, className: 'bg-yellow-50 text-yellow-700' };
}

function getRollNumber(student: Student): string {
  return student.rollNumber ?? student.email.split('@')[0].toUpperCase();
}

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="px-6 py-4">
          <div
            className="h-4 animate-pulse rounded bg-gray-200"
            style={{ width: i === 1 ? '2rem' : i === 6 ? '7rem' : '60%' }}
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
  const [sectionFilter, setSectionFilter] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [weeklyCommits, setWeeklyCommits] = useState<WeeklyCommit[]>([]);
  const [commitsLoading, setCommitsLoading] = useState(false);

  const showFlash = (f: Flash) => {
    setFlash(f);
    setTimeout(() => setFlash(null), 4000);
  };

  // Read import result from URL params (set by students/import page on redirect)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const added = params.get('added');
    const updated = params.get('updated');
    const skipped = params.get('skipped');
    if (added !== null || updated !== null) {
      showFlash({
        type: 'success',
        text: `Import complete — ${added ?? 0} added, ${updated ?? 0} updated, ${skipped ?? 0} skipped.`,
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

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

  const openStudentDialog = async (student: Student) => {
    setViewStudent(student);
    setWeeklyCommits([]);
    if (!student.githubUrl) return;
    setCommitsLoading(true);
    try {
      const res = await api.get<WeeklyCommit[]>(`/github/student/${student.id}/commits`);
      setWeeklyCommits(res.data);
    } catch {
      setWeeklyCommits([]);
    } finally {
      setCommitsLoading(false);
    }
  };

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

  const uniqueSections = Array.from(
    new Set(students.flatMap((s) => (s.section ? [s.section] : [])))
  ).sort();

  const getExportData = () =>
    students.map((s, idx) => ({
      '#': idx + 1,
      Name: s.name ?? '',
      'Roll Number': getRollNumber(s),
      Email: s.email,
      Section: s.section ?? '',
      Role: 'Student',
      'Joined Date': new Date(s.createdAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      }),
    }));

  const handleExportExcel = () => {
    exportToExcel(getExportData(), 'students-export.xlsx', 'Students');
  };

  const handleExportPDF = async () => {
    const headers = ['#', 'Name', 'Roll Number', 'Email', 'Section', 'Role', 'Joined Date'];
    const rows = students.map((s, idx) => [
      String(idx + 1),
      s.name ?? '',
      getRollNumber(s),
      s.email,
      s.section ?? '',
      'Student',
      new Date(s.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    ]);
    await exportToPDF(headers, rows, 'students-export.pdf', 'Students List — Gradify');
  };

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch =
      (s.name ?? '').toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      getRollNumber(s).toLowerCase().includes(q);
    const matchesSection = !sectionFilter || s.section === sectionFilter;
    return matchesSearch && matchesSection;
  });

  return (
    <>
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

      {/* Search + Section filter */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Search by name, roll number or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
          />
        </div>

        {uniqueSections.length > 0 && (
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
          >
            <option value="">All Sections</option>
            {uniqueSections.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
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
                Section
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
                <td colSpan={6}>
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 mb-3">
                      <GraduationCap className="h-5 w-5 text-gray-300" strokeWidth={1.75} />
                    </div>
                    <p className="text-sm font-medium text-gray-500">
                      {search || sectionFilter ? 'No students match your filters' : 'No students registered yet'}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {search || sectionFilter ? 'Try a different name, email, or section.' : 'Add a student or import from a file.'}
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

                  <td className="px-6 py-4 text-sm text-gray-500">
                    {student.section ?? <span className="text-gray-300">—</span>}
                  </td>

                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                      Student
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openStudentDialog(student)}
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
                  {viewStudent.section && (
                    <p className="text-xs text-gray-400 mt-0.5">Section {viewStudent.section}</p>
                  )}
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
                <div className="flex items-center gap-3">
                  <Code2 className="h-4 w-4 text-gray-400 shrink-0" strokeWidth={1.75} />
                  {viewStudent.githubUrl ? (
                    <a
                      href={viewStudent.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-600 hover:underline truncate"
                    >
                      {viewStudent.githubUrl.replace('https://github.com/', '')}
                    </a>
                  ) : (
                    <span className="text-sm text-gray-400 italic">Not added</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <LinkIcon className="h-4 w-4 text-blue-400 shrink-0" strokeWidth={1.75} />
                  {viewStudent.linkedinUrl ? (
                    <a
                      href={viewStudent.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-600 hover:underline truncate"
                    >
                      {viewStudent.linkedinUrl.replace('https://linkedin.com/in/', '')}
                    </a>
                  ) : (
                    <span className="text-sm text-gray-400 italic">Not added</span>
                  )}
                </div>
              </div>

              {viewStudent.githubUrl && (
                <div className="rounded-xl bg-gray-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                    Weekly Commits
                  </p>
                  {commitsLoading ? (
                    <p className="text-sm text-gray-400 italic">Loading…</p>
                  ) : weeklyCommits.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No commit data yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {weeklyCommits.map((wc) => {
                        const badge = commitBadge(wc.commitCount);
                        return (
                          <li key={wc.id} className="flex items-center justify-between gap-2">
                            <span className="text-xs text-gray-500">
                              Week of{' '}
                              {new Date(wc.weekStart).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric',
                              })}
                            </span>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                              {badge.label}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}

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
    </>
  );
}
