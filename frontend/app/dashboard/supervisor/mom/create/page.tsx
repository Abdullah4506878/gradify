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
  ClipboardList,
  Plus,
  X,
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
  { label: 'Tasks', href: '/dashboard/supervisor/tasks', icon: ClipboardList },
  { label: 'Proposals', href: '/dashboard/supervisor/proposals', icon: ClipboardCheck },
  { label: 'Schedule', href: '/dashboard/supervisor/schedule', icon: Calendar },
  { label: 'Profile', href: '/dashboard/supervisor/profile', icon: User },
];

type FypRole = 'DOCUMENTATION' | 'DEVELOPMENT';

interface Group {
  id: number;
  fypId: string | null;
}

interface GroupMember {
  id: number;
  userId: number;
  fypRole: FypRole | null;
  user: { id: number; name: string | null; email: string };
}

interface GroupDetail {
  id: number;
  fypId: string | null;
  members: GroupMember[];
}

interface Participant {
  id: number;
  name: string;
  role: 'Supervisor' | 'Team Lead' | 'Student';
  present: boolean;
}

const PARTICIPANT_ROLES = ['Supervisor', 'Team Lead', 'Student'] as const;

const ROLE_BADGE: Record<FypRole, string> = {
  DOCUMENTATION: '📄 Documentation',
  DEVELOPMENT: '💻 Development',
};

export default function CreateMOMPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultGroupId = searchParams.get('groupId') ?? '';

  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupDetail, setGroupDetail] = useState<GroupDetail | null>(null);

  const [groupId, setGroupId] = useState(defaultGroupId);
  const [agenda, setAgenda] = useState('');
  const [discussion, setDiscussion] = useState('');
  const [decisions, setDecisions] = useState('');
  const [nextMeetingDate, setNextMeetingDate] = useState('');
  const [nextMeetingTime, setNextMeetingTime] = useState('');
  const [nextMeetingVenue, setNextMeetingVenue] = useState('');

  const [participants, setParticipants] = useState<Participant[]>([
    { id: 1, name: '', role: 'Supervisor', present: true },
  ]);
  const [nextParticipantId, setNextParticipantId] = useState(2);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    api.get<Group[]>('/groups')
      .then((res) => setGroups(res.data))
      .catch(() => {})
      .finally(() => setGroupsLoading(false));

    api.get<{ name: string | null; email: string }>('/users/me')
      .then((res) => {
        const name = res.data.name ?? res.data.email;
        setParticipants([{ id: 1, name, role: 'Supervisor', present: true }]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!groupId) { setGroupDetail(null); return; }
    api.get<GroupDetail>(`/groups/${groupId}`)
      .then((res) => setGroupDetail(res.data))
      .catch(() => setGroupDetail(null));
  }, [groupId]);

  const addParticipant = () => {
    setParticipants((prev) => [...prev, { id: nextParticipantId, name: '', role: 'Student', present: true }]);
    setNextParticipantId((n) => n + 1);
  };

  const removeParticipant = (id: number) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  const updateParticipant = <K extends keyof Participant>(id: number, field: K, value: Participant[K]) => {
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const MIN = 600;

  const validate = (): string | null => {
    if (!groupId) return 'Please select a group.';
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

    const filledParticipants = participants.filter((p) => p.name.trim());
    const participantsJson =
      filledParticipants.length > 0
        ? JSON.stringify(filledParticipants.map((p, idx) => ({
            sr: idx + 1,
            name: p.name.trim(),
            role: p.role,
            present: p.present,
          })))
        : undefined;

    try {
      await api.post('/mom', {
        groupId: parseInt(groupId, 10),
        agenda: agenda.trim(),
        discussion: discussion.trim(),
        decisions: decisions.trim(),
        participants: participantsJson,
        nextMeetingDate: nextMeetingDate || undefined,
        nextMeetingTime: nextMeetingTime || undefined,
        nextMeetingVenue: nextMeetingVenue.trim() || undefined,
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
                        {g.fypId ?? `Group #${g.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Member roles panel */}
              {groupDetail && groupDetail.members.length > 0 && (
                <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Group Members</p>
                  <ul className="space-y-1.5">
                    {groupDetail.members.map((m) => (
                      <li key={m.id} className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">👤 {m.user.name ?? m.user.email}</span>
                        {m.fypRole ? (
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${m.fypRole === 'DOCUMENTATION' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                            {ROLE_BADGE[m.fypRole]}
                          </span>
                        ) : (
                          <span className="text-xs italic text-gray-400">Role not selected</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Participants */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Participants</label>
                <button
                  type="button"
                  onClick={addParticipant}
                  className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                  Add Participant
                </button>
              </div>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 w-10">Sr#</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 w-32">Role</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 w-24">Attendance</th>
                      <th className="px-3 py-2 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {participants.map((p, idx) => (
                      <tr key={p.id}>
                        <td className="px-3 py-2.5 text-xs text-gray-500 tabular-nums">{idx + 1}</td>
                        <td className="px-3 py-2.5">
                          <input
                            type="text"
                            value={p.name}
                            onChange={(e) => updateParticipant(p.id, 'name', e.target.value)}
                            placeholder="Full name…"
                            className="w-full text-sm text-gray-900 placeholder-gray-400 bg-transparent focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <select
                            value={p.role}
                            onChange={(e) => updateParticipant(p.id, 'role', e.target.value as Participant['role'])}
                            className="text-xs text-gray-700 bg-transparent focus:outline-none w-full"
                          >
                            {PARTICIPANT_ROLES.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2.5">
                          <button
                            type="button"
                            onClick={() => updateParticipant(p.id, 'present', !p.present)}
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${p.present ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
                          >
                            {p.present ? 'Present' : 'Absent'}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {participants.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeParticipant(p.id)}
                              className="text-gray-300 hover:text-red-400 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" strokeWidth={2} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
            </div>

            {/* Next Meeting */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Next Meeting
                <span className="ml-1.5 text-xs font-normal text-gray-400">(optional)</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date</label>
                  <input
                    type="date"
                    value={nextMeetingDate}
                    onChange={(e) => setNextMeetingDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Time</label>
                  <input
                    type="time"
                    value={nextMeetingTime}
                    onChange={(e) => setNextMeetingTime(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Venue</label>
                  <input
                    type="text"
                    value={nextMeetingVenue}
                    onChange={(e) => setNextMeetingVenue(e.target.value)}
                    placeholder="e.g. Room 301, Lab Block"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                  />
                </div>
              </div>
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
