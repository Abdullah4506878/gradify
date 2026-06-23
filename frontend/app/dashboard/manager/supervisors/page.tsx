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
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/api';

const navItems = [
  { label: 'Dashboard', href: '/dashboard/manager', icon: LayoutDashboard },
  { label: 'Students', href: '/dashboard/manager/students', icon: Users },
  { label: 'Supervisors', href: '/dashboard/manager/supervisors', icon: Briefcase },
  { label: 'Groups', href: '/dashboard/manager/groups', icon: FolderOpen },
  { label: 'Reports', href: '/dashboard/manager/reports', icon: BarChart },
];

interface Supervisor {
  id: number;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
}

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      {[1, 2, 3, 4].map((i) => (
        <td key={i} className="px-6 py-4">
          <div
            className="h-4 animate-pulse rounded bg-gray-200"
            style={{ width: i === 4 ? '4rem' : '60%' }}
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

  const filtered = supervisors.filter((s) => {
    const q = search.toLowerCase();
    return (
      (s.name ?? '').toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout navItems={navItems}>
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

        <div className="shrink-0">
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            <UserPlus className="h-4 w-4" strokeWidth={1.75} />
            Add Supervisor
          </button>
        </div>
      </div>

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
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50">
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
                <td colSpan={4}>
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 mb-3">
                      <Briefcase className="h-5 w-5 text-gray-300" strokeWidth={1.75} />
                    </div>
                    <p className="text-sm font-medium text-gray-500">
                      {search ? 'No supervisors match your search' : 'No supervisors registered yet'}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {search
                        ? 'Try a different name or email.'
                        : 'Add a supervisor to get started.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((supervisor) => (
                <tr key={supervisor.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-50 shrink-0">
                        <span className="text-xs font-semibold text-purple-600">
                          {(supervisor.name ?? supervisor.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {supervisor.name ?? (
                          <span className="text-gray-400 italic">No name</span>
                        )}
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
                    <button
                      type="button"
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
