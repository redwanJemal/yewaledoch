import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Check, Trash2, Languages } from 'lucide-react';
import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';

const CATEGORIES = [
  'pregnancy', 'newborn', 'toddler', 'school_age', 'teens',
  'health', 'nutrition', 'dads', 'mental_health', 'special_needs',
  'education', 'fun_activities',
];

export default function DraftEditPage() {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: draft, isLoading } = useQuery({
    queryKey: ['draft', draftId],
    queryFn: () => adminApi.getDraft(draftId!),
    enabled: !!draftId,
  });

  const [translatedTitle, setTranslatedTitle] = useState('');
  const [translatedBody, setTranslatedBody] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (draft) {
      setTranslatedTitle(draft.translated_title || '');
      setTranslatedBody(draft.translated_body || '');
      setCategory(draft.category || '');
      setNotes(draft.notes || '');
    }
  }, [draft]);

  const updateMutation = useMutation({
    mutationFn: () =>
      adminApi.updateDraft(draftId!, {
        translated_title: translatedTitle,
        translated_body: translatedBody,
        category,
        notes,
      }),
    onSuccess: () => {
      toast.success('Draft saved');
      queryClient.invalidateQueries({ queryKey: ['draft', draftId] });
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const publishMutation = useMutation({
    mutationFn: () => adminApi.publishDraft(draftId!),
    onSuccess: () => {
      toast.success('Draft published');
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
      navigate('/drafts');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const discardMutation = useMutation({
    mutationFn: () => adminApi.discardDraft(draftId!),
    onSuccess: () => {
      toast.success('Draft discarded');
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
      navigate('/drafts');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const translateMutation = useMutation({
    mutationFn: () => adminApi.translateDraft(draftId!),
    onSuccess: (updated) => {
      toast.success('Translation updated');
      setTranslatedTitle(updated.translated_title || '');
      setTranslatedBody(updated.translated_body || '');
      setCategory(updated.category || '');
      queryClient.invalidateQueries({ queryKey: ['draft', draftId] });
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
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

  if (!draft) {
    return <div className="text-center py-16 text-gray-500">Draft not found</div>;
  }

  const isPending = draft.status === 'pending';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/drafts')}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Edit Draft</h2>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            draft.status === 'pending' ? 'bg-amber-100 text-amber-700' :
            draft.status === 'published' ? 'bg-green-100 text-green-700' :
            'bg-gray-100 text-gray-500'
          }`}>
            {draft.status}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            {showPreview ? 'Edit' : 'Preview'}
          </button>
          {isPending && (
            <>
              <button
                onClick={() => translateMutation.mutate()}
                disabled={translateMutation.isPending}
                title="Re-translate using the configured LLM provider"
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100"
              >
                <Languages size={16} />
                {translateMutation.isPending ? 'Translating...' : 'Translate'}
              </button>
              <button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100"
              >
                <Save size={16} />
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                <Check size={16} />
                {publishMutation.isPending ? 'Publishing...' : 'Publish'}
              </button>
              <button
                onClick={() => discardMutation.mutate()}
                disabled={discardMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                <Trash2 size={16} />
                Discard
              </button>
            </>
          )}
        </div>
      </div>

      {/* Source info */}
      {draft.subreddit && (
        <div className="text-sm text-gray-500">
          Source: <a href={draft.reddit_url || '#'} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">r/{draft.subreddit}</a>
          {draft.original_upvotes != null && <span className="ml-3">{draft.original_upvotes} upvotes</span>}
          {draft.original_comments != null && <span className="ml-3">{draft.original_comments} comments</span>}
        </div>
      )}

      {showPreview ? (
        /* Preview panel */
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm max-w-2xl">
          <div className="mb-2">
            {category && (
              <span className="px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-full font-medium">
                {category}
              </span>
            )}
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            {translatedTitle || 'No title'}
          </h3>
          <div className="prose prose-sm text-gray-700 whitespace-pre-wrap">
            {translatedBody || 'No content'}
          </div>
        </div>
      ) : (
        /* Side-by-side editor */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Original English */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Original English</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                  {draft.original_title || 'N/A'}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Body</label>
                <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {draft.original_body || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Amharic Translation */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Amharic Translation</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                <input
                  type="text"
                  value={translatedTitle}
                  onChange={(e) => setTranslatedTitle(e.target.value)}
                  disabled={!isPending}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Body</label>
                <textarea
                  value={translatedBody}
                  onChange={(e) => setTranslatedBody(e.target.value)}
                  disabled={!isPending}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={!isPending}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={!isPending}
                  rows={3}
                  placeholder="Internal notes for reviewers..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
