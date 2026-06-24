'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FolderOpen,
  BarChart,
  User,
  ArrowLeft,
  Upload,
  FileText,
  X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/api';

const navItems = [
  { label: 'Dashboard', href: '/dashboard/manager', icon: LayoutDashboard },
  { label: 'Students', href: '/dashboard/manager/students', icon: Users },
  { label: 'Supervisors', href: '/dashboard/manager/supervisors', icon: Briefcase },
  { label: 'Groups', href: '/dashboard/manager/groups', icon: FolderOpen },
  { label: 'Proposals', href: '/dashboard/manager/proposals', icon: ClipboardCheck },
  { label: 'Reports', href: '/dashboard/manager/reports', icon: BarChart },
  { label: 'Profile', href: '/dashboard/manager/profile', icon: User },
];

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export default function ImportStudentsPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.csv')) {
      setError('Only .csv files are accepted.');
      return;
    }
    setError(null);
    setResult(null);
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a CSV file first.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<ImportResult>('/users/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      setFile(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Import failed. Please check the file and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout navItems={navItems}>
      {/* Back link + header */}
      <div className="mb-6">
        <Link
          href="/dashboard/manager/students"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Back to Students
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Import Students</h1>
        <p className="mt-1 text-sm text-gray-500">Bulk-add students from a CSV file</p>
      </div>

      <div className="max-w-lg space-y-5">
        {/* Format hint */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-5 py-4">
          <p className="text-sm font-medium text-indigo-800 mb-1">Required CSV format</p>
          <p className="text-xs text-indigo-600 mb-2">The file must include the following columns (header row required):</p>
          <code className="block rounded-lg bg-indigo-100 px-3 py-2 text-xs font-mono text-indigo-900">
            name, email, role, rollNumber
          </code>
          <p className="mt-2 text-xs text-indigo-600">
            Accepts <span className="font-semibold">.csv</span> and <span className="font-semibold">.xlsx</span>. Valid roles: <span className="font-semibold">STUDENT</span>, <span className="font-semibold">SUPERVISOR</span>, <span className="font-semibold">MANAGER</span>
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 cursor-pointer transition-colors ${
            dragging
              ? 'border-indigo-400 bg-indigo-50'
              : file
              ? 'border-green-300 bg-green-50'
              : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-gray-50'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          {file ? (
            <>
              <FileText className="h-8 w-8 text-green-500 mb-3" strokeWidth={1.5} />
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="absolute top-3 right-3 rounded-full p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-gray-300 mb-3" strokeWidth={1.5} />
              <p className="text-sm font-medium text-gray-600">
                Drop your CSV here, or <span className="text-indigo-600">browse</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">Only .csv files accepted</p>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 space-y-2">
            <p className="text-sm font-semibold text-green-800">Import complete</p>
            <div className="flex gap-6 text-sm">
              <span className="text-green-700">
                <span className="font-bold text-green-900">{result.imported}</span> imported
              </span>
              <span className="text-yellow-700">
                <span className="font-bold text-yellow-900">{result.skipped}</span> skipped
              </span>
              <span className="text-red-700">
                <span className="font-bold text-red-900">{result.errors.length}</span> errors
              </span>
            </div>
            {result.errors.length > 0 && (
              <ul className="mt-2 space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i} className="text-xs text-red-600 font-mono bg-red-100 rounded px-2 py-1">
                    {e}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Upload button */}
        <div className="flex items-center justify-end gap-2">
          <Link
            href="/dashboard/manager/students"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleUpload}
            disabled={loading || !file}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            <Upload className="h-4 w-4" strokeWidth={1.75} />
            {loading ? 'Importing…' : 'Upload & Import'}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
