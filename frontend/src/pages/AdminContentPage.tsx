/**
 * Admin content management — list, filter, remove posts.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Search, Trash2, Pin, Star, ChevronDown } from 'lucide-react';
import { adminApi, type AdminPost } from '@/lib/api';

const STATUSES = ['published', 'draft', 'removed'];

const STATUS_COLORS: Record<string, string> = {
  published: 'bg-green-500/15 text-green-600',
  draft:     'bg-amber-500/15 text-amber-600',
  removed:   'bg-red-500/15 text-red-500',
};

interface Props { onBack: () => void }

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86_400_000);
  if (d < 1) return 'Today';
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

export function AdminContentPage({ onBack }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('published');
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<AdminPost | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-posts', page, statusFilter, search],
    queryFn: () => adminApi.posts({
      page,
      per_page: 20,
      status: statusFilter || undefined,
      search: search || undefined,
    }),
    placeholderData: (prev) => prev,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-posts'] });
    qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
  };

  const deleteMutation = useMutation({
    mutationFn: (postId: string) => adminApi.deletePost(postId),
    onSuccess: () => { invalidate(); setConfirmDelete(null); },
  });

  const posts = data?.items ?? [];

  return (
    <div className="min-h-screen bg-tg-bg">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="sticky top-0 bg-tg-bg/95 backdrop-blur z-10 px-4 pt-4 pb-3 border-b border-tg-hint/10">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-tg-hint hover:bg-tg-secondary-bg">
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-lg font-bold text-tg-text flex-1">Content</h2>
            {data && <span className="text-xs text-tg-hint">{data.total} total</span>}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tg-hint" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search posts…"
                className="w-full bg-tg-secondary-bg rounded-xl pl-8 pr-3 py-2 text-sm text-tg-text placeholder-tg-hint focus:outline-none"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="appearance-none bg-tg-secondary-bg rounded-xl px-3 py-2 pr-7 text-sm text-tg-text focus:outline-none"
              >
                <option value="">All</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-tg-hint pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="px-4 py-3 space-y-2 pb-24">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-tg-secondary-bg rounded-2xl animate-pulse" />
            ))
          ) : posts.length === 0 ? (
            <div className="py-16 text-center text-tg-hint">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-sm">No posts found</p>
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="bg-tg-secondary-bg rounded-2xl px-4 py-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-tg-text line-clamp-2 leading-snug">
                      {post.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[post.status] ?? 'bg-tg-hint/10 text-tg-hint'}`}>
                        {post.status}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-tg-button/10 text-tg-button text-[10px]">
                        {post.post_type}
                      </span>
                      {post.category && (
                        <span className="text-[10px] text-tg-hint">{post.category}</span>
                      )}
                      {post.is_pinned && <Pin size={11} className="text-tg-hint" />}
                      {post.is_featured && <Star size={11} className="text-amber-500" />}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-tg-hint">
                      <span>{post.author_name || 'Unknown'}</span>
                      <span>·</span>
                      <span>👍 {post.like_count}</span>
                      <span>💬 {post.comment_count}</span>
                      <span>·</span>
                      <span>{timeAgo(post.created_at)}</span>
                    </div>
                  </div>
                  {post.status !== 'removed' && (
                    <button
                      onClick={() => setConfirmDelete(post)}
                      className="p-2 rounded-xl text-red-400 hover:bg-red-500/10 shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
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

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
          <div className="bg-tg-secondary-bg rounded-2xl w-full max-w-sm p-5 space-y-4">
            <h3 className="text-base font-bold text-tg-text">Delete Post?</h3>
            <p className="text-sm text-tg-hint line-clamp-2">{confirmDelete.title}</p>
            <p className="text-xs text-red-400">This permanently deletes the post and all its comments.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 bg-tg-bg rounded-xl text-sm text-tg-text"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(confirmDelete.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
