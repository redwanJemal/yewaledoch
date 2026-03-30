import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Zap, RefreshCw, Globe } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';

const SUBREDDIT_SOURCES = [
  { name: 'r/Parenting', minUpvotes: 50, enabled: true },
  { name: 'r/Mommit', minUpvotes: 30, enabled: true },
  { name: 'r/Daddit', minUpvotes: 30, enabled: true },
  { name: 'r/NewParents', minUpvotes: 20, enabled: true },
  { name: 'r/toddlers', minUpvotes: 20, enabled: true },
  { name: 'r/beyondthebump', minUpvotes: 30, enabled: false },
  { name: 'r/ScienceBasedParenting', minUpvotes: 20, enabled: false },
];

export default function ScraperPage() {
  const queryClient = useQueryClient();
  const [lastRunResult, setLastRunResult] = useState<string | null>(null);

  const { data: pendingDrafts } = useQuery({
    queryKey: ['drafts', 'pending', 'count'],
    queryFn: () => adminApi.drafts({ status: 'pending', per_page: 1 }),
  });

  const scraperMutation = useMutation({
    mutationFn: adminApi.triggerScraper,
    onSuccess: (data) => {
      setLastRunResult(data.message);
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
    },
    onError: (err: Error) => {
      setLastRunResult(`Error: ${err.message}`);
      toast.error(err.message);
    },
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Scraper Configuration</h2>

      {/* Run scraper */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Run Scraper</h3>
            <p className="text-sm text-gray-500 mt-1">
              Fetch new posts from Reddit, translate to Amharic, and add to draft queue.
            </p>
          </div>
          <button
            onClick={() => scraperMutation.mutate()}
            disabled={scraperMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {scraperMutation.isPending ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Zap size={16} />
                Run Scraper Now
              </>
            )}
          </button>
        </div>

        {lastRunResult && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            lastRunResult.startsWith('Error')
              ? 'bg-red-50 text-red-700'
              : 'bg-green-50 text-green-700'
          }`}>
            {lastRunResult}
          </div>
        )}

        <div className="mt-4 flex items-center gap-6 text-sm text-gray-500">
          <span>Pending drafts: <strong className="text-gray-900">{pendingDrafts?.total ?? 0}</strong></span>
        </div>
      </div>

      {/* Subreddit sources */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Subreddit Sources</h3>
          <p className="text-sm text-gray-500 mt-1">
            Configured subreddits for content scraping. Edit in scraper config to change.
          </p>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Subreddit</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Min Upvotes</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {SUBREDDIT_SOURCES.map((source) => (
              <tr key={source.name} className="hover:bg-gray-50">
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <Globe size={16} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">{source.name}</span>
                  </div>
                </td>
                <td className="px-6 py-3 text-sm text-gray-600">
                  {source.minUpvotes}+
                </td>
                <td className="px-6 py-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    source.enabled
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {source.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
