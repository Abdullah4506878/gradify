'use client';

import { GraduationCap } from 'lucide-react';

const ACCENT = '#7C6FF7';

export default function DepartmentsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Departments</h1>
        <p className="mt-1 text-sm text-gray-500">Manage university departments across the system.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
          <GraduationCap className="h-4 w-4 text-gray-400" strokeWidth={1.75} />
          <h2 className="text-sm font-semibold text-gray-900">All Departments</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-20">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl mb-4"
            style={{ backgroundColor: `${ACCENT}18` }}
          >
            <GraduationCap className="h-7 w-7" style={{ color: ACCENT }} strokeWidth={1.5} />
          </div>
          <p className="text-sm font-semibold text-gray-700">Departments management coming soon</p>
          <p className="mt-1.5 text-xs text-gray-400 max-w-xs text-center">
            Department CRUD will be available in the next update. Departments are currently managed by university managers.
          </p>
        </div>
      </div>
    </div>
  );
}
