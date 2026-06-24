'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FolderOpen,
  BarChart,
  User,
  ArrowLeft,
  RefreshCw,
  Copy,
  Check,
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

function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '@#$!';
  const all = upper + lower + digits + special;
  const rand = (s: string) => s[Math.floor(Math.random() * s.length)];
  const base = Array.from({ length: 7 }, () => rand(all)).join('');
  return rand(upper) + rand(digits) + rand(special) + base;
}

export default function AddSupervisorPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(generatePassword);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [success, setSuccess] = useState<{ email: string; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(password).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) {
      setError('Full Name and Email are required.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await api.post('/users', {
        name: name.trim(),
        email: email.trim(),
        password,
        role: 'SUPERVISOR',
        universityId: 1,
      });
      setSuccess({ email: email.trim(), password });
      setName('');
      setEmail('');
      setPassword(generatePassword());
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Failed to add supervisor. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout navItems={navItems}>
      {/* Back link + header */}
      <div className="mb-6">
        <Link
          href="/dashboard/manager/supervisors"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Back to Supervisors
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Add Supervisor</h1>
        <p className="mt-1 text-sm text-gray-500">Register a new supervisor account</p>
      </div>

      <div className="max-w-lg space-y-5">
        {/* Success banner */}
        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4">
            <p className="text-sm font-semibold text-green-800 mb-2">Supervisor added successfully!</p>
            <p className="text-sm text-green-700">Share these credentials with the supervisor:</p>
            <div className="mt-3 space-y-1 font-mono text-sm text-green-900 bg-green-100 rounded-lg px-4 py-3">
              <p><span className="text-green-600">Email: </span>{success.email}</p>
              <p><span className="text-green-600">Password: </span>{success.password}</p>
            </div>
            <button
              type="button"
              onClick={() => setSuccess(null)}
              className="mt-3 text-xs text-green-700 underline hover:text-green-900"
            >
              Add another supervisor
            </button>
          </div>
        )}

        {!success && (
          <Card className="border-gray-200 shadow-none">
            <CardContent className="pt-6 space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(null); }}
                  placeholder="e.g. Dr. Sara Khan"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Institutional Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  placeholder="e.g. sara.khan@superior.edu.pk"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={password}
                    readOnly
                    className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-mono text-gray-900 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    title="Copy password"
                    className="flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" strokeWidth={1.75} />
                    ) : (
                      <Copy className="h-4 w-4" strokeWidth={1.75} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPassword(generatePassword())}
                    title="Regenerate password"
                    className="flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-400">Auto-generated. Share this with the supervisor after creation.</p>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <Link
                  href="/dashboard/manager/supervisors"
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Adding…' : 'Add Supervisor'}
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
