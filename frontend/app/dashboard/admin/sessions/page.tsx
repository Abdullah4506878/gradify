'use client';

import { useEffect, useState } from 'react';
import { Calendar, Plus, Trash2, X } from 'lucide-react';
import api from '@/lib/api';

const ACCENT = '#7C6FF7';

interface Program {
  id: number;
  name: string;
  code: string;
}

interface FYPPhase {
  id: number;
  phase: 'FYP_1' | 'FYP_2';
}

interface AcademicSession {
  id: number;
  name: string;
  semester: 'FALL' | 'SPRING' | 'SUMMER';
  year: number;
  isActive: boolean;
  programId: number;
  program: Program;
  phases: FYPPhase[];
}

type Toast = { type: 'success' | 'error'; text: string };

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ backgroundColor: checked ? ACCENT : '#D1D5DB' }}
    >
      <span
        className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? 'translateX(1.375rem)' : 'translateX(0.125rem)' }}
      />
    </button>
  );
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    semester: 'FALL',
    year: String(new Date().getFullYear()),
    programId: '',
  });
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);
  const [phaseLoading, setPhaseLoading] = useState<string | null>(null);

  const showToast = (t: Toast) => {
    setToast(t);
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    Promise.all([
      api.get<AcademicSession[]>('/academic-sessions'),
      api.get<Program[]>('/programs'),
    ])
      .then(([sessRes, progRes]) => {
        setSessions(sessRes.data);
        setPrograms(progRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    if (!addForm.programId) return showToast({ type: 'error', text: 'Select a program.' });
    const year = parseInt(addForm.year, 10);
    if (isNaN(year) || year < 2000 || year > 2100) {
      return showToast({ type: 'error', text: 'Enter a valid year (2000–2100).' });
    }
    setSaving(true);
    try {
      const res = await api.post<AcademicSession>('/academic-sessions', {
        semester: addForm.semester,
        year,
        programId: Number(addForm.programId),
      });
      setSessions((prev) => [res.data, ...prev]);
      setShowAdd(false);
      setAddForm({ semester: 'FALL', year: String(new Date().getFullYear()), programId: '' });
      showToast({ type: 'success', text: 'Session created.' });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast({ type: 'error', text: msg ?? 'Failed to create session.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete session "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/academic-sessions/${id}`);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      showToast({ type: 'success', text: 'Session deleted.' });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast({ type: 'error', text: msg ?? 'Failed to delete session.' });
    }
  };

  const handleToggleActive = async (id: number) => {
    setToggling(id);
    try {
      const res = await api.patch<AcademicSession>(`/academic-sessions/${id}/toggle-active`);
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isActive: res.data.isActive } : s)),
      );
    } catch {
      showToast({ type: 'error', text: 'Failed to update status.' });
    } finally {
      setToggling(null);
    }
  };

  const handleAddPhase = async (sessionId: number, phase: 'FYP_1' | 'FYP_2') => {
    const key = `${sessionId}-${phase}`;
    setPhaseLoading(key);
    try {
      const res = await api.post<FYPPhase>(`/academic-sessions/${sessionId}/phases`, { phase });
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, phases: [...s.phases, res.data] } : s,
        ),
      );
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast({ type: 'error', text: msg ?? 'Phase already exists.' });
    } finally {
      setPhaseLoading(null);
    }
  };

  const handleRemovePhase = async (sessionId: number, phaseId: number) => {
    const key = `rm-${phaseId}`;
    setPhaseLoading(key);
    try {
      await api.delete(`/academic-sessions/${sessionId}/phases/${phaseId}`);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, phases: s.phases.filter((p) => p.id !== phaseId) } : s,
        ),
      );
    } catch {
      showToast({ type: 'error', text: 'Failed to remove phase.' });
    } finally {
      setPhaseLoading(null);
    }
  };

  const PHASES: Array<'FYP_1' | 'FYP_2'> = ['FYP_1', 'FYP_2'];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Academic Sessions</h1>
          <p className="mt-1 text-sm text-gray-500">Manage academic sessions and FYP phases system-wide.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
          style={{ backgroundColor: ACCENT }}
        >
          <Plus className="h-4 w-4" />
          Add Session
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-medium ${
            toast.type === 'success'
              ? 'border-green-100 bg-green-50 text-green-700'
              : 'border-red-100 bg-red-50 text-red-700'
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* Sessions Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${ACCENT}18` }}
          >
            <Calendar className="h-4 w-4" style={{ color: ACCENT }} strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">All Sessions</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {loading ? 'Loading…' : `${sessions.length} session${sessions.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-12 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                <div className="h-6 w-24 animate-pulse rounded-full bg-gray-200" />
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl mb-4"
              style={{ backgroundColor: `${ACCENT}18` }}
            >
              <Calendar className="h-7 w-7" style={{ color: ACCENT }} strokeWidth={1.5} />
            </div>
            <p className="text-sm font-semibold text-gray-700">No sessions yet</p>
            <p className="mt-1.5 text-xs text-gray-400">Click &quot;Add Session&quot; to create the first one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60 text-xs font-medium text-gray-500">
                  <th className="px-5 py-3 text-left">Semester</th>
                  <th className="px-5 py-3 text-left">Year</th>
                  <th className="px-5 py-3 text-left">Program</th>
                  <th className="px-5 py-3 text-left">Phases</th>
                  <th className="px-5 py-3 text-left">Active</th>
                  <th className="px-5 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span
                        className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
                        style={{
                          backgroundColor:
                            session.semester === 'FALL' ? '#FEF3C7' : '#DBEAFE',
                          color: session.semester === 'FALL' ? '#92400E' : '#1E40AF',
                        }}
                      >
                        {session.semester}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-gray-900">{session.year}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-gray-900">{session.program.name}</span>
                      <span className="ml-1.5 text-xs text-gray-400">({session.program.code})</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {PHASES.map((p) => {
                          const existing = session.phases.find((ph) => ph.phase === p);
                          const label = p === 'FYP_1' ? 'FYP 1' : 'FYP 2';
                          if (existing) {
                            return (
                              <span
                                key={p}
                                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                                style={{ backgroundColor: ACCENT }}
                              >
                                {label}
                                <button
                                  onClick={() => handleRemovePhase(session.id, existing.id)}
                                  disabled={phaseLoading === `rm-${existing.id}`}
                                  className="ml-0.5 rounded-full hover:opacity-75 disabled:opacity-40"
                                  title={`Remove ${label}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            );
                          }
                          return (
                            <button
                              key={p}
                              onClick={() => handleAddPhase(session.id, p)}
                              disabled={phaseLoading === `${session.id}-${p}`}
                              className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-2.5 py-0.5 text-xs font-medium text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
                              title={`Add ${label}`}
                            >
                              <Plus className="h-3 w-3" />
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Toggle
                          checked={session.isActive}
                          onChange={() => handleToggleActive(session.id)}
                          disabled={toggling === session.id}
                        />
                        <span
                          className="text-xs font-medium"
                          style={{ color: session.isActive ? ACCENT : '#9CA3AF' }}
                        >
                          {session.isActive ? 'ON' : 'OFF'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleDelete(session.id, session.name)}
                        className="flex items-center justify-center rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        title="Delete session"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Session Dialog */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">New Academic Session</h2>
                <p className="text-xs text-gray-400 mt-0.5">FYP ID generation will use this semester and year.</p>
              </div>
              <button
                onClick={() => setShowAdd(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Semester</label>
                  <select
                    value={addForm.semester}
                    onChange={(e) => setAddForm((f) => ({ ...f, semester: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-indigo-400 focus:bg-white focus:outline-none"
                  >
                    <option value="FALL">FALL</option>
                    <option value="SPRING">SPRING</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Year</label>
                  <input
                    type="number"
                    min={2000}
                    max={2100}
                    value={addForm.year}
                    onChange={(e) => setAddForm((f) => ({ ...f, year: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-indigo-400 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Program</label>
                <select
                  value={addForm.programId}
                  onChange={(e) => setAddForm((f) => ({ ...f, programId: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-indigo-400 focus:bg-white focus:outline-none"
                >
                  <option value="">Select a program…</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setShowAdd(false)}
                disabled={saving}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: ACCENT }}
              >
                {saving ? 'Creating…' : 'Create Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
