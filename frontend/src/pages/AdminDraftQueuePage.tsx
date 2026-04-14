/**
 * Admin draft queue — list pending scraped drafts.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, Trash2, ChevronRight, RefreshCw } from 'lucide-react';
import { adminApi, type ScrapedDraft } from '@/lib/api';

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'published', label: 'Published' },
  { key: 'discarded', label: 'Discarded' },
] as const;

type TabKey = typeof TABS[number]['key'];

interface Props {
  onBack: () => void;
  onEditDraft: (draft: ScrapedDraft) => void;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function AdminDraftQueuePage({ onBack, onEditDraft }: Props) {
  const [tab, setTab] = useState<TabKey>('pending');
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-drafts', tab],
    queryFn: () => adminApi.drafts({ status: tab, per_page: 50 }),
  });

  const discardMutation = useMutation({
    mutationFn: (id: string) => adminApi.discardDraft(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-drafts'] }),
  });

  const drafts = data?.items ?? [];

  return (
    <div className="min-h-screen bg-tg-bg">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="sticky top-0 bg-tg-bg/95 backdrop-blur z-10 px-4 pt-4 pb-2 border-b border-tg-hint/10">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-tg-hint hover:bg-tg-secondary-bg">
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-lg font-bold text-tg-text flex-1">Draft Queue</h2>
            <button onClick={() => refetch()} className="p-2 rounded-xl text-tg-hint hover:bg-tg-secondary-bg">
              <RefreshCw size={18} />
            </button>
          </div>

          {/* Tabs */}
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
                {key === 'pending' && data?.total ? (
                  <span className="ml-1 text-[10px]">({data.total})</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="px-4 py-3 space-y-2 pb-24">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-tg-secondary-bg rounded-2xl animate-pulse" />
            ))
          ) : drafts.length === 0 ? (
            <div className="py-16 text-center text-tg-hint">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-sm">No {tab} drafts</p>
            </div>
          ) : (
            drafts.map((draft) => (
              <DraftCard
                key={draft.id}
                draft={draft}
                onEdit={() => onEditDraft(draft)}
                onDiscard={() => discardMutation.mutate(draft.id)}
                discarding={discardMutation.isPending && discardMutation.variables === draft.id}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function DraftCard({ draft, onEdit, onDiscard, discarding }: {
  draft: ScrapedDraft;
  onEdit: () => void;
  onDiscard: () => void;
  discarding: boolean;
}) {
  const hasTranslation = !!(draft.translated_title && draft.translated_body);
  const isPending = draft.status === 'pending';

  return (
    <div className="bg-tg-secondary-bg rounded-2xl overflow-hidden">
      <button onClick={onEdit} className="w-full text-left px-4 pt-4 pb-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-medium text-tg-hint">
                r/{draft.subreddit} · {timeAgo(draft.scraped_at)}
              </span>
              {draft.original_upvotes != null && (
                <span className="text-[11px] text-tg-hint">↑{draft.original_upvotes}</span>
              )}
            </div>
            <p className="text-sm font-medium text-tg-text line-clamp-2 leading-snug">
              {draft.original_title || '(no title)'}
            </p>
            {draft.translated_title && (
              <p className="text-xs text-tg-hint mt-1 line-clamp-1">
                {draft.translated_title}
              </p>
            )}
          </div>
          <ChevronRight size={16} className="text-tg-hint shrink-0 mt-1" />
        </div>

        {/* Status row */}
        <div className="flex items-center gap-2 mt-2">
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
            draft.status === 'pending'   ? 'bg-amber-500/15 text-amber-600' :
            draft.status === 'published' ? 'bg-green-500/15 text-green-600' :
                                          'bg-gray-500/15 text-tg-hint'
          }`}>
            {draft.status}
          </span>
          {draft.category && (
            <span className="px-2 py-0.5 rounded-full bg-tg-button/10 text-tg-button text-[11px] font-medium">
              {draft.category}
            </span>
          )}
          {!hasTranslation && isPending && (
            <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[11px]">
              Not translated
            </span>
          )}
        </div>
      </button>

      {/* Action row */}
      {isPending && (
        <div className="flex border-t border-tg-hint/10">
          {draft.reddit_url && (
            <a
              href={draft.reddit_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs text-tg-hint hover:text-tg-text"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={13} /> Source
            </a>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDiscard(); }}
            disabled={discarding}
            className="ml-auto flex items-center gap-1.5 px-4 py-2.5 text-xs text-red-500 hover:text-red-600 disabled:opacity-40"
          >
            <Trash2 size={13} /> {discarding ? 'Discarding…' : 'Discard'}
          </button>
        </div>
      )}
    </div>
  );
}
