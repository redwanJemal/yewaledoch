import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { postsApi } from '@/lib/api';
import type { PostFeedParams } from '@/lib/api';
import { PostCard, PostCardSkeleton } from '@/components/PostCard';
import { EmptyState } from '@/components/EmptyState';
import { useTranslation } from '@/lib/i18n';

interface HomePageProps {
  onPostTap: (postId: string) => void;
}

export function HomePage({ onPostTap }: HomePageProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pull-to-refresh state
  const touchStartY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const PULL_THRESHOLD = 80;

  // Debounce search input
  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 400);
  };

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  const feedParams: PostFeedParams = {
    per_page: 15,
    ...(debouncedSearch && { search: debouncedSearch }),
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
    queryKey: ['posts-feed', feedParams],
    queryFn: ({ pageParam }) =>
      postsApi.feed({ ...feedParams, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.page + 1 : undefined,
  });

  const allPosts = data?.pages.flatMap((p) => p.items) ?? [];
  const pinnedPost = allPosts.find((p) => p.is_pinned || p.is_featured);
  const regularPosts = pinnedPost
    ? allPosts.filter((p) => p.id !== pinnedPost.id)
    : allPosts;

  // Infinite scroll observer
  const observerRef = useRef<HTMLDivElement>(null);
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

  // Pull-to-refresh handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const scrollTop = scrollRef.current?.scrollTop ?? 0;
    if (scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === 0) return;
    const scrollTop = scrollRef.current?.scrollTop ?? 0;
    if (scrollTop > 0) return;
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.5, 120));
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      await refetch();
      setIsRefreshing(false);
    }
    setPullDistance(0);
    touchStartY.current = 0;
  }, [pullDistance, isRefreshing, refetch]);

  const handleLikeToggle = useCallback((_postId: string, _liked: boolean, _count: number) => {
    // React Query cache will be refreshed on next fetch
  }, []);

  return (
    <div
      ref={scrollRef}
      className="min-h-[60vh]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div
          className="flex items-center justify-center transition-all"
          style={{ height: pullDistance }}
        >
          <RefreshCw
            className={`w-5 h-5 text-tg-hint transition-transform ${
              pullDistance >= PULL_THRESHOLD ? 'text-tg-button' : ''
            } ${isRefreshing ? 'animate-spin' : ''}`}
            style={{
              transform: `rotate(${(pullDistance / PULL_THRESHOLD) * 360}deg)`,
            }}
          />
        </div>
      )}

      {/* Search bar */}
      <div className="sticky top-0 z-10 bg-tg-bg px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tg-hint" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t('home.search_placeholder')}
            className="w-full pl-9 pr-4 py-2.5 bg-tg-secondary-bg rounded-xl text-sm text-tg-text placeholder:text-tg-hint outline-none focus:ring-2 focus:ring-tg-button/30 transition-shadow"
          />
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
            icon="📝"
            message={t('empty.posts')}
            subMessage={t('home.empty_subtitle')}
          />
        ) : (
          <div className="space-y-3 mt-2">
            {/* Pinned/featured post */}
            {pinnedPost && !debouncedSearch && (
              <div className="relative">
                <PostCard
                  post={pinnedPost}
                  onTap={onPostTap}
                  onLikeToggle={handleLikeToggle}
                />
              </div>
            )}

            {/* Regular posts */}
            {regularPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onTap={onPostTap}
                onLikeToggle={handleLikeToggle}
              />
            ))}

            {/* Infinite scroll trigger */}
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
