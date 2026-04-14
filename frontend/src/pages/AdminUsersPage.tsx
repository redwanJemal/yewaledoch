/**
 * Admin users management — list, search, change role, ban/unban.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Search, ChevronDown, Ban, ShieldCheck } from 'lucide-react';
import { adminApi, type AdminUser } from '@/lib/api';

const ROLES = ['reader', 'member', 'contributor', 'expert', 'admin'];
const ROLE_COLORS: Record<string, string> = {
  admin:       'bg-purple-500/15 text-purple-600',
  expert:      'bg-blue-500/15 text-blue-600',
  contributor: 'bg-green-500/15 text-green-600',
  member:      'bg-tg-button/10 text-tg-button',
  reader:      'bg-tg-hint/10 text-tg-hint',
};

interface Props { onBack: () => void }

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86_400_000);
  if (d < 1) return 'Today';
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

export function AdminUsersPage({ onBack }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, roleFilter, search],
    queryFn: () => adminApi.users({ page, per_page: 20, role: roleFilter || undefined, search: search || undefined }),
    placeholderData: (prev) => prev,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-users'] });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      adminApi.updateUserRole(userId, role),
    onSuccess: invalidate,
  });

  const banMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      adminApi.banUser(userId, reason),
    onSuccess: () => { invalidate(); setBanTarget(null); setBanReason(''); },
  });

  const unbanMutation = useMutation({
    mutationFn: (userId: string) => adminApi.unbanUser(userId),
    onSuccess: invalidate,
  });

  const users = data?.items ?? [];

  return (
    <div className="min-h-screen bg-tg-bg">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="sticky top-0 bg-tg-bg/95 backdrop-blur z-10 px-4 pt-4 pb-3 border-b border-tg-hint/10">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-tg-hint hover:bg-tg-secondary-bg">
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-lg font-bold text-tg-text flex-1">Users</h2>
            {data && <span className="text-xs text-tg-hint">{data.total} total</span>}
          </div>

          {/* Search + role filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tg-hint" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search name or username…"
                className="w-full bg-tg-secondary-bg rounded-xl pl-8 pr-3 py-2 text-sm text-tg-text placeholder-tg-hint focus:outline-none"
              />
            </div>
            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                className="appearance-none bg-tg-secondary-bg rounded-xl px-3 py-2 pr-7 text-sm text-tg-text focus:outline-none"
              >
                <option value="">All roles</option>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-tg-hint pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="px-4 py-3 space-y-2 pb-24">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-tg-secondary-bg rounded-2xl animate-pulse" />
            ))
          ) : users.length === 0 ? (
            <div className="py-16 text-center text-tg-hint">
              <p className="text-4xl mb-3">👥</p>
              <p className="text-sm">No users found</p>
            </div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="bg-tg-secondary-bg rounded-2xl px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-tg-text">
                        {[user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || `User ${user.telegram_id}`}
                      </span>
                      {user.username && (
                        <span className="text-xs text-tg-hint">@{user.username}</span>
                      )}
                      {user.is_banned && (
                        <span className="px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-500 text-[10px] font-medium">Banned</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${ROLE_COLORS[user.role] ?? 'bg-tg-hint/10 text-tg-hint'}`}>
                        {user.role}
                      </span>
                      <span className="text-[11px] text-tg-hint">
                        {user.post_count}p · {user.comment_count}c · {timeAgo(user.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Role selector */}
                    {user.role !== 'admin' && (
                      <div className="relative">
                        <select
                          value={user.role}
                          onChange={(e) => roleMutation.mutate({ userId: user.id, role: e.target.value })}
                          disabled={roleMutation.isPending}
                          className="appearance-none bg-tg-bg border border-tg-hint/20 rounded-lg px-2 py-1 pr-5 text-xs text-tg-text focus:outline-none disabled:opacity-50"
                        >
                          {ROLES.filter((r) => r !== 'admin').map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                        <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-tg-hint pointer-events-none" />
                      </div>
                    )}

                    {/* Ban / Unban */}
                    {user.role !== 'admin' && (
                      user.is_banned ? (
                        <button
                          onClick={() => unbanMutation.mutate(user.id)}
                          disabled={unbanMutation.isPending}
                          className="p-1.5 rounded-lg bg-green-500/10 text-green-600 disabled:opacity-40"
                          title="Unban"
                        >
                          <ShieldCheck size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => setBanTarget(user)}
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-500"
                          title="Ban"
                        >
                          <Ban size={14} />
                        </button>
                      )
                    )}
                  </div>
                </div>
                {user.is_banned && user.ban_reason && (
                  <p className="text-[11px] text-red-400 mt-1.5 pl-0">Reason: {user.ban_reason}</p>
                )}
              </div>
            ))
          )}

          {/* Pagination */}
          {data && data.total > 20 && (
            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-tg-secondary-bg rounded-xl text-sm text-tg-text disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-xs text-tg-hint">
                {page} / {Math.ceil(data.total / 20)}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!data.has_more}
                className="px-4 py-2 bg-tg-secondary-bg rounded-xl text-sm text-tg-text disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Ban modal */}
      {banTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
          <div className="bg-tg-secondary-bg rounded-2xl w-full max-w-sm p-5 space-y-4">
            <h3 className="text-base font-bold text-tg-text">Ban User</h3>
            <p className="text-sm text-tg-hint">
              Banning {banTarget.first_name || banTarget.username || 'this user'}. They will be unable to use the app.
            </p>
            <textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Reason for ban…"
              rows={3}
              className="w-full bg-tg-bg rounded-xl px-3 py-2 text-sm text-tg-text border border-tg-hint/20 focus:outline-none resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setBanTarget(null); setBanReason(''); }}
                className="flex-1 py-2.5 bg-tg-bg rounded-xl text-sm text-tg-text"
              >
                Cancel
              </button>
              <button
                onClick={() => banMutation.mutate({ userId: banTarget.id, reason: banReason })}
                disabled={!banReason.trim() || banMutation.isPending}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {banMutation.isPending ? 'Banning…' : 'Ban User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
