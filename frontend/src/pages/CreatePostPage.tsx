import { useState, useRef } from 'react';
import { X, ImagePlus, Eye, Loader2, Send } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postsApi, getAccessToken } from '@/lib/api';
import type { PostType, PostCreateRequest, Post } from '@/lib/api';
import type { User } from '@/lib/api';
import { PostTypeSelector } from '@/components/PostTypeSelector';
import { CategorySelector } from '@/components/CategorySelector';
import { useTranslation } from '@/lib/i18n';
import { useTelegram } from '@/lib/telegram';

const AGE_GROUPS = [
  { value: '', label: 'write.age_all' },
  { value: '0-1', label: 'write.age_0_1' },
  { value: '1-3', label: 'write.age_1_3' },
  { value: '4-12', label: 'write.age_4_12' },
  { value: '13-18', label: 'write.age_13_18' },
];

interface CreatePostPageProps {
  user: User;
  onSuccess: (postId: string) => void;
}

export function CreatePostPage({ onSuccess }: CreatePostPageProps) {
  const { t } = useTranslation();
  const { haptic } = useTelegram();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [postType, setPostType] = useState<PostType | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [ageGroup, setAgeGroup] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [discussionPrompt, setDiscussionPrompt] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const parsedTags = tagsInput
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 5);

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: (data: PostCreateRequest) => postsApi.create(data),
    onSuccess: (post: Post) => {
      haptic.notification('success');
      queryClient.invalidateQueries({ queryKey: ['posts-feed'] });
      onSuccess(post.id);
    },
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!postType) newErrors.postType = t('write.error_type');
    if (!title.trim()) newErrors.title = t('write.error_title');
    if (title.length > 300) newErrors.title = t('write.error_title_long');
    if (!category) newErrors.category = t('write.error_category');
    if (!body.trim()) newErrors.body = t('write.error_body');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    haptic.impact('medium');

    const data: PostCreateRequest = {
      title: title.trim(),
      body: body.trim(),
      post_type: postType!,
      category: category!,
      ...(ageGroup && { age_group: ageGroup }),
      ...(parsedTags.length > 0 && { tags: parsedTags }),
      ...(images.length > 0 && { images }),
      ...(isAnonymous && { is_anonymous: true }),
      ...(discussionPrompt.trim() && { discussion_prompt: discussionPrompt.trim() }),
    };

    submitMutation.mutate(data);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = 3 - images.length;
    if (remaining <= 0) return;

    setUploading(true);
    const API_URL = import.meta.env.VITE_API_URL || '/api/v1';
    const token = getAccessToken();

    for (let i = 0; i < Math.min(files.length, remaining); i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch(`${API_URL}/upload/image`, {
          method: 'POST',
          headers: { ...(token && { Authorization: `Bearer ${token}` }) },
          body: formData,
        });
        if (res.ok) {
          const result = await res.json();
          setImages((prev) => [...prev, result.url]);
        }
      } catch {
        // Silently skip failed uploads
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Preview mode
  if (showPreview) {
    return (
      <div className="px-4 pt-4 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-tg-text">{t('write.preview')}</h2>
          <button
            onClick={() => setShowPreview(false)}
            className="text-tg-hint p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-tg-section-bg rounded-xl p-4">
          {postType && (
            <span className="text-xs text-tg-hint mb-1 block">{t(`post_type.${postType}`)}</span>
          )}
          <h3 className="text-tg-text font-semibold text-[15px] mb-2">{title || t('write.title_placeholder')}</h3>
          <p className="text-tg-text text-sm whitespace-pre-wrap mb-3">{body || t('write.body_placeholder')}</p>

          {images.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto">
              {images.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="h-32 rounded-lg object-cover flex-shrink-0"
                />
              ))}
            </div>
          )}

          {discussionPrompt && (
            <div className="bg-tg-secondary-bg rounded-lg p-3 mb-3">
              <p className="text-sm text-tg-text">{discussionPrompt}</p>
            </div>
          )}

          {parsedTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {parsedTags.map((tag) => (
                <span key={tag} className="text-xs bg-tg-secondary-bg text-tg-hint px-2 py-0.5 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {isAnonymous && (
            <p className="text-xs text-tg-hint mt-2">{t('post.anonymous')}</p>
          )}
        </div>

        <button
          onClick={() => setShowPreview(false)}
          className="w-full mt-4 py-3 bg-tg-secondary-bg text-tg-text rounded-xl font-medium"
        >
          {t('write.back_to_edit')}
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-4">
      {/* Header */}
      <h1 className="text-xl font-bold text-tg-text mb-4">{t('write.create_post')}</h1>

      {/* Post Type */}
      <div className="mb-4">
        <label className="text-xs font-medium text-tg-hint mb-1.5 block">{t('write.select_type')}</label>
        <PostTypeSelector selected={postType} onSelect={setPostType} />
        {errors.postType && <p className="text-xs text-red-500 mt-1">{errors.postType}</p>}
      </div>

      {/* Title */}
      <div className="mb-4">
        <label className="text-xs font-medium text-tg-hint mb-1.5 block">{t('write.title_label')}</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={300}
          placeholder={t('write.title_placeholder')}
          className="w-full px-4 py-3 bg-tg-secondary-bg rounded-xl text-sm text-tg-text placeholder:text-tg-hint outline-none focus:ring-2 focus:ring-tg-button/30"
        />
        <div className="flex justify-between mt-1">
          {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
          <p className="text-xs text-tg-hint ml-auto">{title.length}/300</p>
        </div>
      </div>

      {/* Category */}
      <div className="mb-4">
        <label className="text-xs font-medium text-tg-hint mb-1.5 block">{t('write.select_category')}</label>
        <CategorySelector selected={category} onSelect={setCategory} />
        {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
      </div>

      {/* Age Group */}
      <div className="mb-4">
        <label className="text-xs font-medium text-tg-hint mb-1.5 block">{t('write.age_group')}</label>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {AGE_GROUPS.map((ag) => (
            <button
              key={ag.value}
              type="button"
              onClick={() => setAgeGroup(ag.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                ageGroup === ag.value
                  ? 'bg-tg-button text-tg-button-text'
                  : 'bg-tg-secondary-bg text-tg-hint'
              }`}
            >
              {t(ag.label)}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="mb-4">
        <label className="text-xs font-medium text-tg-hint mb-1.5 block">{t('write.body_label')}</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('write.body_placeholder')}
          rows={6}
          className="w-full px-4 py-3 bg-tg-secondary-bg rounded-xl text-sm text-tg-text placeholder:text-tg-hint outline-none focus:ring-2 focus:ring-tg-button/30 resize-none"
        />
        {errors.body && <p className="text-xs text-red-500 mt-1">{errors.body}</p>}
      </div>

      {/* Images */}
      <div className="mb-4">
        <label className="text-xs font-medium text-tg-hint mb-1.5 block">{t('write.images')}</label>
        <div className="flex gap-2 flex-wrap">
          {images.map((url, i) => (
            <div key={i} className="relative">
              <img src={url} alt="" className="h-20 w-20 rounded-lg object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {images.length < 3 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="h-20 w-20 rounded-lg bg-tg-secondary-bg flex flex-col items-center justify-center gap-1 text-tg-hint"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <ImagePlus className="w-5 h-5" />
                  <span className="text-[10px]">{images.length}/3</span>
                </>
              )}
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>

      {/* Tags */}
      <div className="mb-4">
        <label className="text-xs font-medium text-tg-hint mb-1.5 block">{t('write.tags')}</label>
        <input
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder={t('write.tags_placeholder')}
          className="w-full px-4 py-3 bg-tg-secondary-bg rounded-xl text-sm text-tg-text placeholder:text-tg-hint outline-none focus:ring-2 focus:ring-tg-button/30"
        />
        {parsedTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {parsedTags.map((tag) => (
              <span key={tag} className="text-xs bg-tg-secondary-bg text-tg-hint px-2 py-0.5 rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Discussion Prompt (optional) */}
      <div className="mb-4">
        <label className="text-xs font-medium text-tg-hint mb-1.5 block">{t('write.discussion_prompt')}</label>
        <input
          type="text"
          value={discussionPrompt}
          onChange={(e) => setDiscussionPrompt(e.target.value)}
          placeholder={t('write.discussion_placeholder')}
          className="w-full px-4 py-3 bg-tg-secondary-bg rounded-xl text-sm text-tg-text placeholder:text-tg-hint outline-none focus:ring-2 focus:ring-tg-button/30"
        />
      </div>

      {/* Anonymous toggle */}
      <div className="mb-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="w-5 h-5 rounded border-tg-hint text-tg-button focus:ring-tg-button/30"
          />
          <span className="text-sm text-tg-text">{t('comment.anonymous_toggle')}</span>
        </label>
      </div>

      {/* Error message */}
      {submitMutation.isError && (
        <div className="mb-4 p-3 bg-red-50 rounded-xl">
          <p className="text-sm text-red-600">{submitMutation.error?.message || t('error.generic')}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="flex-1 py-3 bg-tg-secondary-bg text-tg-text rounded-xl font-medium flex items-center justify-center gap-2"
        >
          <Eye className="w-4 h-4" />
          {t('write.preview')}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitMutation.isPending}
          className="flex-1 py-3 bg-tg-button text-tg-button-text rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {t('btn.submit')}
        </button>
      </div>
    </div>
  );
}

// Locked state for non-contributors
interface LockedWritePageProps {
  user: User;
}

export function LockedWritePage({ user }: LockedWritePageProps) {
  const { t } = useTranslation();
  const commentCount = user.comment_count || 0;
  const needed = 10;
  const progress = Math.min(commentCount / needed, 1);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <p className="text-5xl mb-4">✍️</p>
      <h2 className="text-lg font-bold text-tg-text mb-2">{t('write.locked_title')}</h2>
      <p className="text-sm text-tg-hint mb-6">{t('write.locked_subtitle')}</p>

      {/* Progress bar */}
      <div className="w-full max-w-xs mb-3">
        <div className="flex justify-between text-xs text-tg-hint mb-1.5">
          <span>{t('write.progress_comments')}</span>
          <span>{commentCount}/{needed}</span>
        </div>
        <div className="h-2 bg-tg-secondary-bg rounded-full overflow-hidden">
          <div
            className="h-full bg-tg-button rounded-full transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      <p className="text-xs text-tg-hint">
        {commentCount >= needed
          ? t('write.almost_there')
          : t('write.keep_engaging')}
      </p>
    </div>
  );
}
