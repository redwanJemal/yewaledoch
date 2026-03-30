import { useState } from 'react';
import { Heart, MessageCircle, Flag } from 'lucide-react';
import { useTelegram } from '@/lib/telegram';
import { commentsApi } from '@/lib/api';
import type { Comment } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { formatTimeAgo } from '@/lib/utils';
import { CommentInput } from '@/components/CommentInput';

interface CommentThreadProps {
  comment: Comment;
  postId: string;
  depth?: number;
  onReplyAdded: () => void;
  onReport: (commentId: string) => void;
  canComment: boolean;
}

export function CommentThread({
  comment,
  postId,
  depth = 0,
  onReplyAdded,
  onReport,
  canComment,
}: CommentThreadProps) {
  const { haptic } = useTelegram();
  const { t } = useTranslation();
  const [liked, setLiked] = useState(comment.is_liked);
  const [likeCount, setLikeCount] = useState(comment.like_count);
  const [liking, setLiking] = useState(false);
  const [showReply, setShowReply] = useState(false);

  const isExpert = comment.author?.expert_verified ?? false;
  const authorName = comment.is_anonymous
    ? t('post.anonymous')
    : comment.author
      ? [comment.author.first_name, comment.author.last_name].filter(Boolean).join(' ') || comment.author.username || t('post.anonymous')
      : t('post.anonymous');

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    haptic.impact('light');

    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);

    try {
      const result = await commentsApi.like(comment.id);
      setLiked(result.liked);
      setLikeCount(result.like_count);
    } catch {
      setLiked(prevLiked);
      setLikeCount(prevCount);
    } finally {
      setLiking(false);
    }
  };

  const handleReplySubmit = async (body: string, isAnonymous: boolean) => {
    await commentsApi.create(postId, {
      body,
      parent_id: comment.id,
      is_anonymous: isAnonymous,
    });
    setShowReply(false);
    onReplyAdded();
  };

  const maxDepth = 2;

  return (
    <div className={depth > 0 ? 'ml-6 border-l-2 border-tg-secondary-bg pl-3' : ''}>
      <div
        className={`py-3 ${
          isExpert && !comment.is_anonymous
            ? 'bg-blue-50 dark:bg-blue-900/20 -mx-2 px-2 rounded-lg'
            : ''
        }`}
      >
        {/* Author row */}
        <div className="flex items-center gap-2 mb-1">
          {comment.author?.photo_url && !comment.is_anonymous ? (
            <img
              src={comment.author.photo_url}
              alt=""
              className="w-6 h-6 rounded-full object-cover"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-tg-secondary-bg flex items-center justify-center">
              <span className="text-xs">👤</span>
            </div>
          )}
          <span className="text-sm font-medium text-tg-text">
            {authorName}
            {isExpert && !comment.is_anonymous && (
              <span className="ml-1 text-blue-600">🏥</span>
            )}
          </span>
          <span className="text-xs text-tg-hint">
            {formatTimeAgo(comment.created_at, t)}
          </span>
        </div>

        {/* Comment body */}
        <p className="text-sm text-tg-text leading-relaxed mb-2">{comment.body}</p>

        {/* Actions row */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleLike}
            className="flex items-center gap-1 text-xs"
          >
            <Heart
              className={`w-3.5 h-3.5 ${
                liked ? 'fill-red-500 text-red-500' : 'text-tg-hint'
              }`}
            />
            <span className={liked ? 'text-red-500' : 'text-tg-hint'}>
              {likeCount > 0 ? likeCount : ''}
            </span>
          </button>

          {canComment && depth < maxDepth && (
            <button
              onClick={() => {
                haptic.selection();
                setShowReply(!showReply);
              }}
              className="flex items-center gap-1 text-xs text-tg-hint"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{t('btn.reply')}</span>
            </button>
          )}

          <button
            onClick={() => onReport(comment.id)}
            className="flex items-center gap-1 text-xs text-tg-hint ml-auto"
          >
            <Flag className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Inline reply */}
        {showReply && (
          <div className="mt-2">
            <CommentInput
              onSubmit={handleReplySubmit}
              placeholder={t('comment.reply_placeholder')}
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div>
          {comment.replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              postId={postId}
              depth={depth + 1}
              onReplyAdded={onReplyAdded}
              onReport={onReport}
              canComment={canComment}
            />
          ))}
        </div>
      )}
    </div>
  );
}
