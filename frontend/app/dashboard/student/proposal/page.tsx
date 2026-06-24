'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  User,
  ArrowLeft,
  CheckCircle,
  Download,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/lib/auth';
import api from '@/lib/api';

const navItems = [
  { label: 'Dashboard', href: '/dashboard/student', icon: LayoutDashboard },
  { label: 'My Group', href: '/dashboard/student/group', icon: Users },
  { label: 'Tasks', href: '/dashboard/student/tasks', icon: ClipboardList },
  { label: 'Profile', href: '/dashboard/student/profile', icon: User },
];

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface TeamMember {
  name: string;
  studentId: string;
  program: string;
  contact: string;
  email: string;
}

interface GroupMember {
  id: number;
  userId: number;
  user: { id: number; name: string | null; email: string };
}

interface GroupData {
  id: number;
  fypId: string;
  leader: { id: number; name: string | null; email: string };
  members: GroupMember[];
  preferences: {
    id: number;
    preference: number;
    supervisor: { id: number; name: string | null; email: string };
  }[];
}

type ProposalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface ProposalData {
  id: number;
  status: ProposalStatus;
  projectTitle: string;
  problemStatement: string;
  proposedSolution: string;
  supervisorComments: string | null;
  managerComments: string | null;
  updatedAt: string;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const defaultTeam = (): TeamMember[] =>
  Array.from({ length: 3 }, () => ({
    name: '',
    studentId: '',
    program: 'BS Software Engineering',
    contact: '',
    email: '',
  }));

const STATUS_BADGE: Record<ProposalStatus, { label: string; cls: string }> = {
  PENDING:  { label: 'Pending',  cls: 'bg-yellow-100 text-yellow-800' },
  APPROVED: { label: 'Approved', cls: 'bg-green-100 text-green-800'   },
  REJECTED: { label: 'Rejected', cls: 'bg-red-100 text-red-800'       },
};

function UniversityLogo({ size }: { size: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center rounded-full bg-purple-800 text-white font-black text-lg shrink-0 select-none"
      >
        SU
      </div>
    );
  }
  return (
    <img
      src="/superior-logo.png"
      alt="Superior University Logo"
      width={size}
      height={size}
      className="object-contain shrink-0"
      onError={() => setFailed(true)}
    />
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function SubmitProposalPage() {
  const { user } = useAuthStore();

  const [group,          setGroup]          = useState<GroupData | null>(null);
  const [groupLoading,   setGroupLoading]   = useState(true);
  const [proposal,       setProposal]       = useState<ProposalData | null>(null);
  const [proposalLoading,setProposalLoading]= useState(true);

  const [teamMembers,      setTeamMembers]      = useState<TeamMember[]>(defaultTeam());
  const [projectTitle,     setProjectTitle]     = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [proposedSolution, setProposedSolution] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [submitted,  setSubmitted]  = useState(false);

  useEffect(() => {
    Promise.allSettled([
      api.get<GroupData[]>('/groups'),
      api.get<ProposalData>('/proposals/my'),
    ]).then(([groupsRes, proposalRes]) => {
      const groupsData = groupsRes.status === 'fulfilled' ? groupsRes.value.data : [];
      console.log('All groups:', groupsData);
      console.log('Current user id:', user?.id);

      const found = groupsData.find((g: GroupData) => {
        const isLeader = g.leader?.id === user?.id;
        const isMember = g.members?.some((m: GroupMember) =>
          m.userId === user?.id || m.user?.id === user?.id
        );
        console.log('Group:', g.fypId, 'isLeader:', isLeader, 'isMember:', isMember);
        return isLeader || isMember;
      });

      setGroup(found ?? null);
      setGroupLoading(false);

      if (proposalRes.status === 'fulfilled' && proposalRes.value.data?.id) {
        const p = proposalRes.value.data;
        setProposal(p);
        setProjectTitle(p.projectTitle);
        setProblemStatement(p.problemStatement);
        setProposedSolution(p.proposedSolution);
      } else {
        setProposal(null);
      }
      setProposalLoading(false);
    });
  }, [user?.id]);

  const updateMember = (idx: number, field: keyof TeamMember, value: string) =>
    setTeamMembers((prev) => prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)));

  const isReadOnly = !!(proposal && proposal.status !== 'REJECTED');

  const validate = (): string | null => {
    if (!projectTitle.trim()) return 'Project title is required.';
    if (problemStatement.trim().length < 800)
      return `Problem statement must be at least 800 characters (currently ${problemStatement.trim().length}).`;
    if (proposedSolution.trim().length < 800)
      return `Proposed solution must be at least 800 characters (currently ${proposedSolution.trim().length}).`;
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    const err = validate();
    if (err) { setError(err); return; }
    if (!group) { setError('You must be in a group before submitting a proposal.'); return; }
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post<ProposalData>('/proposals', {
        groupId: group.id,
        projectTitle: projectTitle.trim(),
        problemStatement: problemStatement.trim(),
        proposedSolution: proposedSolution.trim(),
      });
      setProposal(res.data);
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Failed to submit proposal. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isApproved     = proposal?.status === 'APPROVED';
  const supervisorName = group?.preferences?.find((p) => p.preference === 1)?.supervisor?.name;
  const svBadge        = proposal ? STATUS_BADGE[proposal.status] : STATUS_BADGE.PENDING;

  const areaCls = (ro: boolean) =>
    `w-full border-0 border-b bg-transparent text-sm text-gray-900 placeholder-gray-300 focus:outline-none resize-none leading-relaxed pb-0.5 ${
      ro ? 'border-gray-200 cursor-default' : 'border-gray-400 focus:border-indigo-500'
    }`;

  return (
    <DashboardLayout navItems={navItems}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@700&display=swap');
        @media print {
          body * { visibility: hidden; }
          #proposal-document, #proposal-document * { visibility: visible; }
          #proposal-document { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border: none; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* ── Back link ── */}
      <div className="mb-4 no-print">
        <Link
          href="/dashboard/student/group"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Back to My Group
        </Link>
      </div>

      {submitted ? (
        /* ── Success state ── */
        <div className="max-w-2xl mx-auto rounded-xl border border-green-100 bg-green-50 p-10 flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-7 w-7 text-green-600" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-base font-semibold text-green-900">Proposal Submitted!</p>
            <p className="mt-1 text-sm text-green-700">
              Your project idea has been submitted and is now under review by your supervisor.
            </p>
          </div>
          <Link
            href="/dashboard/student/group"
            className="mt-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            Back to My Group
          </Link>
        </div>
      ) : (
        <>
          {/* ── Top action bar ── */}
          <div className="max-w-[800px] mx-auto mb-2 flex items-center justify-end no-print">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 transition-colors"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
              Download PDF
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div
              id="proposal-document"
              className="max-w-[800px] mx-auto bg-white border border-gray-300 shadow-md relative overflow-hidden"
            >
              {/* APPROVED stamp */}
              {isApproved && (
                <div className="absolute inset-0 flex items-start justify-end pointer-events-none z-10 pt-8 pr-8">
                  <div className="-rotate-[20deg] border-4 border-green-500 px-5 py-2 opacity-20 select-none">
                    <span className="text-4xl font-black uppercase tracking-widest text-green-600">Approved</span>
                  </div>
                </div>
              )}

              {/* ════ HEADER ════ */}
              <div className="px-6 pt-5 pb-4 border-b-2 border-gray-800">
                {/* Logo + university name */}
                <div className="flex items-center gap-5">
                  <UniversityLogo size={80} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-base uppercase tracking-wide text-gray-900 leading-tight">
                      THE SUPERIOR UNIVERSITY LAHORE
                    </p>
                    <p className="text-sm text-gray-600 mt-0.5">Department of Software Engineering</p>
                  </div>
                </div>

                {/* Divider + title */}
                <div className="mt-3 pt-3 border-t border-gray-400 text-center">
                  <p className="font-bold text-xl uppercase tracking-wide text-gray-900 leading-tight">
                    FYP PROJECT IDEA SUBMISSION
                  </p>
                </div>
              </div>

              {/* ════ PROJECT ID ════ */}
              <div className="px-6 py-2 border-b border-gray-300 flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">Project ID:</span>
                {groupLoading ? (
                  <div className="h-3.5 w-28 animate-pulse rounded bg-gray-200" />
                ) : (
                  <span className="font-mono text-xs font-bold text-indigo-700">
                    {group?.fypId ?? '—'}
                  </span>
                )}
              </div>

              {/* ════ PROJECT TEAM TABLE ════ */}
              <div className="px-6 py-3 border-b border-gray-300">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-800 mb-1.5">Project Team</p>
                <table className="w-full border-collapse" style={{ fontSize: '11px' }}>
                  <thead>
                    <tr className="bg-gray-100">
                      {['Student Name', 'Student ID', 'Program', 'Contact No.', 'Email Address'].map((h) => (
                        <th key={h} className="border border-gray-400 px-1.5 py-1 text-left font-semibold text-gray-700">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {teamMembers.map((m, i) => (
                      <tr key={i}>
                        <td className="border border-gray-400 px-1.5 py-1">
                          <input
                            type="text"
                            value={m.name}
                            onChange={(e) => updateMember(i, 'name', e.target.value)}
                            placeholder="Full name"
                            style={{ fontSize: '11px' }}
                            className="w-full bg-transparent text-gray-900 placeholder-gray-300 focus:outline-none"
                          />
                        </td>
                        <td className="border border-gray-400 px-1.5 py-1">
                          <input
                            type="text"
                            value={m.studentId}
                            onChange={(e) => updateMember(i, 'studentId', e.target.value)}
                            placeholder="Roll no."
                            style={{ fontSize: '11px' }}
                            className="w-full bg-transparent text-gray-900 placeholder-gray-300 focus:outline-none font-mono"
                          />
                        </td>
                        <td className="border border-gray-400 px-1.5 py-1">
                          <input
                            type="text"
                            value={m.program}
                            onChange={(e) => updateMember(i, 'program', e.target.value)}
                            style={{ fontSize: '11px' }}
                            className="w-full bg-transparent text-gray-900 focus:outline-none"
                          />
                        </td>
                        <td className="border border-gray-400 px-1.5 py-1">
                          <input
                            type="text"
                            value={m.contact}
                            onChange={(e) => updateMember(i, 'contact', e.target.value)}
                            placeholder="03XX-XXXXXXX"
                            style={{ fontSize: '11px' }}
                            className="w-full bg-transparent text-gray-900 placeholder-gray-300 focus:outline-none"
                          />
                        </td>
                        <td className="border border-gray-400 px-1.5 py-1">
                          <input
                            type="text"
                            value={m.email}
                            onChange={(e) => updateMember(i, 'email', e.target.value)}
                            placeholder="email@superior.edu.pk"
                            style={{ fontSize: '11px' }}
                            className="w-full bg-transparent text-gray-900 placeholder-gray-300 focus:outline-none"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ════ FORM FIELDS ════ */}
              <div className="px-6 py-4 border-b border-gray-300 space-y-4">
                {/* Project Title */}
                <div className="flex items-end gap-3">
                  <label htmlFor="projectTitle" className="text-xs font-semibold text-gray-800 whitespace-nowrap shrink-0">
                    Project Title:
                  </label>
                  <input
                    id="projectTitle"
                    type="text"
                    value={projectTitle}
                    onChange={(e) => { setProjectTitle(e.target.value); setError(null); }}
                    readOnly={isReadOnly}
                    placeholder="Enter project title"
                    className={`flex-1 border-0 border-b bg-transparent text-sm text-gray-900 placeholder-gray-300 focus:outline-none pb-0.5 ${
                      isReadOnly ? 'border-gray-200 cursor-default' : 'border-gray-400 focus:border-indigo-500'
                    }`}
                  />
                </div>

                {/* Problem Statement */}
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label htmlFor="problemStatement" className="text-xs font-semibold text-gray-800">
                      Problem Statement:
                    </label>
                    <span className={`text-xs tabular-nums ${problemStatement.trim().length >= 800 ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                      {problemStatement.trim().length} / 800
                    </span>
                  </div>
                  <textarea
                    id="problemStatement"
                    rows={4}
                    value={problemStatement}
                    onChange={(e) => { setProblemStatement(e.target.value); setError(null); }}
                    readOnly={isReadOnly}
                    placeholder="Describe the problem your project aims to solve…"
                    className={areaCls(isReadOnly)}
                  />
                </div>

                {/* Proposed Solution */}
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label htmlFor="proposedSolution" className="text-xs font-semibold text-gray-800">
                      Proposed Solution:
                    </label>
                    <span className={`text-xs tabular-nums ${proposedSolution.trim().length >= 800 ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                      {proposedSolution.trim().length} / 800
                    </span>
                  </div>
                  <textarea
                    id="proposedSolution"
                    rows={4}
                    value={proposedSolution}
                    onChange={(e) => { setProposedSolution(e.target.value); setError(null); }}
                    readOnly={isReadOnly}
                    placeholder="Describe your proposed solution…"
                    className={areaCls(isReadOnly)}
                  />
                </div>
              </div>

              {/* ════ APPROVAL SECTION ════ */}
              <div className="px-6 py-4 border-b border-gray-300">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-800 mb-3 text-center border-b border-gray-300 pb-1.5">
                  Approval
                </p>
                {proposalLoading ? (
                  <div className="h-20 animate-pulse rounded border border-gray-200 bg-gray-100" />
                ) : (
                  /* Single full-width supervisor box */
                  <div className="border border-gray-400 p-4 space-y-2.5">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-700 text-center border-b border-gray-300 pb-1.5">
                      Project Supervisor
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 shrink-0">Approval Status:</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${svBadge.cls}`}>
                        {svBadge.label}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-600">Comments: </span>
                      <span className="text-xs text-gray-800">
                        {proposal?.supervisorComments ?? '—'}
                      </span>
                    </div>
                    {isApproved && (
                      <p className="text-xs text-green-700 font-medium">
                        ✓ Digitally approved by {supervisorName ?? 'Supervisor'} on{' '}
                        {new Date(proposal!.updatedAt).toLocaleDateString('en-US', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* ════ SUBMIT ════ */}
              {!isReadOnly && (
                <div className="px-6 py-4 no-print">
                  {error && (
                    <div className="mb-3 rounded border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                      {error}
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <button
                      type="submit"
                      disabled={submitting || groupLoading}
                      className="rounded bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors no-print"
                    >
                      {submitting
                        ? 'Submitting…'
                        : proposal?.status === 'REJECTED'
                        ? 'Resubmit Proposal'
                        : 'Submit Project Idea'}
                    </button>
                    <Link
                      href="/dashboard/student/group"
                      className="text-sm text-gray-500 hover:text-gray-700 transition-colors no-print"
                    >
                      Cancel
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </form>
        </>
      )}
    </DashboardLayout>
  );
}
