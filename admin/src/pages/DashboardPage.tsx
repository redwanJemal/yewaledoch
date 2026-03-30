import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Users,
  FileText,
  MessageSquare,
  Activity,
  FileEdit,
  Flag,
  Zap,
  Send,
} from 'lucide-react';
import { useState } from 'react';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: adminApi.dashboard,
    refetchInterval: 30000,
  });

  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [showBroadcast, setShowBroadcast] = useState(false);

  const scraperMutation = useMutation({
    mutationFn: adminApi.triggerScraper,
    onSuccess: (data) => toast.success(data.message),
    onError: (err: Error) => toast.error(err.message),
  });

  const broadcastMutation = useMutation({
    mutationFn: () => adminApi.broadcast(broadcastTitle, broadcastBody),
    onSuccess: (data) => {
      toast.success(data.message);
      setBroadcastTitle('');
      setBroadcastBody('');
      setShowBroadcast(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Users', value: stats?.total_users ?? 0, icon: Users, color: 'bg-blue-500' },
    { label: 'Total Posts', value: stats?.total_posts ?? 0, icon: FileText, color: 'bg-green-500' },
    { label: 'Total Comments', value: stats?.total_comments ?? 0, icon: MessageSquare, color: 'bg-purple-500' },
    { label: 'Active Today', value: stats?.active_users_24h ?? 0, icon: Activity, color: 'bg-orange-500' },
    { label: 'New Users Today', value: stats?.new_users_today ?? 0, icon: Users, color: 'bg-cyan-500' },
    { label: 'Posts Today', value: stats?.posts_today ?? 0, icon: FileText, color: 'bg-emerald-500' },
    { label: 'Pending Drafts', value: stats?.pending_drafts ?? 0, icon: FileEdit, color: 'bg-amber-500' },
    { label: 'Pending Reports', value: stats?.pending_reports ?? 0, icon: Flag, color: 'bg-red-500' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className={`${color} p-2 rounded-lg`}>
                <Icon size={20} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => scraperMutation.mutate()}
            disabled={scraperMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            <Zap size={16} />
            {scraperMutation.isPending ? 'Running...' : 'Run Scraper'}
          </button>
          <button
            onClick={() => setShowBroadcast(!showBroadcast)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            <Send size={16} />
            Broadcast Message
          </button>
        </div>

        {showBroadcast && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
            <input
              type="text"
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              placeholder="Notification title"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <textarea
              value={broadcastBody}
              onChange={(e) => setBroadcastBody(e.target.value)}
              placeholder="Notification message"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
            <button
              onClick={() => broadcastMutation.mutate()}
              disabled={broadcastMutation.isPending || !broadcastTitle.trim() || !broadcastBody.trim()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {broadcastMutation.isPending ? 'Sending...' : 'Send Broadcast'}
            </button>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Today's Activity</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">New Users</span>
              <span className="text-sm font-semibold text-gray-900">{stats?.new_users_today ?? 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Posts Published</span>
              <span className="text-sm font-semibold text-gray-900">{stats?.posts_today ?? 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Comments</span>
              <span className="text-sm font-semibold text-gray-900">{stats?.comments_today ?? 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Active Users (24h)</span>
              <span className="text-sm font-semibold text-gray-900">{stats?.active_users_24h ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Action Required</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pending Drafts</span>
              <span className={`text-sm font-semibold ${(stats?.pending_drafts ?? 0) > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
                {stats?.pending_drafts ?? 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pending Reports</span>
              <span className={`text-sm font-semibold ${(stats?.pending_reports ?? 0) > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {stats?.pending_reports ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
