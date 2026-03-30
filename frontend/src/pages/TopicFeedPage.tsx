import { useState, useRef, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { postsApi } from '@/lib/api';
import type { PostFeedParams } from '@/lib/api';
import { PostCard, PostCardSkeleton } from '@/components/PostCard';
import { EmptyState } from '@/components/EmptyState';
import { useTranslation } from '@/lib/i18n';
import { useTelegram } from '@/lib/telegram';

const CATEGORY_CONFIG: Record<string, { icon: string }> = {
  pregnancy: { icon: '🤰' },
  newborn: { icon: '👶' },
  toddler: { icon: '🧒' },
  school_age: { icon: '🎒' },
  teens: { icon: '🧑' },
  health: { icon: '🏥' },
  nutrition: { icon: '🍎' },
  dads: { icon: '👨' },
  mental_health: { icon: '🧠' },
  special_needs: { icon: '💙' },
  education: { icon: '📚' },
  fun_activities: { icon: '🎨' },
};

type SortType = 'latest' | 'popular' | 'trending';

interface TopicFeedPageProps {
  category: string;
  onBack: () => void;
  onPostTap: (postId: string) => void;
}

export function TopicFeedPage({ category, onBack, onPostTap }: TopicFeedPageProps) {
  const { t } = useTranslation();
  const { haptic } = useTelegram();
  const [sort, setSort] = useState<SortType>('latest');
  const observerRef = useRef<HTMLDivElement>(null);

  const config = CATEGORY_CONFIG[category] || { icon: '📋' };

  const feedParams: PostFeedParams = {
    per_page: 15,
    category,
    sort,
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['topic-feed', category, sort],
    queryFn: ({ pageParam }) =>
      postsApi.feed({ ...feedParams, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.page + 1 : undefined,
  });

  const allPosts = data?.pages.flatMap((p) => p.items) ?? [];

  // Infinite scroll
  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const sortTabs: { key: SortType; label: string }[] = [
    { key: 'latest', label: t('sort.latest') },
    { key: 'popular', label: t('sort.popular') },
    { key: 'trending', label: t('sort.discussed') },
  ];

  return (
    <div className="min-h-[60vh]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-tg-bg px-4 pt-3 pb-2">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => { haptic.impact('light'); onBack(); }}
            className="p-1 -ml-1 text-tg-hint"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{config.icon}</span>
            <h1 className="text-lg font-bold text-tg-text">{t(`cat.${category}`)}</h1>
          </div>
        </div>

        {/* Sort tabs */}
        <div className="flex gap-1 bg-tg-secondary-bg rounded-xl p-1">
          {sortTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { haptic.selection(); setSort(tab.key); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                sort === tab.key
                  ? 'bg-tg-bg text-tg-text shadow-sm'
                  : 'text-tg-hint'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        {isLoading ? (
          <div className="space-y-3 mt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <PostCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon="😕"
            message={t('error.generic')}
            subMessage={t('error.network')}
            actionLabel={t('btn.retry')}
            onAction={() => refetch()}
          />
        ) : allPosts.length === 0 ? (
          <EmptyState
            icon="📭"
            message={t('empty.posts')}
            subMessage={t('topics.empty_category')}
          />
        ) : (
          <div className="space-y-3 mt-2">
            {allPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onTap={onPostTap}
              />
            ))}
            <div ref={observerRef} className="h-4" />
            {isFetchingNextPage && (
              <div className="space-y-3">
                <PostCardSkeleton />
                <PostCardSkeleton />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
