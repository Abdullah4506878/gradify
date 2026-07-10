'use client';

import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  User,
  FileText,
  Code2,
  Link,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/api';

const navItems = [
  { label: 'Dashboard', href: '/dashboard/student', icon: LayoutDashboard },
  { label: 'My Group', href: '/dashboard/student/group', icon: Users },
  { label: 'Tasks', href: '/dashboard/student/tasks', icon: ClipboardList },
  { label: 'Minutes of Meeting', href: '/dashboard/student/mom', icon: FileText },
  { label: 'Profile', href: '/dashboard/student/profile', icon: User },
];

interface UserProfile {
  id: number;
  name: string | null;
  email: string;
  role: string;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
}

export default function StudentProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await api.get<UserProfile>('/users/me');
        setProfile(res.data);
        setName(res.data.name ?? '');
        setGithubUrl(res.data.githubUrl ?? '');
        setLinkedinUrl(res.data.linkedinUrl ?? '');
      } catch {
        // keep null on failure
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await api.patch<UserProfile>('/users/profile', {
        name: name.trim() || null,
        githubUrl: githubUrl.trim() || null,
        linkedinUrl: linkedinUrl.trim() || null,
      });
      setProfile(res.data);
      setGithubUrl(res.data.githubUrl ?? '');
      setLinkedinUrl(res.data.linkedinUrl ?? '');
      setSaveMessage({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSaveMessage({ type: 'error', text: typeof msg === 'string' ? msg : 'Failed to update profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const displayName = profile?.name ?? profile?.email ?? '';
  const initial = displayName.charAt(0).toUpperCase();
  const missingLinks = !loading && (!profile?.githubUrl || !profile?.linkedinUrl);

  return (
    <DashboardLayout navItems={navItems}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your account information</p>
      </div>

      <div className="max-w-lg space-y-5">
        {/* Warning banner */}
        {missingLinks && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" strokeWidth={1.75} />
            <p className="text-sm text-amber-700">
              Add your <span className="font-semibold">GitHub & LinkedIn</span> URLs to submit supervisor preferences.
            </p>
          </div>
        )}

        {/* Profile card */}
        <Card className="border-gray-200 shadow-none">
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center gap-5">
                <div className="h-16 w-16 animate-pulse rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
                  <div className="h-3.5 w-2/3 animate-pulse rounded bg-gray-200" />
                  <div className="h-5 w-20 animate-pulse rounded-full bg-gray-200" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 shrink-0">
                  <span className="text-2xl font-bold text-green-600">{initial}</span>
                </div>
                <div>
                  <p className="text-base font-semibold text-gray-900">
                    {profile?.name ?? <span className="text-gray-400 italic">No name set</span>}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">{profile?.email}</p>
                  <span className="mt-2 inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    Student
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit form */}
        <Card className="border-gray-200 shadow-none">
          <CardContent className="pt-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Edit Profile</h2>
            <form onSubmit={handleSave} className="space-y-4">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name
                </label>
                {loading ? (
                  <div className="h-10 animate-pulse rounded-lg bg-gray-200" />
                ) : (
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                )}
              </div>

              {/* Email (readonly) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                {loading ? (
                  <div className="h-10 animate-pulse rounded-lg bg-gray-200" />
                ) : (
                  <input
                    type="email"
                    value={profile?.email ?? ''}
                    disabled
                    className="w-full rounded-lg border border-gray-100 bg-gray-100 px-3.5 py-2.5 text-sm text-gray-400 cursor-not-allowed"
                  />
                )}
                <p className="mt-1 text-xs text-gray-400">Email cannot be changed.</p>
              </div>

              {/* GitHub URL */}
              <div>
                <label htmlFor="githubUrl" className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Code2 className="h-3.5 w-3.5 text-gray-500" strokeWidth={1.75} />
                  GitHub Profile URL
                </label>
                {loading ? (
                  <div className="h-10 animate-pulse rounded-lg bg-gray-200" />
                ) : (
                  <input
                    id="githubUrl"
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/yourusername"
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                )}
                <p className="mt-1 text-xs text-gray-400">Must start with https://github.com/</p>
              </div>

              {/* LinkedIn URL */}
              <div>
                <label htmlFor="linkedinUrl" className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Link className="h-3.5 w-3.5 text-blue-500" strokeWidth={1.75} />
                  LinkedIn Profile URL
                </label>
                {loading ? (
                  <div className="h-10 animate-pulse rounded-lg bg-gray-200" />
                ) : (
                  <input
                    id="linkedinUrl"
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/yourusername"
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                )}
                <p className="mt-1 text-xs text-gray-400">Must start with https://linkedin.com/in/</p>
              </div>

              {saveMessage && (
                <div
                  className={`rounded-lg px-4 py-3 text-sm ${
                    saveMessage.type === 'success'
                      ? 'bg-green-50 border border-green-100 text-green-700'
                      : 'bg-red-50 border border-red-100 text-red-700'
                  }`}
                >
                  {saveMessage.text}
                </div>
              )}

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={saving || loading}
                  className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
