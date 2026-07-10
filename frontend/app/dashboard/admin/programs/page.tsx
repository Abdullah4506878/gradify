'use client';

import { BookOpen } from 'lucide-react';

const ACCENT = '#7C6FF7';

export default function ProgramsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Programs</h1>
        <p className="mt-1 text-sm text-gray-500">View and manage academic programs across all universities.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
          <BookOpen className="h-4 w-4 text-gray-400" strokeWidth={1.75} />
          <h2 className="text-sm font-semibold text-gray-900">All Programs</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-20">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl mb-4"
            style={{ backgroundColor: `${ACCENT}18` }}
          >
            <BookOpen className="h-7 w-7" style={{ color: ACCENT }} strokeWidth={1.5} />
          </div>
          <p className="text-sm font-semibold text-gray-700">Programs management coming soon</p>
          <p className="mt-1.5 text-xs text-gray-400 max-w-xs text-center">
            Program CRUD will be available in the next update. Programs are currently managed within each department by university managers.
          </p>
        </div>
      </div>
    </div>
  );
}
