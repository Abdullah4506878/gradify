'use client';

import { useEffect, useState } from 'react';
import { Settings, Eye, Monitor, ClipboardList } from 'lucide-react';
import api from '@/lib/api';


interface SystemSetting {
  id: number;
  key: string;
  value: string;
  label: string;
}

type Toast = { type: 'success' | 'error'; text: string };

const TOGGLE_SETTINGS = [
  {
    key: 'show_supervisor_to_student',
    icon: Eye,
    title: 'Show supervisor to students',
    description: 'When enabled, students can see their submitted supervisor preferences.',
  },
  {
    key: 'show_group_to_supervisor',
    icon: Monitor,
    title: 'Show groups to supervisor',
    description: 'When enabled, supervisors can see groups assigned to them.',
  },
];

const TASK_SETTINGS = [
  { key: 'task_total_marks', label: 'Total Task Marks', defaultValue: '15', min: 1, max: 100 },
  { key: 'task_max_per_group', label: 'Max Tasks Per Group', defaultValue: '16', min: 1, max: 100 },
];

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
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ backgroundColor: checked ? '#4F46E5' : '#D1D5DB' }}
    >
      <span
        className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? 'translateX(1.375rem)' : 'translateX(0.125rem)' }}
      />
    </button>
  );
}

export default function ManagerSettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [taskDrafts, setTaskDrafts] = useState<Record<string, string>>({});

  const showToast = (t: Toast) => {
    setToast(t);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    api.get<SystemSetting[]>('/admin/settings')
      .then((res) => {
        setSettings(res.data);
        const drafts: Record<string, string> = {};
        for (const { key, defaultValue } of TASK_SETTINGS) {
          const found = res.data.find((s) => s.key === key);
          drafts[key] = found?.value ?? defaultValue;
        }
        setTaskDrafts(drafts);
      })
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

  const handleTaskSave = async (key: string) => {
    const draft = taskDrafts[key];
    const config = TASK_SETTINGS.find((s) => s.key === key);
    if (!config) return;

    const num = parseInt(draft, 10);
    if (isNaN(num) || num < config.min || num > config.max) {
      showToast({ type: 'error', text: `Enter a value between ${config.min} and ${config.max}.` });
      return;
    }

    await handleUpdate(key, String(num));
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage visibility settings for students and supervisors.</p>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`mb-5 rounded-lg border px-4 py-3 text-sm font-medium ${
            toast.type === 'success'
              ? 'border-green-100 bg-green-50 text-green-700'
              : 'border-red-100 bg-red-50 text-red-700'
          }`}
        >
          {toast.text}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden max-w-2xl">
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
            <Settings className="h-4 w-4 text-indigo-600" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Visibility Controls</p>
            <p className="text-xs text-gray-400 mt-0.5">Control what students and supervisors can see.</p>
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
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-50">
                    <Icon className="h-3.5 w-3.5 text-indigo-600" strokeWidth={1.75} />
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
                      <span className={`text-xs font-medium ${isOn ? 'text-indigo-600' : 'text-gray-400'}`}>
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

      <div className="mt-6 rounded-xl border border-gray-200 bg-white overflow-hidden max-w-2xl">
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
            <ClipboardList className="h-4 w-4 text-indigo-600" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Task Configuration</p>
            <p className="text-xs text-gray-400 mt-0.5">Configure scoring and task limits for groups.</p>
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {TASK_SETTINGS.map(({ key, label, defaultValue, min, max }) => {
            const setting = getSetting(key);
            const value = taskDrafts[key] ?? setting?.value ?? defaultValue;
            const isSaving = saving === key;
            return (
              <div key={key} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Range: {min}–{max}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {loading ? (
                    <div className="h-9 w-20 animate-pulse rounded-lg bg-gray-200" />
                  ) : (
                    <>
                      <input
                        type="number"
                        min={min}
                        max={max}
                        value={value}
                        onChange={(e) => setTaskDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
                        className="w-20 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => handleTaskSave(key)}
                        disabled={isSaving}
                        className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors"
                      >
                        {isSaving ? 'Saving…' : 'Save'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
