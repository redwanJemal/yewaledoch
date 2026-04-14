import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Shield,
  Ban,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  X,
  BadgeCheck,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import type { AdminUser } from '@/lib/api';
import { toast } from 'sonner';

const ROLES = ['', 'reader', 'member', 'contributor', 'expert', 'admin'];

export default function UserManagementPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState('');
  const [showBanModal, setShowBanModal] = useState(false);
  const [banUserId, setBanUserId] = useState<string | null>(null);
  const [showExpertModal, setShowExpertModal] = useState(false);
  const [expertUserId, setExpertUserId] = useState<string | null>(null);
  const [expertSpecialty, setExpertSpecialty] = useState('');
  const [expertBio, setExpertBio] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search, roleFilter],
    queryFn: () => adminApi.users({
      page,
      per_page: 20,
      search: search || undefined,
      role: roleFilter || undefined,
    }),
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      adminApi.updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Role updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const banMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      adminApi.banUser(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User banned');
      setShowBanModal(false);
      setBanReason('');
      setBanUserId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const unbanMutation = useMutation({
    mutationFn: adminApi.unbanUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User unbanned');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const verifyExpertMutation = useMutation({
    mutationFn: ({ userId, specialty, bio }: { userId: string; specialty: string; bio: string }) =>
      adminApi.verifyExpert(userId, specialty, bio || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Expert verified');
      setShowExpertModal(false);
      setExpertSpecialty('');
      setExpertBio('');
      setExpertUserId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const revokeExpertMutation = useMutation({
    mutationFn: adminApi.revokeExpert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Expert status revoked');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const openBanModal = (userId: string) => {
    setBanUserId(userId);
    setBanReason('');
    setShowBanModal(true);
  };

  const handleBan = () => {
    if (banUserId && banReason.trim()) {
      banMutation.mutate({ userId: banUserId, reason: banReason.trim() });
    }
  };

  const openExpertModal = (userId: string) => {
    setExpertUserId(userId);
    setExpertSpecialty('');
    setExpertBio('');
    setShowExpertModal(true);
  };

  const handleVerifyExpert = () => {
    if (expertUserId && expertSpecialty.trim()) {
      verifyExpertMutation.mutate({ userId: expertUserId, specialty: expertSpecialty.trim(), bio: expertBio.trim() });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">User Management</h2>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </form>

        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Roles</option>
          {ROLES.filter(Boolean).map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : !data?.items.length ? (
        <div className="text-center py-16 text-gray-500">No users found</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Username</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Posts</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Comments</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Reputation</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Joined</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedUser(selectedUser?.id === user.id ? null : user)}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {user.first_name} {user.last_name || ''}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {user.username ? `@${user.username}` : '-'}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={user.role}
                        onChange={(e) => roleMutation.mutate({ userId: user.id, role: e.target.value })}
                        className="px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {ROLES.filter(Boolean).map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.post_count}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.comment_count}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.reputation}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {user.is_banned ? (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Banned</span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {user.expert_verified ? (
                          <button
                            onClick={() => revokeExpertMutation.mutate(user.id)}
                            className="p-1.5 text-blue-500 hover:text-gray-400 hover:bg-gray-50 rounded"
                            title="Revoke Expert"
                          >
                            <BadgeCheck size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => openExpertModal(user.id)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Verify as Expert"
                          >
                            <BadgeCheck size={16} />
                          </button>
                        )}
                        {user.is_banned ? (
                          <button
                            onClick={() => unbanMutation.mutate(user.id)}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                            title="Unban"
                          >
                            <UserCheck size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => openBanModal(user.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Ban"
                          >
                            <Ban size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.total > 20 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Page {data.page} of {Math.ceil(data.total / data.per_page)} ({data.total} total)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!data.has_more}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* User detail modal */}
      {selectedUser && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">User Details</h3>
            <button onClick={() => setSelectedUser(null)} className="p-1 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Name</p>
              <p className="font-medium">{selectedUser.first_name} {selectedUser.last_name || ''}</p>
            </div>
            <div>
              <p className="text-gray-500">Username</p>
              <p className="font-medium">{selectedUser.username ? `@${selectedUser.username}` : '-'}</p>
            </div>
            <div>
              <p className="text-gray-500">Telegram ID</p>
              <p className="font-medium">{selectedUser.telegram_id}</p>
            </div>
            <div>
              <p className="text-gray-500">Role</p>
              <p className="font-medium flex items-center gap-1"><Shield size={14} /> {selectedUser.role}</p>
            </div>
            <div>
              <p className="text-gray-500">Posts</p>
              <p className="font-medium">{selectedUser.post_count}</p>
            </div>
            <div>
              <p className="text-gray-500">Comments</p>
              <p className="font-medium">{selectedUser.comment_count}</p>
            </div>
            <div>
              <p className="text-gray-500">Reputation</p>
              <p className="font-medium">{selectedUser.reputation}</p>
            </div>
            <div>
              <p className="text-gray-500">Joined</p>
              <p className="font-medium">{new Date(selectedUser.created_at).toLocaleDateString()}</p>
            </div>
            {selectedUser.expert_verified && (
              <div className="col-span-2 md:col-span-4 flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                <BadgeCheck size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-700">Verified Expert — {selectedUser.expert_specialty}</p>
                  {selectedUser.expert_bio && <p className="text-xs text-blue-600 mt-0.5">{selectedUser.expert_bio}</p>}
                </div>
              </div>
            )}
            {selectedUser.is_banned && selectedUser.ban_reason && (
              <div className="col-span-2 md:col-span-4">
                <p className="text-gray-500">Ban Reason</p>
                <p className="font-medium text-red-600">{selectedUser.ban_reason}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expert verification modal */}
      {showExpertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Verify as Expert</h3>
            <p className="text-sm text-gray-500 mb-4">This will set the user's role to <strong>expert</strong> and display a verified badge.</p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Specialty *</label>
                <input
                  type="text"
                  value={expertSpecialty}
                  onChange={(e) => setExpertSpecialty(e.target.value)}
                  placeholder="e.g. Pediatrician, Psychiatrist, Nutritionist..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Short bio (optional)</label>
                <textarea
                  value={expertBio}
                  onChange={(e) => setExpertBio(e.target.value)}
                  placeholder="Brief professional description shown on profile..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowExpertModal(false); setExpertUserId(null); }}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyExpert}
                disabled={verifyExpertMutation.isPending || !expertSpecialty.trim()}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <BadgeCheck size={14} />
                {verifyExpertMutation.isPending ? 'Verifying...' : 'Verify Expert'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban modal */}
      {showBanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ban User</h3>
            <textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Reason for ban..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowBanModal(false); setBanUserId(null); }}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleBan}
                disabled={banMutation.isPending || !banReason.trim()}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {banMutation.isPending ? 'Banning...' : 'Ban User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
