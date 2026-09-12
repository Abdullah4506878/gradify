'use client';

import { useEffect, useState } from 'react';
import { Megaphone, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const ACCENT = '#7C6FF7';

interface Announcement {
  id: number;
  title: string;
  message: string;
  isActive: boolean;
  createdAt: string;
  admin: { id: number; name: string | null; email: string };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    api.get<Announcement[]>('/admin/announcements')
      .then((res) => setAnnouncements(res.data))
      .catch(() => setAnnouncements([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setTitle('');
    setMessage('');
    setFormError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !message.trim()) {
      setFormError('Title and Message are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const r = await api.post<Announcement>('/admin/announcements', {
        title: title.trim(),
        message: message.trim(),
      });
      setAnnouncements((prev) => [r.data, ...prev]);
      setDialogOpen(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(typeof msg === 'string' ? msg : 'Failed to create announcement.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (a: Announcement) => {
    setTogglingId(a.id);
    try {
      const r = await api.patch<Announcement>(`/admin/announcements/${a.id}/toggle`);
      setAnnouncements((prev) => prev.map((x) => (x.id === a.id ? { ...x, isActive: r.data.isActive } : x)));
    } catch {
      // silent
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/announcements/${deleteTarget.id}`);
      setAnnouncements((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      // keep dialog open on failure
    } finally {
      setDeleting(false);
    }
  };

  const Skeleton = ({ className }: { className: string }) => (
    <div className={`animate-pulse rounded bg-gray-200 ${className}`} />
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Announcements</h1>
          <p className="mt-1 text-sm text-gray-500">Broadcast notices to managers, supervisors and students.</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors shrink-0"
          style={{ backgroundColor: ACCENT }}
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          New Announcement
        </button>
      </div>

      {/* List */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
          <Megaphone className="h-4 w-4 text-gray-400" strokeWidth={1.75} />
          <h2 className="text-sm font-semibold text-gray-900">All Announcements</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-5 py-4 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))
          ) : announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl mb-4"
                style={{ backgroundColor: `${ACCENT}18` }}
              >
                <Megaphone className="h-7 w-7" style={{ color: ACCENT }} strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold text-gray-700">No announcements yet</p>
              <p className="mt-1.5 text-xs text-gray-400 max-w-xs text-center">
                Create one to broadcast a notice across all manager, supervisor, and student dashboards.
              </p>
            </div>
          ) : (
            announcements.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${a.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {a.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{a.message}</p>
                  <p className="mt-1.5 text-xs text-gray-400">
                    By {a.admin?.name ?? a.admin?.email ?? 'Admin'} · {formatDate(a.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(a)}
                    disabled={togglingId === a.id}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-50"
                    title={a.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {a.isActive
                      ? <ToggleRight className="h-4 w-4" style={{ color: ACCENT }} strokeWidth={1.75} />
                      : <ToggleLeft className="h-4 w-4" strokeWidth={1.75} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(a)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>New Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && (
              <p className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">{formError}</p>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm focus:border-indigo-400 focus:bg-white focus:outline-none"
                placeholder="e.g. Scheduled maintenance tonight"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Message <span className="text-red-500">*</span></label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={2000}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm focus:border-indigo-400 focus:bg-white focus:outline-none resize-none"
                placeholder="Details for everyone viewing their dashboard…"
              />
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDialogOpen(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60"
              style={{ backgroundColor: ACCENT }}
            >
              {saving ? 'Publishing…' : 'Publish'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete Announcement</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            Are you sure you want to delete <span className="font-medium text-gray-900">{deleteTarget?.title}</span>? This cannot be undone.
          </p>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-60"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
