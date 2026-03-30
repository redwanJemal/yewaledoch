import { Heart, MessageCircle, Pin } from 'lucide-react';
import { CategoryBadge } from '@/components/CategoryBadge';
import { useTranslation } from '@/lib/i18n';
import { useTelegram } from '@/lib/telegram';
import { postsApi } from '@/lib/api';
import type { Post } from '@/lib/api';
import { formatTimeAgo } from '@/lib/utils';
import { useState } from 'react';

interface PostCardProps {
  post: Post;
  onTap: (postId: string) => void;
  onLikeToggle?: (postId: string, liked: boolean, count: number) => void;
}

export function PostCard({ post, onTap, onLikeToggle }: PostCardProps) {
  const { haptic } = useTelegram();
  const { t } = useTranslation();
  const [liked, setLiked] = useState(post.is_liked);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [liking, setLiking] = useState(false);

  const authorName = post.is_anonymous
    ? t('post.anonymous')
    : post.author
      ? [post.author.first_name, post.author.last_name].filter(Boolean).join(' ') || post.author.username || t('post.anonymous')
      : t('post.anonymous');

  const isExpert = post.author?.expert_verified ?? false;

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (liking) return;
    setLiking(true);
    haptic.impact('light');

    const prevLiked = liked;
    const prevCount = likeCount;
    const newLiked = !liked;
    const newCount = liked ? likeCount - 1 : likeCount + 1;
    setLiked(newLiked);
    setLikeCount(newCount);

    try {
      const result = await postsApi.like(post.id);
      setLiked(result.liked);
      setLikeCount(result.like_count);
      onLikeToggle?.(post.id, result.liked, result.like_count);
    } catch {
      setLiked(prevLiked);
      setLikeCount(prevCount);
    } finally {
      setLiking(false);
    }
  };

  return (
    <div
      onClick={() => onTap(post.id)}
      className="bg-tg-section-bg rounded-xl p-4 shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
    >
      {/* Top row: category + pinned */}
      <div className="flex items-center gap-2 mb-2">
        <CategoryBadge category={post.category} />
        {post.age_group && (
          <span className="text-xs text-tg-hint">{post.age_group}</span>
        )}
        {post.is_pinned && (
          <Pin className="w-3.5 h-3.5 text-tg-accent ml-auto" />
        )}
      </div>

      {/* Title */}
      <h3 className="text-tg-text font-semibold text-[15px] leading-tight line-clamp-2 mb-1">
        {post.title}
      </h3>

      {/* Body preview */}
      <p className="text-tg-hint text-sm leading-relaxed line-clamp-3 mb-3">
        {post.body}
      </p>

      {/* Author + engagement */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {post.author?.photo_url && !post.is_anonymous ? (
            <img
              src={post.author.photo_url}
              alt=""
              className="w-5 h-5 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-tg-secondary-bg flex items-center justify-center flex-shrink-0">
              <span className="text-xs">👤</span>
            </div>
          )}
          <span className="text-xs text-tg-hint truncate">
            {authorName}
            {isExpert && !post.is_anonymous && ' 🏥'}
            {post.author?.parenting_role && !post.is_anonymous && (
              <> · {post.author.parenting_role}</>
            )}
          </span>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={handleLike}
            className="flex items-center gap-1 text-xs"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${liked ? 'fill-red-500 text-red-500' : 'text-tg-hint'}`}
            />
            <span className={liked ? 'text-red-500' : 'text-tg-hint'}>{likeCount}</span>
          </button>
          <div className="flex items-center gap-1 text-xs text-tg-hint">
            <MessageCircle className="w-4 h-4" />
            <span>{post.comment_count}</span>
          </div>
          <span className="text-xs text-tg-hint">{formatTimeAgo(post.published_at || post.created_at, t)}</span>
        </div>
      </div>
    </div>
  );
}

export function PostCardSkeleton() {
  return (
    <div className="bg-tg-section-bg rounded-xl p-4 shadow-sm animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-5 w-20 bg-tg-secondary-bg rounded-full" />
      </div>
      <div className="h-4 w-3/4 bg-tg-secondary-bg rounded mb-2" />
      <div className="h-4 w-full bg-tg-secondary-bg rounded mb-1" />
      <div className="h-4 w-2/3 bg-tg-secondary-bg rounded mb-3" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-tg-secondary-bg rounded-full" />
          <div className="h-3 w-16 bg-tg-secondary-bg rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-3 w-8 bg-tg-secondary-bg rounded" />
          <div className="h-3 w-8 bg-tg-secondary-bg rounded" />
        </div>
      </div>
    </div>
  );
}
