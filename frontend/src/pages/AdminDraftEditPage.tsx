/**
 * Admin draft editor — side-by-side on wider screens, stacked on mobile.
 * Translate → review → set category → publish.
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Languages, Save, CheckCircle, Trash2,
  ExternalLink, ChevronDown,
} from 'lucide-react';
import { adminApi } from '@/lib/api';

const CATEGORIES = [
  'pregnancy','newborn','toddler','school_age','teens',
  'health','nutrition','dads','mental_health','special_needs',
  'education','fun_activities',
];

interface Props {
  draftId: string;
  onBack: () => void;
}

export function AdminDraftEditPage({ draftId, onBack }: Props) {
  const qc = useQueryClient();

  const { data: draft, isLoading } = useQuery({
    queryKey: ['admin-draft', draftId],
    queryFn: () => adminApi.getDraft(draftId),
  });

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (draft) {
      setTitle(draft.translated_title ?? '');
      setBody(draft.translated_body ?? '');
      setCategory(draft.category ?? '');
      setNotes(draft.notes ?? '');
    }
  }, [draft]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-draft', draftId] });
    qc.invalidateQueries({ queryKey: ['admin-drafts'] });
    qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
  };

  const translateMutation = useMutation({
    mutationFn: () => adminApi.translateDraft(draftId),
    onSuccess: (updated) => {
      setTitle(updated.translated_title ?? '');
      setBody(updated.translated_body ?? '');
      setCategory(updated.category ?? '');
      invalidate();
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => adminApi.updateDraft(draftId, {
      translated_title: title,
      translated_body: body,
      category,
      notes,
    }),
    onSuccess: invalidate,
  });

  const publishMutation = useMutation({
    mutationFn: () => adminApi.publishDraft(draftId),
    onSuccess: () => { invalidate(); onBack(); },
  });

  const discardMutation = useMutation({
    mutationFn: () => adminApi.discardDraft(draftId),
    onSuccess: () => { invalidate(); onBack(); },
  });

  if (isLoading || !draft) {
    return (
      <div className="min-h-screen bg-tg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-tg-button border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isPending = draft.status === 'pending';
  const canPublish = isPending && !!title.trim() && !!body.trim() && !!category;
  const isBusy = translateMutation.isPending || saveMutation.isPending ||
                 publishMutation.isPending || discardMutation.isPending;

  return (
    <div className="min-h-screen bg-tg-bg">
      <div className="max-w-4xl mx-auto">

        {/* Sticky header */}
        <div className="sticky top-0 bg-tg-bg/95 backdrop-blur z-10 px-4 pt-4 pb-3 border-b border-tg-hint/10">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-tg-hint hover:bg-tg-secondary-bg">
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-base font-bold text-tg-text flex-1 min-w-0 truncate">
              Edit Draft
            </h2>

            {/* Status badge */}
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              draft.status === 'pending'   ? 'bg-amber-500/15 text-amber-600' :
              draft.status === 'published' ? 'bg-green-500/15 text-green-600' :
                                            'bg-gray-500/15 text-tg-hint'
            }`}>
              {draft.status}
            </span>

            {/* Actions (pending only) */}
            {isPending && (
              <div className="flex items-center gap-1.5">
                <ActionBtn
                  onClick={() => translateMutation.mutate()}
                  disabled={isBusy}
                  loading={translateMutation.isPending}
                  icon={<Languages size={15} />}
                  label="Translate"
                  variant="purple"
                />
                <ActionBtn
                  onClick={() => saveMutation.mutate()}
                  disabled={isBusy}
                  loading={saveMutation.isPending}
                  icon={<Save size={15} />}
                  label="Save"
                  variant="default"
                />
                <ActionBtn
                  onClick={() => publishMutation.mutate()}
                  disabled={isBusy || !canPublish}
                  loading={publishMutation.isPending}
                  icon={<CheckCircle size={15} />}
                  label="Publish"
                  variant="green"
                />
                <ActionBtn
                  onClick={() => discardMutation.mutate()}
                  disabled={isBusy}
                  loading={discardMutation.isPending}
                  icon={<Trash2 size={15} />}
                  label="Discard"
                  variant="red"
                />
              </div>
            )}
          </div>

          {/* Source meta */}
          <div className="flex items-center gap-2 mt-2 text-xs text-tg-hint">
            <span>r/{draft.subreddit}</span>
            {draft.original_upvotes != null && <span>· ↑{draft.original_upvotes}</span>}
            {draft.original_comments != null && <span>· 💬{draft.original_comments}</span>}
            {draft.reddit_url && (
              <a href={draft.reddit_url} target="_blank" rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1 text-tg-button">
                <ExternalLink size={12} /> Source
              </a>
            )}
          </div>

          {/* Translate error */}
          {translateMutation.isError && (
            <p className="mt-2 text-xs text-red-500">
              Translation failed: {(translateMutation.error as Error).message}
            </p>
          )}
        </div>

        {/* Body — side-by-side on md+ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-4 p-4 pb-24">

          {/* Left: Original */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold text-tg-hint uppercase tracking-wider">Original English</p>
            <div className="bg-tg-secondary-bg rounded-2xl p-4 space-y-3">
              <div>
                <p className="text-[11px] text-tg-hint mb-1">Title</p>
                <p className="text-sm text-tg-text font-medium leading-snug">
                  {draft.original_title || '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-tg-hint mb-1">Body</p>
                <p className="text-sm text-tg-text whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                  {draft.original_body || '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Amharic */}
          <div className="space-y-3 mt-4 md:mt-0">
            <p className="text-[11px] font-bold text-tg-hint uppercase tracking-wider">
              Amharic Translation
              {!draft.translated_title && isPending && (
                <span className="ml-2 text-amber-500 normal-case">· Not translated yet</span>
              )}
            </p>
            <div className="bg-tg-secondary-bg rounded-2xl p-4 space-y-3">
              <div>
                <p className="text-[11px] text-tg-hint mb-1">Title</p>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={!isPending}
                  placeholder="ርዕስ…"
                  className="w-full bg-tg-bg rounded-xl px-3 py-2 text-sm text-tg-text placeholder-tg-hint border border-tg-hint/20 focus:outline-none focus:border-tg-button disabled:opacity-60"
                  dir="auto"
                />
              </div>
              <div>
                <p className="text-[11px] text-tg-hint mb-1">Body</p>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  disabled={!isPending}
                  placeholder="ይዘት…"
                  rows={10}
                  className="w-full bg-tg-bg rounded-xl px-3 py-2 text-sm text-tg-text placeholder-tg-hint border border-tg-hint/20 focus:outline-none focus:border-tg-button disabled:opacity-60 resize-none"
                  dir="auto"
                />
              </div>

              {/* Category */}
              <div>
                <p className="text-[11px] text-tg-hint mb-1">Category</p>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={!isPending}
                    className="w-full appearance-none bg-tg-bg rounded-xl px-3 py-2 text-sm text-tg-text border border-tg-hint/20 focus:outline-none focus:border-tg-button disabled:opacity-60 pr-8"
                  >
                    <option value="">Select category…</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-tg-hint pointer-events-none" />
                </div>
                {!category && canPublish === false && title && body && (
                  <p className="text-[11px] text-amber-500 mt-1">Category required to publish</p>
                )}
              </div>

              {/* Notes */}
              <div>
                <p className="text-[11px] text-tg-hint mb-1">Notes (internal)</p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={!isPending}
                  placeholder="Internal notes…"
                  rows={2}
                  className="w-full bg-tg-bg rounded-xl px-3 py-2 text-sm text-tg-text placeholder-tg-hint border border-tg-hint/20 focus:outline-none focus:border-tg-button disabled:opacity-60 resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ onClick, disabled, loading, icon, label, variant }: {
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
  icon: React.ReactNode;
  label: string;
  variant: 'default' | 'green' | 'red' | 'purple';
}) {
  const colors = {
    default: 'bg-tg-secondary-bg text-tg-text',
    green:   'bg-green-500/15 text-green-600',
    red:     'bg-red-500/15 text-red-500',
    purple:  'bg-purple-500/15 text-purple-600',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-40 ${colors[variant]}`}
    >
      {loading ? <span className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" /> : icon}
      <span className="hidden sm:inline">{loading ? '…' : label}</span>
    </button>
  );
}
