import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Heart,
  Bookmark,
  Share2,
  MessageCircle,
  ArrowLeft,
  ExternalLink,
  Pencil,
} from 'lucide-react';
import { postsApi, commentsApi } from '@/lib/api';
import type { User, Post } from '@/lib/api';
import { CategoryBadge } from '@/components/CategoryBadge';
import { CommentThread } from '@/components/CommentThread';
import { CommentInput } from '@/components/CommentInput';
import { EmptyState } from '@/components/EmptyState';
import { useTranslation } from '@/lib/i18n';
import { useTelegram, useBackButton } from '@/lib/telegram';
import { formatTimeAgo } from '@/lib/utils';
import { toast } from 'sonner';

interface PostDetailPageProps {
  postId: string;
  onBack: () => void;
  currentUser: User | null;
  onEdit?: (post: Post) => void;
}

export function PostDetailPage({ postId, onBack, currentUser, onEdit }: PostDetailPageProps) {
  const { t } = useTranslation();
  const { haptic, webApp } = useTelegram();
  const queryClient = useQueryClient();

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);

  // Telegram back button
  useBackButton(onBack);

  // Fetch post
  const {
    data: post,
    isLoading: postLoading,
    isError: postError,
  } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => postsApi.detail(postId),
  });

  // Sync local engagement state when post data loads
  useEffect(() => {
    if (post) {
      setLiked(post.is_liked);
      setLikeCount(post.like_count);
      setSaved(post.is_saved);
    }
  }, [post?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch comments
  const {
    data: commentsData,
    isLoading: commentsLoading,
    refetch: refetchComments,
  } = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => commentsApi.list(postId, { per_page: 50 }),
    enabled: !!post,
  });

  const comments = commentsData?.items ?? [];
  const canComment =
    !!currentUser &&
    ['member', 'contributor', 'expert', 'admin'].includes(currentUser.role);

  const handleLike = useCallback(async () => {
    haptic.impact('light');
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 300);

    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);

    try {
      const result = await postsApi.like(postId);
      setLiked(result.liked);
      setLikeCount(result.like_count);
    } catch {
      setLiked(prevLiked);
      setLikeCount(prevCount);
    }
  }, [liked, likeCount, postId, haptic]);

  const handleSave = useCallback(async () => {
    haptic.impact('light');
    const prevSaved = saved;
    setSaved(!saved);

    try {
      const result = await postsApi.save(postId);
      setSaved(result.saved);
      toast.success(result.saved ? t('post.saved') : t('post.unsaved'));
    } catch {
      setSaved(prevSaved);
    }
  }, [saved, postId, haptic, t]);

  const handleShare = useCallback(() => {
    haptic.impact('light');
    const botUsername = import.meta.env.VITE_BOT_USERNAME || 'YeWaledochBot';
    const shareUrl = `https://t.me/${botUsername}?startapp=p_${postId}`;

    if (webApp) {
      webApp.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(post?.title || '')}`
      );
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success(t('post.link_copied'));
    }
  }, [postId, post?.title, haptic, webApp, t]);

  const handleCommentSubmit = useCallback(
    async (body: string, isAnonymous: boolean) => {
      await commentsApi.create(postId, { body, is_anonymous: isAnonymous });
      haptic.notification('success');
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ['posts-feed'] });
    },
    [postId, haptic, refetchComments, queryClient]
  );

  const handleCommentReport = useCallback(
    async (commentId: string) => {
      const confirmed = await new Promise<boolean>((resolve) => {
        if (webApp) {
          webApp.showConfirm(t('report.confirm'), resolve);
        } else {
          resolve(confirm(t('report.confirm')));
        }
      });
      if (confirmed) {
        try {
          await commentsApi.report(commentId, 'inappropriate');
          toast.success(t('report.submitted'));
        } catch {
          toast.error(t('error.generic'));
        }
      }
    },
    [webApp, t]
  );

  const isOwner = !!currentUser && !!post?.author && currentUser.id === post.author.id;
  const isAdmin = !!currentUser && currentUser.role === 'admin';
  const canEdit = isOwner || isAdmin;

  // Loading state
  if (postLoading) {
    return (
      <div className="min-h-screen bg-tg-bg">
        <div className="p-4">
          <button onClick={onBack} className="mb-4">
            <ArrowLeft className="w-6 h-6 text-tg-text" />
          </button>
          <div className="animate-pulse space-y-3">
            <div className="h-5 w-24 bg-tg-secondary-bg rounded-full" />
            <div className="h-6 w-3/4 bg-tg-secondary-bg rounded" />
            <div className="h-4 w-full bg-tg-secondary-bg rounded" />
            <div className="h-4 w-full bg-tg-secondary-bg rounded" />
            <div className="h-4 w-2/3 bg-tg-secondary-bg rounded" />
            <div className="h-px bg-tg-secondary-bg my-4" />
            <div className="h-4 w-1/3 bg-tg-secondary-bg rounded" />
            <div className="h-20 w-full bg-tg-secondary-bg rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (postError || !post) {
    return (
      <div className="min-h-screen bg-tg-bg">
        <div className="p-4">
          <button onClick={onBack} className="mb-4">
            <ArrowLeft className="w-6 h-6 text-tg-text" />
          </button>
          <EmptyState
            icon="😕"
            message={t('error.not_found')}
            actionLabel={t('btn.back')}
            onAction={onBack}
          />
        </div>
      </div>
    );
  }

  const authorName = post.is_anonymous
    ? t('post.anonymous')
    : post.author
      ? [post.author.first_name, post.author.last_name].filter(Boolean).join(' ') || post.author.username || t('post.anonymous')
      : t('post.anonymous');

  const isExpert = post.author?.expert_verified ?? false;
  const sourceSubreddit = post.source_url
    ? post.source_url.match(/r\/([^/]+)/)?.[1]
    : null;

  return (
    <div className="min-h-screen bg-tg-bg pb-4">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-tg-bg/95 backdrop-blur-sm px-4 py-3 flex items-center gap-3 border-b border-tg-hint/10">
        <button onClick={onBack}>
          <ArrowLeft className="w-6 h-6 text-tg-text" />
        </button>
        <span className="text-sm font-medium text-tg-text truncate flex-1">{post.title}</span>
        {canEdit && onEdit && (
          <button onClick={() => onEdit(post)} className="p-1 text-tg-hint">
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Post content */}
      <div className="px-4 pt-4">
        {/* Category + meta */}
        <div className="flex items-center gap-2 mb-3">
          <CategoryBadge category={post.category} />
          {post.age_group && (
            <span className="text-xs text-tg-hint px-2 py-0.5 bg-tg-secondary-bg rounded-full">
              {post.age_group}
            </span>
          )}
          <span className="text-xs text-tg-hint ml-auto">
            {formatTimeAgo(post.published_at || post.created_at, t)}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-tg-text leading-tight mb-3">
          {post.title}
        </h1>

        {/* Author info */}
        <div className="flex items-center gap-2 mb-4">
          {post.author?.photo_url && !post.is_anonymous ? (
            <img
              src={post.author.photo_url}
              alt=""
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-tg-secondary-bg flex items-center justify-center">
              <span className="text-sm">👤</span>
            </div>
          )}
          <div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-tg-text">{authorName}</span>
              {isExpert && !post.is_anonymous && (
                <span className="text-blue-600">🏥</span>
              )}
            </div>
            {post.author && !post.is_anonymous && (
              <span className="text-xs text-tg-hint">
                {post.author.parenting_role && `${post.author.parenting_role} · `}
                {t('post.reputation')} {post.author.id ? '' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Images */}
        {post.images && post.images.length > 0 && (
          <div className="mb-4 -mx-4">
            {post.images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt=""
                className="w-full object-cover max-h-80"
              />
            ))}
          </div>
        )}

        {/* Body */}
        <div className="text-tg-text text-[15px] leading-relaxed whitespace-pre-wrap mb-4">
          {post.body}
        </div>

        {/* Discussion prompt */}
        {post.discussion_prompt && (
          <div className="bg-tg-secondary-bg rounded-xl p-3 mb-4">
            <p className="text-sm font-medium text-tg-accent">
              💬 {post.discussion_prompt}
            </p>
          </div>
        )}

        {/* Source attribution */}
        {sourceSubreddit && (
          <div className="flex items-center gap-1.5 text-xs text-tg-hint mb-4">
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{t('post.source_from')} r/{sourceSubreddit}</span>
          </div>
        )}

        {/* Engagement row */}
        <div className="flex items-center gap-1 py-3 border-t border-b border-tg-hint/10 mb-4">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm transition-all ${
              liked
                ? 'bg-red-50 text-red-500'
                : 'text-tg-hint'
            } ${likeAnimating ? 'scale-110' : ''}`}
          >
            <Heart
              className={`w-5 h-5 transition-all ${
                liked ? 'fill-red-500 text-red-500' : ''
              }`}
            />
            <span>{likeCount}</span>
          </button>

          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm ${
              saved
                ? 'bg-tg-button/10 text-tg-button'
                : 'text-tg-hint'
            }`}
          >
            <Bookmark
              className={`w-5 h-5 ${saved ? 'fill-tg-button text-tg-button' : ''}`}
            />
            <span>{t('btn.save')}</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm text-tg-hint ml-auto"
          >
            <Share2 className="w-5 h-5" />
            <span>{t('btn.share')}</span>
          </button>
        </div>

        {/* Comments section */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-5 h-5 text-tg-text" />
            <h2 className="text-base font-semibold text-tg-text">
              {t('comment.title')} ({post.comment_count})
            </h2>
          </div>

          {/* Comment input */}
          {canComment ? (
            <div className="mb-4">
              <CommentInput onSubmit={handleCommentSubmit} />
            </div>
          ) : (
            <p className="text-xs text-tg-hint mb-4">{t('comment.members_only')}</p>
          )}

          {/* Comments list */}
          {commentsLoading ? (
            <div className="animate-pulse space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-tg-secondary-bg rounded-full" />
                    <div className="h-3 w-20 bg-tg-secondary-bg rounded" />
                  </div>
                  <div className="h-4 w-full bg-tg-secondary-bg rounded" />
                  <div className="h-4 w-2/3 bg-tg-secondary-bg rounded" />
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-tg-hint text-center py-6">
              {t('empty.comments')}
            </p>
          ) : (
            <div className="divide-y divide-tg-hint/10">
              {comments.map((comment) => (
                <CommentThread
                  key={comment.id}
                  comment={comment}
                  postId={postId}
                  onReplyAdded={refetchComments}
                  onReport={handleCommentReport}
                  canComment={canComment}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
