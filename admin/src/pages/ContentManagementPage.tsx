import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Pin,
  Star,
  Trash2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import type { AdminPost } from '@/lib/api';
import { toast } from 'sonner';

const POST_TYPES = ['', 'curated', 'question', 'tip', 'story', 'discussion', 'expert_answer'];
const STATUSES = ['', 'published', 'draft', 'removed'];

export default function ContentManagementPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [postType, setPostType] = useState('');
  const [status, setStatus] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-posts', page, search, postType, status],
    queryFn: () => adminApi.posts({
      page,
      per_page: 20,
      search: search || undefined,
      post_type: postType || undefined,
      status: status || undefined,
    }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ postId, updates }: { postId: string; updates: Parameters<typeof adminApi.updatePost>[1] }) =>
      adminApi.updatePost(postId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      toast.success('Post updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deletePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      toast.success('Post deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const togglePin = (post: AdminPost) => {
    updateMutation.mutate({ postId: post.id, updates: { is_pinned: !post.is_pinned } });
  };

  const toggleFeature = (post: AdminPost) => {
    updateMutation.mutate({ postId: post.id, updates: { is_featured: !post.is_featured } });
  };

  const handleDelete = (postId: string) => {
    if (window.confirm('Permanently delete this post? This cannot be undone.')) {
      deleteMutation.mutate(postId);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Content Management</h2>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search posts..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </form>

        <select
          value={postType}
          onChange={(e) => { setPostType(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Types</option>
          {POST_TYPES.filter(Boolean).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Statuses</option>
          {STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : !data?.items.length ? (
        <div className="text-center py-16 text-gray-500">No posts found</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-8" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Author</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Stats</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((post) => (
                  <PostRow
                    key={post.id}
                    post={post}
                    expanded={expandedId === post.id}
                    onToggle={() => setExpandedId(expandedId === post.id ? null : post.id)}
                    onPin={() => togglePin(post)}
                    onFeature={() => toggleFeature(post)}
                    onDelete={() => handleDelete(post.id)}
                  />
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
    </div>
  );
}

function PostRow({
  post,
  expanded,
  onToggle,
  onPin,
  onFeature,
  onDelete,
}: {
  post: AdminPost;
  expanded: boolean;
  onToggle: () => void;
  onPin: () => void;
  onFeature: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <tr className="hover:bg-gray-50 cursor-pointer" onClick={onToggle}>
        <td className="px-4 py-3">
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${expanded ? 'rotate-0' : '-rotate-90'}`} />
        </td>
        <td className="px-4 py-3">
          <p className="text-sm font-medium text-gray-900 line-clamp-1 max-w-xs">
            {post.is_pinned && <Pin size={12} className="inline mr-1 text-primary-600" />}
            {post.is_featured && <Star size={12} className="inline mr-1 text-amber-500" />}
            {post.title}
          </p>
        </td>
        <td className="px-4 py-3">
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">{post.post_type}</span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">{post.category}</td>
        <td className="px-4 py-3 text-sm text-gray-600">{post.author_name || 'Unknown'}</td>
        <td className="px-4 py-3 text-xs text-gray-500">
          {post.like_count} likes, {post.comment_count} comments, {post.view_count} views
        </td>
        <td className="px-4 py-3">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            post.status === 'published' ? 'bg-green-100 text-green-700' :
            post.status === 'draft' ? 'bg-gray-100 text-gray-500' :
            'bg-red-100 text-red-700'
          }`}>
            {post.status}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onPin}
              className={`p-1.5 rounded ${post.is_pinned ? 'text-primary-600 bg-primary-50' : 'text-gray-400 hover:text-primary-600 hover:bg-primary-50'}`}
              title={post.is_pinned ? 'Unpin' : 'Pin'}
            >
              <Pin size={16} />
            </button>
            <button
              onClick={onFeature}
              className={`p-1.5 rounded ${post.is_featured ? 'text-amber-500 bg-amber-50' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'}`}
              title={post.is_featured ? 'Unfeature' : 'Feature'}
            >
              <Star size={16} />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} className="px-4 py-4 bg-gray-50">
            <div className="max-w-2xl">
              <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-6">{post.body}</p>
              <div className="mt-3 flex gap-4 text-xs text-gray-500">
                <span>Created: {new Date(post.created_at).toLocaleString()}</span>
                {post.published_at && <span>Published: {new Date(post.published_at).toLocaleString()}</span>}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
