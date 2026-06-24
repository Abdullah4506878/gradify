'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FolderOpen,
  BarChart,
  User,
  Search,
  ClipboardCheck,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

type ProposalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface Proposal {
  id: number;
  projectTitle: string;
  problemStatement: string;
  proposedSolution: string;
  supervisorComments: string | null;
  managerComments: string | null;
  status: ProposalStatus;
  createdAt: string;
  group: { id: number; fypId: string; leader: { id: number; name: string | null; email: string } };
}

type Flash = { type: 'success' | 'error'; text: string };

const STATUS_STYLES: Record<ProposalStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-yellow-50 text-yellow-700' },
  APPROVED: { label: 'Approved', className: 'bg-green-50 text-green-700' },
  REJECTED: { label: 'Rejected', className: 'bg-red-50 text-red-700' },
};

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 animate-pulse rounded bg-gray-200" style={{ width: i === 5 ? '5rem' : '65%' }} />
        </td>
      ))}
    </tr>
  );
}

export default function ManagerProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewProposal, setViewProposal] = useState<Proposal | null>(null);
  const [managerComments, setManagerComments] = useState('');
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<Flash | null>(null);

  const showFlash = (f: Flash) => {
    setFlash(f);
    setTimeout(() => setFlash(null), 4000);
  };

  useEffect(() => {
    api.get<Proposal[]>('/proposals')
      .then((res) => setProposals(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSaveComments = async () => {
    if (!viewProposal) return;
    setSaving(true);
    try {
      const res = await api.patch<Proposal>(`/proposals/${viewProposal.id}/manager-review`, {
        managerComments: managerComments.trim() || undefined,
      });
      setProposals((prev) => prev.map((p) => p.id === viewProposal.id ? res.data : p));
      setViewProposal(res.data);
      showFlash({ type: 'success', text: 'Comments saved successfully.' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showFlash({ type: 'error', text: typeof msg === 'string' ? msg : 'Failed to save comments.' });
    } finally {
      setSaving(false);
    }
  };

  const filtered = proposals.filter((p) => {
    const q = search.toLowerCase();
    return p.group.fypId.toLowerCase().includes(q) || p.projectTitle.toLowerCase().includes(q);
  });

  return (
    <DashboardLayout navItems={navItems}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Proposals</h1>
          <p className="mt-1 text-sm text-gray-500">
            {loading ? 'Loading…' : `${proposals.length} proposal${proposals.length !== 1 ? 's' : ''} submitted`}
          </p>
        </div>
      </div>

      {flash && (
        <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${flash.type === 'success' ? 'border-green-100 bg-green-50 text-green-700' : 'border-red-100 bg-red-50 text-red-700'}`}>
          {flash.text}
        </div>
      )}

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={1.75} />
        <input
          type="text"
          placeholder="Search by FYP ID or title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-10">#</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">FYP ID</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Project Title</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Submitted</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <ClipboardCheck className="h-6 w-6 text-gray-300 mb-3" strokeWidth={1.75} />
                    <p className="text-sm font-medium text-gray-500">
                      {search ? 'No proposals match your search' : 'No proposals submitted yet'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((p, idx) => {
                const s = STATUS_STYLES[p.status] ?? STATUS_STYLES.PENDING;
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-400">{idx + 1}</td>
                    <td className="px-6 py-4 font-mono text-sm font-medium text-gray-900">{p.group.fypId}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">{p.projectTitle}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.className}`}>{s.label}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => { setViewProposal(p); setManagerComments(p.managerComments ?? ''); }}
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

      {/* View Dialog */}
      <Dialog open={!!viewProposal} onOpenChange={(open) => { if (!open) { setViewProposal(null); setManagerComments(''); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" showCloseButton>
          <DialogHeader>
            <DialogTitle>Proposal Details</DialogTitle>
          </DialogHeader>
          {viewProposal && (() => {
            const s = STATUS_STYLES[viewProposal.status] ?? STATUS_STYLES.PENDING;
            return (
              <div className="pt-2 space-y-5">
                {/* Logo */}
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
                  <img src="/superior-logo.png" alt="Superior University" width={40} height={40} className="object-contain shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-700">The Superior University Lahore</p>
                    <p className="text-xs text-gray-400">FYP Project Idea Submission</p>
                  </div>
                </div>

                {/* Group + status */}
                <div className="flex items-center justify-between">
                  <p className="font-mono text-xl font-bold text-indigo-600">{viewProposal.group.fypId}</p>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.className}`}>{s.label}</span>
                </div>

                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Project Title</p>
                  <p className="text-sm font-semibold text-gray-900">{viewProposal.projectTitle}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Problem Statement</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed rounded-lg bg-gray-50 px-4 py-3">{viewProposal.problemStatement}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Proposed Solution</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed rounded-lg bg-gray-50 px-4 py-3">{viewProposal.proposedSolution}</p>
                </div>

                {viewProposal.supervisorComments && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Supervisor Comments</p>
                    <p className="text-sm text-gray-700 rounded-lg bg-purple-50 px-4 py-3">{viewProposal.supervisorComments}</p>
                  </div>
                )}

                {/* Manager Comments */}
                <div>
                  <label htmlFor="mgComments" className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                    Manager Comments
                    <span className="ml-1 text-xs text-gray-400 normal-case font-normal">(optional)</span>
                  </label>
                  <textarea
                    id="mgComments"
                    rows={3}
                    value={managerComments}
                    onChange={(e) => setManagerComments(e.target.value)}
                    placeholder="Add your comments…"
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => { setViewProposal(null); setManagerComments(''); }}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveComments}
                    disabled={saving}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? 'Saving…' : 'Save Comments'}
                  </button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
