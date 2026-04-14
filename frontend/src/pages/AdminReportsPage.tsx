/**
 * Admin reports queue — review, dismiss, remove content, or ban users.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, Trash2, Ban } from 'lucide-react';
import { adminApi, type Report } from '@/lib/api';

const TABS = [
  { key: 'pending',  label: 'Pending' },
  { key: 'resolved', label: 'Resolved' },
] as const;

type TabKey = typeof TABS[number]['key'];

interface Props { onBack: () => void }

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function AdminReportsPage({ onBack }: Props) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>('pending');
  const [actingId, setActingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reports', tab],
    queryFn: () => adminApi.reports({ status: tab, per_page: 50 }),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'dismiss' | 'remove' | 'ban' }) =>
      adminApi.resolveReport(id, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-reports'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
      setActingId(null);
    },
  });

  const reports = data?.items ?? [];

  function act(report: Report, action: 'dismiss' | 'remove' | 'ban') {
    setActingId(report.id);
    resolveMutation.mutate({ id: report.id, action });
  }

  return (
    <div className="min-h-screen bg-tg-bg">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="sticky top-0 bg-tg-bg/95 backdrop-blur z-10 px-4 pt-4 pb-2 border-b border-tg-hint/10">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-tg-hint hover:bg-tg-secondary-bg">
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-lg font-bold text-tg-text flex-1">Reports</h2>
            {data && <span className="text-xs text-tg-hint">{data.total} total</span>}
          </div>

          <div className="flex gap-1 bg-tg-secondary-bg rounded-xl p-1">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  tab === key
                    ? 'bg-tg-button text-tg-button-text shadow-sm'
                    : 'text-tg-hint hover:text-tg-text'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-3 space-y-2 pb-24">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-tg-secondary-bg rounded-2xl animate-pulse" />
            ))
          ) : reports.length === 0 ? (
            <div className="py-16 text-center text-tg-hint">
              <p className="text-4xl mb-3">🏳️</p>
              <p className="text-sm">No {tab} reports</p>
            </div>
          ) : (
            reports.map((report) => {
              const isPending = report.status === 'pending';
              const isBusy = actingId === report.id && resolveMutation.isPending;

              return (
                <div key={report.id} className="bg-tg-secondary-bg rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-tg-text">
                          {report.reporter_name || 'Anonymous'}
                        </span>
                        <span className="text-[11px] text-tg-hint">· {timeAgo(report.created_at)}</span>
                        {!isPending && (
                          <span className="px-2 py-0.5 rounded-full bg-tg-hint/10 text-tg-hint text-[10px]">
                            {report.status}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-medium">
                          {report.reason}
                        </span>
                        <span className="text-[11px] text-tg-hint">
                          {report.post_id ? 'Post' : 'Comment'}
                        </span>
                      </div>

                      {report.details && (
                        <p className="text-xs text-tg-hint line-clamp-2">{report.details}</p>
                      )}
                    </div>
                  </div>

                  {/* Action row */}
                  {isPending && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-tg-hint/10">
                      <ActionBtn
                        onClick={() => act(report, 'dismiss')}
                        disabled={isBusy}
                        icon={<CheckCircle size={13} />}
                        label="Dismiss"
                        color="text-tg-hint bg-tg-bg"
                      />
                      <ActionBtn
                        onClick={() => act(report, 'remove')}
                        disabled={isBusy}
                        icon={<Trash2 size={13} />}
                        label="Remove content"
                        color="text-red-500 bg-red-500/10"
                      />
                      <ActionBtn
                        onClick={() => act(report, 'ban')}
                        disabled={isBusy}
                        icon={<Ban size={13} />}
                        label="Ban + remove"
                        color="text-red-600 bg-red-500/15"
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ onClick, disabled, icon, label, color }: {
  onClick: () => void;
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium disabled:opacity-40 active:scale-95 transition-all ${color}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
