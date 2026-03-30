import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useTelegram } from '@/lib/telegram';
import { postsApi } from '@/lib/api';
import type { Post } from '@/lib/api';
import { PostCard, PostCardSkeleton } from '@/components/PostCard';
import { EmptyState } from '@/components/EmptyState';

interface SavedPostsPageProps {
  onBack: () => void;
  onPostTap: (postId: string) => void;
}

export function SavedPostsPage({ onBack, onPostTap }: SavedPostsPageProps) {
  const { t } = useTranslation();
  const { haptic } = useTelegram();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    postsApi.saved({ page: 1, per_page: 20 })
      .then((res) => {
        setPosts(res.items);
        setHasMore(res.has_more);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    postsApi.saved({ page: next, per_page: 20 })
      .then((res) => {
        setPosts((prev) => [...prev, ...res.items]);
        setHasMore(res.has_more);
      })
      .catch(() => {});
  };

  return (
    <div className="min-h-screen bg-tg-bg">
      <div className="sticky top-0 z-10 bg-tg-bg border-b border-tg-hint/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => { haptic.impact('light'); onBack(); }} className="p-1 text-tg-text">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-tg-text">{t('profile.saved_posts')}</h1>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          [1, 2, 3].map((i) => <PostCardSkeleton key={i} />)
        ) : posts.length === 0 ? (
          <EmptyState icon="🔖" message={t('empty.saved')} />
        ) : (
          <>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onTap={onPostTap} />
            ))}
            {hasMore && (
              <button
                onClick={loadMore}
                className="w-full py-3 text-sm text-tg-button font-medium bg-tg-section-bg rounded-xl"
              >
                {t('btn.load_more')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
