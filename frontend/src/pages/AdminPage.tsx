/**
 * Admin hub — entry point for all admin operations.
 * Gated on role=admin (checked in App.tsx before rendering).
 * Optimised for Telegram desktop (wider viewports).
 */
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  LayoutDashboard, FileEdit, Settings2, Rss,
  Users, Flag, ChevronRight, RefreshCw, CheckCircle,
} from 'lucide-react';
import { adminApi, type DashboardStats } from '@/lib/api';
import type { User } from '@/lib/api';

interface Props {
  user: User;
  onNavigate: (page: string) => void;
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ${accent ? 'bg-tg-button/10 border border-tg-button/20' : 'bg-tg-secondary-bg'}`}>
      <p className={`text-2xl font-bold ${accent ? 'text-tg-button' : 'text-tg-text'}`}>{value}</p>
      <p className="text-xs text-tg-hint mt-0.5">{label}</p>
    </div>
  );
}

function NavCard({ icon: Icon, label, badge, onClick }: {
  icon: React.ElementType;
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full bg-tg-secondary-bg rounded-2xl px-4 py-3.5 text-left hover:bg-tg-secondary-bg/80 active:scale-[0.98] transition-all"
    >
      <div className="w-9 h-9 rounded-xl bg-tg-button/10 flex items-center justify-center shrink-0">
        <Icon size={18} className="text-tg-button" />
      </div>
      <span className="flex-1 text-sm font-medium text-tg-text">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="min-w-[22px] h-[22px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      <ChevronRight size={16} className="text-tg-hint" />
    </button>
  );
}

export function AdminPage({ user, onNavigate }: Props) {
  const { data: stats, isLoading, refetch } = useQuery<DashboardStats>({
    queryKey: ['admin-dashboard'],
    queryFn: adminApi.dashboard,
    refetchInterval: 30_000,
  });

  const scraperMutation = useMutation({
    mutationFn: adminApi.triggerScraper,
  });

  return (
    <div className="min-h-screen bg-tg-bg">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-tg-text">Admin</h1>
            <p className="text-xs text-tg-hint mt-0.5">
              {user.first_name || user.username || 'Admin'}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl text-tg-hint hover:text-tg-text hover:bg-tg-secondary-bg transition-colors"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {/* Stats grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-tg-secondary-bg rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Users" value={stats.total_users} />
            <StatCard label="Published Posts" value={stats.total_posts} />
            <StatCard label="Pending Drafts" value={stats.pending_drafts} accent={stats.pending_drafts > 0} />
            <StatCard label="Pending Reports" value={stats.pending_reports} accent={stats.pending_reports > 0} />
          </div>
        )}

        {/* Today row */}
        {stats && (
          <div className="flex gap-3 text-center">
            {[
              { label: 'New users', value: stats.new_users_today },
              { label: 'Posts today', value: stats.posts_today },
              { label: 'Comments', value: stats.comments_today },
            ].map(({ label, value }) => (
              <div key={label} className="flex-1 bg-tg-secondary-bg rounded-xl py-2">
                <p className="text-lg font-semibold text-tg-text">{value}</p>
                <p className="text-[11px] text-tg-hint">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="space-y-2">
          <NavCard
            icon={FileEdit}
            label="Draft Queue"
            badge={stats?.pending_drafts}
            onClick={() => onNavigate('admin-drafts')}
          />
          <NavCard icon={LayoutDashboard} label="Content" onClick={() => onNavigate('admin-content')} />
          <NavCard icon={Users} label="Users" onClick={() => onNavigate('admin-users')} />
          <NavCard icon={Flag} label="Reports" badge={stats?.pending_reports} onClick={() => onNavigate('admin-reports')} />
          <NavCard icon={Settings2} label="LLM Settings" onClick={() => onNavigate('admin-llm')} />
        </div>

        {/* Quick actions */}
        <div>
          <p className="text-xs font-semibold text-tg-hint uppercase tracking-wide mb-2">Quick Actions</p>
          <button
            onClick={() => scraperMutation.mutate()}
            disabled={scraperMutation.isPending || scraperMutation.isSuccess}
            className="flex items-center gap-2 w-full bg-tg-button/10 border border-tg-button/20 rounded-2xl px-4 py-3 text-sm font-medium text-tg-button disabled:opacity-60 active:scale-[0.98] transition-all"
          >
            {scraperMutation.isSuccess
              ? <><CheckCircle size={18} /> Scraper triggered</>
              : scraperMutation.isPending
                ? <><Rss size={18} className="animate-pulse" /> Starting scraper…</>
                : <><Rss size={18} /> Run Scraper Now</>}
          </button>
        </div>

      </div>
    </div>
  );
}
