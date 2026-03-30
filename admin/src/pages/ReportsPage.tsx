import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Trash2,
  Ban,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';

type ReportStatus = 'pending' | 'resolved' | 'dismissed';

const STATUS_TABS: { value: ReportStatus | ''; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: '', label: 'All' },
];

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ReportStatus | ''>('pending');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reports', statusFilter, page],
    queryFn: () => adminApi.reports({
      status: statusFilter || undefined,
      page,
      per_page: 20,
    }),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ reportId, action }: { reportId: string; action: 'dismiss' | 'remove' | 'ban' }) =>
      adminApi.resolveReport(reportId, action),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Reports</h2>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {STATUS_TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => { setStatusFilter(value as ReportStatus | ''); setPage(1); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              statusFilter === value
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : !data?.items.length ? (
        <div className="text-center py-16 text-gray-500">No reports found</div>
      ) : (
        <div className="space-y-3">
          {data.items.map((report) => (
            <div key={report.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      report.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      report.status === 'resolved' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {report.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(report.created_at).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Reason: {report.reason}
                  </p>
                  {report.details && (
                    <p className="text-sm text-gray-600 mb-2">{report.details}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Reporter: {report.reporter_name || report.reporter_id}</span>
                    {report.post_id && <span>Post: {report.post_id.slice(0, 8)}...</span>}
                    {report.comment_id && <span>Comment: {report.comment_id.slice(0, 8)}...</span>}
                    {report.resolved_at && <span>Resolved: {new Date(report.resolved_at).toLocaleString()}</span>}
                  </div>
                </div>

                {report.status === 'pending' && (
                  <div className="flex items-center gap-1 ml-4">
                    <button
                      onClick={() => resolveMutation.mutate({ reportId: report.id, action: 'dismiss' })}
                      disabled={resolveMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                      title="Dismiss report"
                    >
                      <XCircle size={14} />
                      Dismiss
                    </button>
                    <button
                      onClick={() => resolveMutation.mutate({ reportId: report.id, action: 'remove' })}
                      disabled={resolveMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100"
                      title="Remove content"
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                    <button
                      onClick={() => resolveMutation.mutate({ reportId: report.id, action: 'ban' })}
                      disabled={resolveMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100"
                      title="Ban user"
                    >
                      <Ban size={14} />
                      Ban
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {data.total > 20 && (
            <div className="flex items-center justify-between pt-2">
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
    </div>
  );
}
