import { useState, useRef } from 'react';
import { ArrowLeft, X, ImagePlus, Loader2, Save } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postsApi, getAccessToken } from '@/lib/api';
import type { Post, PostUpdateRequest } from '@/lib/api';
import { CategorySelector } from '@/components/CategorySelector';
import { useTranslation } from '@/lib/i18n';
import { useTelegram, useBackButton } from '@/lib/telegram';
import { toast } from 'sonner';

const AGE_GROUPS = [
  { value: '', label: 'write.age_all' },
  { value: '0-1', label: 'write.age_0_1' },
  { value: '1-3', label: 'write.age_1_3' },
  { value: '4-12', label: 'write.age_4_12' },
  { value: '13-18', label: 'write.age_13_18' },
];

interface EditPostPageProps {
  post: Post;
  onBack: () => void;
  onSaved: () => void;
}

export function EditPostPage({ post, onBack, onSaved }: EditPostPageProps) {
  const { t } = useTranslation();
  const { haptic } = useTelegram();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body);
  const [category, setCategory] = useState<string | null>(post.category);
  const [ageGroup, setAgeGroup] = useState(post.age_group || '');
  const [tagsInput, setTagsInput] = useState((post.tags || []).join(', '));
  const [isAnonymous, setIsAnonymous] = useState(post.is_anonymous);
  const [discussionPrompt, setDiscussionPrompt] = useState(post.discussion_prompt || '');
  const [images, setImages] = useState<string[]>(post.images || []);
  const [uploading, setUploading] = useState(false);

  useBackButton(onBack);

  const parsedTags = tagsInput
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 5);

  const compressImage = (file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => resolve(blob || file),
          'image/jpeg',
          quality,
        );
      };
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = 3 - images.length;
    if (remaining <= 0) return;

    setUploading(true);
    const API_URL = import.meta.env.VITE_API_URL || '/api/v1';
    const token = getAccessToken();

    const uploadTasks = Array.from(files)
      .slice(0, remaining)
      .filter((f) => f.type.startsWith('image/'))
      .map(async (file) => {
        const compressed = await compressImage(file);
        const formData = new FormData();
        formData.append('file', compressed, file.name);
        try {
          const res = await fetch(`${API_URL}/upload/image`, {
            method: 'POST',
            headers: { ...(token && { Authorization: `Bearer ${token}` }) },
            body: formData,
          });
          if (res.ok) {
            const result = await res.json();
            return result.url as string;
          }
        } catch { /* skip */ }
        return null;
      });

    const results = await Promise.all(uploadTasks);
    const uploaded = results.filter((url): url is string => url !== null);
    if (uploaded.length > 0) {
      setImages((prev) => [...prev, ...uploaded]);
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const saveMutation = useMutation({
    mutationFn: (data: PostUpdateRequest) => postsApi.update(post.id, data),
    onSuccess: () => {
      haptic.notification('success');
      toast.success(t('post.updated'));
      queryClient.invalidateQueries({ queryKey: ['post', post.id] });
      queryClient.invalidateQueries({ queryKey: ['posts-feed'] });
      onSaved();
    },
    onError: (err: Error) => {
      toast.error(err.message || t('error.generic'));
    },
  });

  const handleSave = () => {
    if (!title.trim() || title.trim().length < 3) return;
    if (!body.trim() || body.trim().length < 10) return;

    const data: PostUpdateRequest = {};
    if (title !== post.title) data.title = title.trim();
    if (body !== post.body) data.body = body.trim();
    if (category !== post.category) data.category = category || undefined;
    if (ageGroup !== (post.age_group || '')) data.age_group = ageGroup || undefined;
    if (isAnonymous !== post.is_anonymous) data.is_anonymous = isAnonymous;
    if (discussionPrompt !== (post.discussion_prompt || '')) data.discussion_prompt = discussionPrompt.trim() || undefined;

    const newTags = parsedTags;
    const oldTags = post.tags || [];
    if (JSON.stringify(newTags) !== JSON.stringify(oldTags)) data.tags = newTags;

    const oldImages = post.images || [];
    if (JSON.stringify(images) !== JSON.stringify(oldImages)) data.images = images;

    if (Object.keys(data).length === 0) {
      onSaved();
      return;
    }

    saveMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-tg-bg">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-tg-bg border-b border-tg-hint/10 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-1 text-tg-text">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-tg-text flex-1">{t('btn.edit')}</h1>
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-tg-button text-tg-button-text rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {t('btn.save')}
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Title */}
        <div>
          <label className="text-xs font-medium text-tg-hint mb-1.5 block">{t('write.title_label')}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={300}
            className="w-full px-4 py-3 bg-tg-secondary-bg rounded-xl text-sm text-tg-text outline-none focus:ring-2 focus:ring-tg-button/30"
          />
          <p className="text-xs text-tg-hint mt-1 text-right">{title.length}/300</p>
        </div>

        {/* Category */}
        <div>
          <label className="text-xs font-medium text-tg-hint mb-1.5 block">{t('write.select_category')}</label>
          <CategorySelector selected={category} onSelect={setCategory} />
        </div>

        {/* Age Group */}
        <div>
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
        <div>
          <label className="text-xs font-medium text-tg-hint mb-1.5 block">{t('write.body_label')}</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="w-full px-4 py-3 bg-tg-secondary-bg rounded-xl text-sm text-tg-text outline-none focus:ring-2 focus:ring-tg-button/30 resize-y"
          />
        </div>

        {/* Images */}
        <div>
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
        <div>
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

        {/* Discussion Prompt */}
        <div>
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
    </div>
  );
}
