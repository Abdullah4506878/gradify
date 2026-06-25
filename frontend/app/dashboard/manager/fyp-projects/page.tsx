'use client';

import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FolderOpen,
  BarChart,
  BarChart2,
  FileText,
  User,
  ClipboardCheck,
  ClipboardList,
  BookOpen,
  Search,
  Download,
  Printer,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/api';

const navItems = [
  { label: 'Dashboard', href: '/dashboard/manager', icon: LayoutDashboard },
  { label: 'Students', href: '/dashboard/manager/students', icon: Users },
  { label: 'Supervisors', href: '/dashboard/manager/supervisors', icon: Briefcase },
  { label: 'Workload', href: '/dashboard/manager/supervisors/workload', icon: BarChart2 },
  { label: 'Groups', href: '/dashboard/manager/groups', icon: FolderOpen },
  { label: 'FYP Projects', href: '/dashboard/manager/fyp-projects', icon: BookOpen },
  { label: 'Minutes of Meeting', href: '/dashboard/manager/mom', icon: FileText },
  { label: 'Tasks', href: '/dashboard/manager/tasks', icon: ClipboardList },
  { label: 'Proposals', href: '/dashboard/manager/proposals', icon: ClipboardCheck },
  { label: 'Reports', href: '/dashboard/manager/reports', icon: BarChart },
  { label: 'Profile', href: '/dashboard/manager/profile', icon: User },
];

interface Supervisor {
  id: number;
  name: string | null;
  email: string;
}

interface Preference {
  preference: number;
  supervisor: Supervisor;
}

interface Proposal {
  id: number;
  projectTitle: string;
  problemStatement: string;
  proposedSolution: string;
}

interface FypProject {
  id: number;
  fypId: string;
  proposal: Proposal;
  preferences: Preference[];
  phase?: {
    session?: {
      program?: { name: string };
      semester?: string;
      year?: number;
    };
  };
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">{label}</p>
      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
        {value || <span className="italic text-gray-400">Not provided</span>}
      </p>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 animate-pulse rounded bg-gray-200" style={{ width: i === 1 ? '2rem' : '65%' }} />
        </td>
      ))}
    </tr>
  );
}

export default function FypProjectsPage() {
  const [projects, setProjects] = useState<FypProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<FypProject | null>(null);

  useEffect(() => {
    api
      .get<FypProject[]>('/groups/fyp-projects')
      .then((r) => setProjects(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter((p) => {
    const q = search.toLowerCase();
    const supervisor = p.preferences[0]?.supervisor;
    return (
      p.fypId.toLowerCase().includes(q) ||
      p.proposal.projectTitle.toLowerCase().includes(q) ||
      (supervisor?.name ?? '').toLowerCase().includes(q) ||
      (supervisor?.email ?? '').toLowerCase().includes(q)
    );
  });

  const exportExcel = async () => {
    const xlsx = await import('xlsx');

    const headerRows: (string | number | null)[][] = [
      ['THE SUPERIOR UNIVERSITY LAHORE', null, null, null],
      ['Department of Software Engineering', null, null, null],
      ['FYP Project Directory', null, null, null],
      [`Generated on: ${new Date().toLocaleDateString()}`, null, null, null],
      [null, null, null, null],
      ['Sr#', 'FYP ID', 'Project Title', 'Supervisor'],
    ];

    const dataRows = projects.map((p, idx) => [
      idx + 1,
      p.fypId,
      p.proposal.projectTitle,
      p.preferences[0]?.supervisor?.name ?? p.preferences[0]?.supervisor?.email ?? '—',
    ]);

    const ws = xlsx.utils.aoa_to_sheet([...headerRows, ...dataRows]);

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } },
    ];

    ws['!cols'] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 40 },
      { wch: 25 },
    ];

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'FYP Projects');

    const dateStr = new Date()
      .toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      .replace(' ', '-');
    xlsx.writeFile(wb, `FYP-Projects-${dateStr}.xlsx`);
  };

  const exportPdf = () => {
    window.print();
  };

  return (
    <DashboardLayout navItems={navItems}>
      {/* Print CSS */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #fyp-print-area, #fyp-print-area * { visibility: visible; }
          #fyp-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Hidden print area */}
      <div id="fyp-print-area" style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        {/* University header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #1e293b', paddingBottom: '16px', marginBottom: '20px' }}>
          <img
            src="/superior-logo.png"
            alt="Superior University"
            style={{ height: '60px', margin: '0 auto 8px', display: 'block' }}
          />
          <div style={{ fontWeight: '700', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1e293b' }}>
            THE SUPERIOR UNIVERSITY LAHORE
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
            Department of Software Engineering
          </div>
          <div style={{ fontWeight: '700', fontSize: '13px', marginTop: '8px', color: '#1e293b' }}>
            FYP Project Directory
          </div>
          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
            Generated on: {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'Arial, sans-serif' }}>
          <thead>
            <tr style={{ backgroundColor: '#4F46E5', color: 'white' }}>
              <th style={{ padding: '8px 10px', border: '1px solid #4338CA', textAlign: 'left', width: '40px' }}>Sr#</th>
              <th style={{ padding: '8px 10px', border: '1px solid #4338CA', textAlign: 'left', width: '140px' }}>FYP ID</th>
              <th style={{ padding: '8px 10px', border: '1px solid #4338CA', textAlign: 'left' }}>Project Title</th>
              <th style={{ padding: '8px 10px', border: '1px solid #4338CA', textAlign: 'left', width: '160px' }}>Supervisor</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p, idx) => {
              const supervisor = p.preferences[0]?.supervisor;
              return (
                <tr key={p.id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ padding: '7px 10px', border: '1px solid #e2e8f0' }}>{idx + 1}</td>
                  <td style={{ padding: '7px 10px', border: '1px solid #e2e8f0', fontFamily: 'monospace', fontWeight: '600' }}>{p.fypId}</td>
                  <td style={{ padding: '7px 10px', border: '1px solid #e2e8f0' }}>{p.proposal.projectTitle}</td>
                  <td style={{ padding: '7px 10px', border: '1px solid #e2e8f0' }}>
                    {supervisor ? (supervisor.name ?? supervisor.email) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Footer */}
        <div style={{ marginTop: '16px', fontSize: '11px', color: '#64748b', textAlign: 'right' }}>
          Total Projects: {projects.length}
        </div>
      </div>

      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">FYP Projects</h1>
          <p className="mt-1 text-sm text-gray-500">
            {loading ? 'Loading…' : `${projects.length} project${projects.length !== 1 ? 's' : ''} with approved proposals`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={exportExcel}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" strokeWidth={1.75} />
            Export Excel
          </button>
          <button
            type="button"
            onClick={exportPdf}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Printer className="h-4 w-4" strokeWidth={1.75} />
            Print
          </button>
        </div>
      </div>

      {/* Stat card */}
      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-3 print:hidden">
        <Card className="border-gray-200 shadow-none">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total FYP Projects</p>
                {loading ? (
                  <div className="mt-2 h-8 w-16 animate-pulse rounded-md bg-gray-200" />
                ) : (
                  <p className="mt-1.5 text-3xl font-bold text-gray-900">{projects.length}</p>
                )}
              </div>
              <div className="rounded-xl p-2.5 bg-indigo-50 shrink-0">
                <BookOpen className="h-5 w-5 text-indigo-600" strokeWidth={1.75} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-4 relative max-w-sm print:hidden">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={1.75} />
        <input
          type="text"
          placeholder="Search by FYP ID, title, or supervisor…"
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
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-12">#</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Group FYP ID</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Project Title</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Supervisor</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 print:hidden">Actions</th>
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
                      <BookOpen className="h-5 w-5 text-gray-300" strokeWidth={1.75} />
                    </div>
                    <p className="text-sm font-medium text-gray-500">
                      {search ? 'No projects match your search' : 'No FYP projects yet'}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {search
                        ? 'Try a different search term.'
                        : 'Projects appear here when groups have an approved proposal and an assigned supervisor.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((project, idx) => {
                const supervisor = project.preferences[0]?.supervisor;
                const titleTrunc =
                  project.proposal.projectTitle.length > 55
                    ? project.proposal.projectTitle.slice(0, 55) + '…'
                    : project.proposal.projectTitle;
                return (
                  <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-400 tabular-nums">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-semibold text-gray-900">{project.fypId}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-xs">{titleTrunc}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {supervisor ? (supervisor.name ?? supervisor.email) : <span className="italic text-gray-400">Unassigned</span>}
                    </td>
                    <td className="px-6 py-4 text-right print:hidden">
                      <button
                        type="button"
                        onClick={() => setSelected(project)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>FYP Project Details</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-5 pt-2">
              {/* Header info */}
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Group</p>
                  <p className="text-sm font-mono font-semibold text-gray-900">{selected.fypId}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Supervisor</p>
                  {selected.preferences[0]?.supervisor ? (
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {selected.preferences[0].supervisor.name ?? selected.preferences[0].supervisor.email}
                      </p>
                      {selected.preferences[0].supervisor.name && (
                        <p className="text-xs text-gray-400">{selected.preferences[0].supervisor.email}</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm italic text-gray-400">Unassigned</span>
                  )}
                </div>
              </div>

              <Field label="Project Title" value={selected.proposal.projectTitle} />
              <Field label="Problem Statement" value={selected.proposal.problemStatement} />
              <Field label="Proposed Solution" value={selected.proposal.proposedSolution} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
