'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, FileText, X } from 'lucide-react';
import api from '@/lib/api';


interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export default function ImportSupervisorsPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.xlsx')) {
      setError('Only .xlsx files are accepted.');
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
      setError('Please select an Excel file first.');
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
    <>
      {/* Back link + header */}
      <div className="mb-6">
        <Link
          href="/dashboard/manager/supervisors"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Back to Supervisors
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Import Supervisors</h1>
        <p className="mt-1 text-sm text-gray-500">Bulk-add from an Excel file</p>
      </div>

      <div className="max-w-lg space-y-5">
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
            accept=".xlsx"
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
            <div className="flex flex-col items-center">
              <Upload className="h-8 w-8 text-gray-300 mb-3" strokeWidth={1.5} />
              <p className="text-sm font-medium text-gray-600">
                Drop your Excel file here, or <span className="text-indigo-600">browse</span>
              </p>
            </div>
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

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <Link
            href="/dashboard/manager/supervisors"
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
    </>
  );
}
