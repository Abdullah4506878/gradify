'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  FolderOpen,
  Calendar,
  User,
  FileText,
  ArrowLeft,
  ClipboardCheck,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/api';

const navItems = [
  { label: 'Dashboard', href: '/dashboard/supervisor', icon: LayoutDashboard },
  { label: 'My Groups', href: '/dashboard/supervisor/groups', icon: FolderOpen },
  { label: 'Minutes of Meeting', href: '/dashboard/supervisor/mom', icon: FileText },
  { label: 'Proposals', href: '/dashboard/supervisor/proposals', icon: ClipboardCheck },
  { label: 'Schedule', href: '/dashboard/supervisor/schedule', icon: Calendar },
  { label: 'Profile', href: '/dashboard/supervisor/profile', icon: User },
];

interface Group {
  id: number;
  fypId: string;
}

export default function CreateMOMPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultGroupId = searchParams.get('groupId') ?? '';

  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);

  const [groupId, setGroupId] = useState(defaultGroupId);
  const [attendees, setAttendees] = useState('');
  const [agenda, setAgenda] = useState('');
  const [discussion, setDiscussion] = useState('');
  const [decisions, setDecisions] = useState('');
  const [nextSteps, setNextSteps] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    api.get<Group[]>('/groups')
      .then((res) => setGroups(res.data))
      .catch(() => {})
      .finally(() => setGroupsLoading(false));
  }, []);

  const MIN = 600;

  const validate = (): string | null => {
    if (!groupId) return 'Please select a group.';
    if (!attendees.trim()) return 'Attendees are required.';
    if (!agenda.trim()) return 'Agenda is required.';
    if (!discussion.trim()) return 'Discussion is required.';
    if (!decisions.trim()) return 'Decisions is required.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/mom', {
        groupId: parseInt(groupId, 10),
        attendees: attendees.trim(),
        agenda: agenda.trim(),
        discussion: discussion.trim(),
        decisions: decisions.trim(),
        nextSteps: nextSteps.trim() || undefined,
      });
      router.push('/dashboard/supervisor/mom');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Failed to create minutes of meeting. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout navItems={navItems}>
      {/* Back + header */}
      <div className="mb-6">
        <Link
          href="/dashboard/supervisor/mom"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Back to Minutes of Meeting
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create Minutes of Meeting</h1>
        <p className="mt-1 text-sm text-gray-500">Record minutes of a group meeting</p>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {/* University header */}
          <div className="border-b border-gray-100 bg-gray-50 px-6 py-5 text-center">
            <div className="flex justify-center mb-3">
              {logoError ? (
                <div className="h-14 w-14 rounded-full bg-gray-200 flex items-center justify-center">
                  <FileText className="h-7 w-7 text-gray-400" strokeWidth={1.75} />
                </div>
              ) : (
                <img
                  src="/superior-logo.png"
                  alt="Superior University"
                  className="h-14 w-14 object-contain"
                  onError={() => setLogoError(true)}
                />
              )}
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-800">
              The Superior University Lahore
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Department of Software Engineering</p>
            <div className="mt-3 inline-block rounded bg-gray-800 px-4 py-1">
              <p className="text-xs font-bold uppercase tracking-widest text-white">
                Minutes of Meeting
              </p>
            </div>
          </div>

          {/* Form fields */}
          <div className="p-6 space-y-5">
            {/* Group */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Group <span className="text-red-500">*</span>
              </label>
              {groupsLoading ? (
                <div className="h-10 animate-pulse rounded-lg bg-gray-200" />
              ) : (
                <Select value={groupId} onValueChange={setGroupId} disabled={groups.length === 0}>
                  <SelectTrigger className="w-full border-gray-200 bg-gray-50 focus:border-indigo-500">
                    <SelectValue placeholder={groups.length === 0 ? 'No groups available' : 'Select a group'} />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>
                        {g.fypId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Attendees */}
            <div>
              <label htmlFor="attendees" className="block text-sm font-medium text-gray-700 mb-1.5">
                Attendees <span className="text-red-500">*</span>
              </label>
              <input
                id="attendees"
                type="text"
                value={attendees}
                onChange={(e) => setAttendees(e.target.value)}
                placeholder="e.g. Ahmed Raza, Bilal Hassan, Hamza Khan"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
              />
            </div>

            {/* Agenda */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="agenda" className="block text-sm font-medium text-gray-700">
                  Agenda <span className="text-red-500">*</span>
                </label>
                <span className={`text-xs font-medium ${agenda.trim().length >= MIN ? 'text-green-600' : 'text-gray-400'}`}>
                  {agenda.trim().length} / {MIN} chars
                </span>
              </div>
              <textarea
                id="agenda"
                rows={5}
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                placeholder="What topics were on the meeting agenda?"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors resize-none"
              />
              <p className="mt-1 text-xs text-gray-400">Minimum 600 characters</p>
            </div>

            {/* Discussion */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="discussion" className="block text-sm font-medium text-gray-700">
                  Discussion <span className="text-red-500">*</span>
                </label>
                <span className={`text-xs font-medium ${discussion.trim().length >= MIN ? 'text-green-600' : 'text-gray-400'}`}>
                  {discussion.trim().length} / {MIN} chars
                </span>
              </div>
              <textarea
                id="discussion"
                rows={5}
                value={discussion}
                onChange={(e) => setDiscussion(e.target.value)}
                placeholder="Summarize the key points discussed during the meeting…"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors resize-none"
              />
              <p className="mt-1 text-xs text-gray-400">Minimum 600 characters</p>
            </div>

            {/* Decisions */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="decisions" className="block text-sm font-medium text-gray-700">
                  Decisions <span className="text-red-500">*</span>
                </label>
                <span className={`text-xs font-medium ${decisions.trim().length >= MIN ? 'text-green-600' : 'text-gray-400'}`}>
                  {decisions.trim().length} / {MIN} chars
                </span>
              </div>
              <textarea
                id="decisions"
                rows={5}
                value={decisions}
                onChange={(e) => setDecisions(e.target.value)}
                placeholder="What decisions were made during the meeting?"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors resize-none"
              />
              <p className="mt-1 text-xs text-gray-400">Minimum 600 characters</p>
            </div>

            {/* Next Steps */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="nextSteps" className="block text-sm font-medium text-gray-700">
                  Next Steps
                  <span className="ml-1.5 text-xs text-gray-400 font-normal">(optional)</span>
                </label>
                {nextSteps.trim().length > 0 && (
                  <span className={`text-xs font-medium ${nextSteps.trim().length >= MIN ? 'text-green-600' : 'text-gray-400'}`}>
                    {nextSteps.trim().length} / {MIN} chars
                  </span>
                )}
              </div>
              <textarea
                id="nextSteps"
                rows={5}
                value={nextSteps}
                onChange={(e) => setNextSteps(e.target.value)}
                placeholder="What are the action items or next steps for the group?"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors resize-none"
              />
              <p className="mt-1 text-xs text-gray-400">Minimum 600 characters if provided</p>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Submit */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Creating…' : 'Create Minutes of Meeting'}
              </button>
              <Link
                href="/dashboard/supervisor/mom"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </Link>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
