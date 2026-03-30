import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  FileEdit,
  Check,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';

type DraftStatus = 'pending' | 'published' | 'discarded';

const STATUS_TABS: { value: DraftStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'published', label: 'Published' },
  { value: 'discarded', label: 'Discarded' },
];

export default function DraftQueuePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<DraftStatus | ''>('pending');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['drafts', statusFilter, page],
    queryFn: () => adminApi.drafts({
      status: statusFilter || undefined,
      page,
      per_page: 20,
    }),
  });

  // Count for pending badge
  const { data: pendingData } = useQuery({
    queryKey: ['drafts', 'pending', 'count'],
    queryFn: () => adminApi.drafts({ status: 'pending', per_page: 1 }),
  });

  const publishMutation = useMutation({
    mutationFn: adminApi.publishDraft,
    onSuccess: () => {
      toast.success('Draft published');
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const discardMutation = useMutation({
    mutationFn: adminApi.discardDraft,
    onSuccess: () => {
      toast.success('Draft discarded');
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!data) return;
    if (selected.size === data.items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.items.map((d) => d.id)));
    }
  };

  const handleBulkPublish = async () => {
    for (const id of selected) {
      try {
        await adminApi.publishDraft(id);
      } catch {
        // continue
      }
    }
    setSelected(new Set());
    toast.success(`Published ${selected.size} drafts`);
    queryClient.invalidateQueries({ queryKey: ['drafts'] });
  };

  const handleBulkDiscard = async () => {
    for (const id of selected) {
      try {
        await adminApi.discardDraft(id);
      } catch {
        // continue
      }
    }
    setSelected(new Set());
    toast.success(`Discarded ${selected.size} drafts`);
    queryClient.invalidateQueries({ queryKey: ['drafts'] });
  };

  const pendingCount = pendingData?.total ?? 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Draft Queue</h2>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {STATUS_TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => { setStatusFilter(value as DraftStatus | ''); setPage(1); setSelected(new Set()); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors relative ${
              statusFilter === value
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
            {value === 'pending' && pendingCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-semibold">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-lg">
          <span className="text-sm font-medium text-primary-700">
            {selected.size} selected
          </span>
          <button
            onClick={handleBulkPublish}
            className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700"
          >
            Publish Selected
          </button>
          <button
            onClick={handleBulkDiscard}
            className="px-3 py-1.5 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700"
          >
            Discard Selected
          </button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : !data?.items.length ? (
        <div className="text-center py-16 text-gray-500">
          No drafts found
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selected.size === data.items.length && data.items.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Stats</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Scraped</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((draft) => (
                  <tr key={draft.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(draft.id)}
                        onChange={() => toggleSelect(draft.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900 line-clamp-2 max-w-xs">
                        {draft.translated_title || draft.original_title || 'Untitled'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {draft.subreddit && (
                        <a
                          href={draft.reddit_url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                        >
                          r/{draft.subreddit}
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {draft.category && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          {draft.category}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {draft.original_upvotes != null && <span>{draft.original_upvotes} upvotes</span>}
                      {draft.original_comments != null && <span className="ml-2">{draft.original_comments} comments</span>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={draft.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(draft.scraped_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/drafts/${draft.id}`)}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                          title="Edit"
                        >
                          <FileEdit size={16} />
                        </button>
                        {draft.status === 'pending' && (
                          <>
                            <button
                              onClick={() => publishMutation.mutate(draft.id)}
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                              title="Publish"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => discardMutation.mutate(draft.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Discard"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.total > 20 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Page {data.page} of {Math.ceil(data.total / data.per_page)}
                {' '}({data.total} total)
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    published: 'bg-green-100 text-green-700',
    discarded: 'bg-gray-100 text-gray-500',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  );
}
