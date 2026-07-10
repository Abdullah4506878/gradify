'use client';

import { useEffect, useState } from 'react';
import { ToggleLeft, ToggleRight, GraduationCap, CalendarDays, Eye } from 'lucide-react';
import api from '@/lib/api';

const ACCENT = '#7C6FF7';

interface SystemSetting {
  id: number;
  key: string;
  value: string;
  label: string;
}

type Toast = { type: 'success' | 'error'; text: string };

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        backgroundColor: checked ? ACCENT : '#D1D5DB',
        // @ts-ignore
        '--tw-ring-color': ACCENT,
      }}
    >
      <span
        className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? 'translateX(1.375rem)' : 'translateX(0.125rem)' }}
      />
    </button>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [yearInput, setYearInput] = useState('AUTO');

  useEffect(() => {
    const found = settings.find((s) => s.key === 'current_year');
    if (found) setYearInput(found.value);
  }, [settings]);

  const showToast = (t: Toast) => {
    setToast(t);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    api.get<SystemSetting[]>('/admin/settings')
      .then((res) => setSettings(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getSetting = (key: string) => settings.find((s) => s.key === key);

  const handleUpdate = async (key: string, value: string) => {
    setSaving(key);
    try {
      const res = await api.patch<SystemSetting>(`/admin/settings/${key}`, { value });
      setSettings((prev) => prev.map((s) => (s.key === key ? res.data : s)));
      showToast({ type: 'success', text: 'Setting saved.' });
    } catch {
      showToast({ type: 'error', text: 'Failed to save setting.' });
    } finally {
      setSaving(null);
    }
  };

  const TOGGLE_SETTINGS = [
    {
      key: 'require_github_linkedin',
      icon: GraduationCap,
      title: 'Require GitHub & LinkedIn',
      description: 'Students must add GitHub & LinkedIn to their profile before submitting supervisor preferences.',
    },
    {
      key: 'show_phase_to_students',
      icon: Eye,
      title: 'Show phase to students',
      description: 'Display the academic phase (FYP-1 / FYP-2) on the student group page.',
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">System configuration and feature flags.</p>
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

      {/* Toggle settings */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div
          className="flex items-center gap-3 border-b border-gray-100 px-5 py-4"
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${ACCENT}18` }}
          >
            <ToggleRight className="h-4 w-4" style={{ color: ACCENT }} strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Feature Flags</p>
            <p className="text-xs text-gray-400 mt-0.5">Toggle system features on or off.</p>
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {TOGGLE_SETTINGS.map(({ key, icon: Icon, title, description }) => {
            const setting = getSetting(key);
            const isOn = setting?.value === 'true';
            const isSaving = saving === key;
            return (
              <div key={key} className="flex items-start justify-between gap-4 px-5 py-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                    style={{ backgroundColor: `${ACCENT}12` }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: ACCENT }} strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 pt-0.5">
                  {loading ? (
                    <div className="h-6 w-11 animate-pulse rounded-full bg-gray-200" />
                  ) : (
                    <>
                      <span className="text-xs font-medium" style={{ color: isOn ? ACCENT : '#9CA3AF' }}>
                        {isOn ? 'ON' : 'OFF'}
                      </span>
                      <Toggle
                        checked={isOn}
                        onChange={(v) => handleUpdate(key, String(v))}
                        disabled={isSaving}
                      />
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Academic Calendar */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${ACCENT}18` }}
          >
            <CalendarDays className="h-4 w-4" style={{ color: ACCENT }} strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Academic Calendar</p>
            <p className="text-xs text-gray-400 mt-0.5">Controls the semester and year used for FYP ID generation.</p>
          </div>
        </div>
        <div className="px-5 py-4 space-y-4">
          {loading ? (
            <div className="space-y-3">
              <div className="h-10 w-48 animate-pulse rounded-lg bg-gray-200" />
              <div className="h-10 w-48 animate-pulse rounded-lg bg-gray-200" />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Current Semester
                  </label>
                  <select
                    value={getSetting('current_semester')?.value ?? 'AUTO'}
                    onChange={(e) => handleUpdate('current_semester', e.target.value)}
                    disabled={saving === 'current_semester'}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-indigo-400 focus:bg-white focus:outline-none disabled:opacity-50"
                  >
                    <option value="AUTO">AUTO</option>
                    <option value="FALL">FALL</option>
                    <option value="SPRING">SPRING</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Current Year
                  </label>
                  <input
                    type="text"
                    value={yearInput}
                    onChange={(e) => setYearInput(e.target.value)}
                    onBlur={() => handleUpdate('current_year', yearInput)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate('current_year', yearInput); }}
                    disabled={saving === 'current_year'}
                    placeholder="AUTO or 2026"
                    className="w-32 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-indigo-400 focus:bg-white focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>
              {(() => {
                const semVal = getSetting('current_semester')?.value;
                const now = new Date();
                const month = now.getMonth() + 1;
                const semester =
                  semVal === 'FALL' || semVal === 'SPRING'
                    ? semVal
                    : month >= 8 ? 'FALL' : 'SPRING';
                const parsed = yearInput && yearInput !== 'AUTO' ? parseInt(yearInput, 10) : NaN;
                const year = isNaN(parsed) ? now.getFullYear() : parsed;
                return (
                  <p className="text-xs text-gray-500">
                    Currently resolves to:{' '}
                    <span className="font-semibold text-gray-700">{semester} {year}</span>
                  </p>
                );
              })()}
            </>
          )}
        </div>
      </div>

      {/* FYP Phase */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${ACCENT}18` }}
          >
            <GraduationCap className="h-4 w-4" style={{ color: ACCENT }} strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Academic Phase</p>
            <p className="text-xs text-gray-400 mt-0.5">Set the current FYP phase for the system.</p>
          </div>
        </div>
        <div className="px-5 py-4">
          {loading ? (
            <div className="h-10 w-48 animate-pulse rounded-lg bg-gray-200" />
          ) : (
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Current FYP Phase
                </label>
                <select
                  value={getSetting('fyp_phase')?.value ?? 'FYP_1'}
                  onChange={(e) => handleUpdate('fyp_phase', e.target.value)}
                  disabled={saving === 'fyp_phase'}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-indigo-400 focus:bg-white focus:outline-none disabled:opacity-50"
                >
                  <option value="FYP_1">FYP 1</option>
                  <option value="FYP_2">FYP 2</option>
                </select>
              </div>
              {saving === 'fyp_phase' && (
                <span className="text-xs text-gray-400 mt-4">Saving…</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
