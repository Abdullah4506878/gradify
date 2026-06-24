'use client';

import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FolderOpen,
  BarChart,
  User,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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

interface Me {
  id: number;
  name: string | null;
  email: string;
  role: string;
}

export default function ManagerProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Me>('/users/me')
      .then((res) => {
        setMe(res.data);
        setName(res.data.name ?? '');
      })
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  }, []);

  const handleSave = async () => {
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      const res = await api.patch<Me>('/users/me', { name: name.trim() });
      setMe(res.data);
      setName(res.data.name ?? '');
      setSuccess(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const initial = (me?.name ?? me?.email ?? '?').charAt(0).toUpperCase();

  return (
    <DashboardLayout navItems={navItems}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your account details</p>
      </div>

      {loadingProfile ? (
        <div className="max-w-lg space-y-5">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 animate-pulse rounded-full bg-gray-200 shrink-0" />
            <div className="space-y-2">
              <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-56 animate-pulse rounded bg-gray-200" />
              <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-lg space-y-6">
          {/* Avatar + identity */}
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 shrink-0">
              <span className="text-2xl font-bold text-indigo-600">{initial}</span>
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {me?.name ?? <span className="italic text-gray-400">No name set</span>}
              </p>
              <p className="text-sm text-gray-500">{me?.email}</p>
              <span className="mt-1.5 inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                Manager
              </span>
            </div>
          </div>

          {/* Edit form */}
          <Card className="border-gray-200 shadow-none">
            <CardContent className="pt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSuccess(false);
                    setError(null);
                  }}
                  placeholder="Enter your full name"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="text"
                  value={me?.email ?? ''}
                  disabled
                  className="w-full rounded-lg border border-gray-100 bg-gray-100 px-3.5 py-2.5 text-sm text-gray-500 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-400">Email cannot be changed.</p>
              </div>

              {success && (
                <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
                  Profile updated successfully.
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
