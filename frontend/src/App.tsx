import { useState, useEffect, useRef } from 'react';
import { Home, FolderOpen, PenSquare, Bell, User } from 'lucide-react';
import { useTelegram } from '@/lib/telegram';
import { useAuth } from '@/hooks/useAuth';
import { notificationsApi } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { HomePage } from '@/pages/HomePage';
import { PostDetailPage } from '@/pages/PostDetailPage';
import { TopicsPage } from '@/pages/TopicsPage';
import { TopicFeedPage } from '@/pages/TopicFeedPage';
import { CreatePostPage, LockedWritePage } from '@/pages/CreatePostPage';

// Placeholder pages — will be implemented in task 12
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-tg-hint text-lg">{title}</p>
    </div>
  );
}

type TabType = 'home' | 'topics' | 'write' | 'alerts' | 'me';
type PageType = 'main' | 'post-detail' | 'topic-feed' | 'profile' | 'settings' | 'child-profile' | 'saved-posts' | 'my-posts';

interface PageState {
  type: PageType;
  postId?: string;
  userId?: string;
  childId?: string;
  category?: string;
}

function AppContent() {
  const { isLoading, isAuthenticated, error, user } = useAuth();
  const { haptic, isInTelegram, webApp } = useTelegram();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [page, setPage] = useState<PageState>({ type: 'main' });
  const [unreadCount, setUnreadCount] = useState(0);
  const lastUnreadRef = useRef(0);

  // Handle deep links — ?startapp=p_{postId}
  useEffect(() => {
    if (isLoading) return;

    const handleDeepLink = () => {
      const startParam = webApp?.initDataUnsafe?.start_param;
      if (startParam?.startsWith('p_')) {
        const postId = startParam.slice(2);
        setPage({ type: 'post-detail', postId });
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const startapp = urlParams.get('startapp');
      if (startapp?.startsWith('p_')) {
        const postId = startapp.slice(2);
        setPage({ type: 'post-detail', postId });
        return;
      }
    };

    handleDeepLink();
  }, [webApp, isLoading]);

  // Poll for unread notifications
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkUnread = async () => {
      try {
        const result = await notificationsApi.list({ per_page: 1 });
        const count = result.unread_count;
        setUnreadCount(count);

        if (count > lastUnreadRef.current && lastUnreadRef.current > 0) {
          haptic.notification('success');
        }
        lastUnreadRef.current = count;
      } catch {
        // Ignore polling errors
      }
    };

    checkUnread();
    const interval = setInterval(checkUnread, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated, haptic]);

  // Block access outside Telegram (except in dev)
  const isDev = import.meta.env.DEV;
  if (!isInTelegram && !isDev) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-tg-bg to-tg-secondary-bg">
        <p className="text-6xl mb-4">👶</p>
        <h1 className="text-2xl font-bold text-tg-text mb-2">{t('app.name')}</h1>
        <p className="text-tg-hint mb-6">{t('app.tagline')}</p>
        <div className="bg-tg-secondary-bg p-6 rounded-2xl max-w-sm">
          <p className="text-tg-text mb-4">{t('auth.telegram_only')}</p>
          <a
            href="https://t.me/YeWaledochBot"
            className="inline-block px-6 py-3 bg-[#0088cc] text-white rounded-xl font-medium"
          >
            {t('auth.open_telegram')}
          </a>
        </div>
      </div>
    );
  }

  const handleTabChange = (tab: TabType) => {
    haptic.selection();
    setActiveTab(tab);
    setPage({ type: 'main' });

    if (tab === 'alerts') {
      setUnreadCount(0);
      lastUnreadRef.current = 0;
    }
  };

  // Check if user can write (contributor+)
  const canWrite = user && ['contributor', 'expert', 'admin'].includes(user.role);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-tg-bg">
        <p className="text-4xl mb-4">👶</p>
        <p className="text-tg-hint animate-pulse">{t('app.name')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="text-4xl mb-4">😕</p>
        <h1 className="text-xl font-bold text-tg-text mb-2">{t('error.generic')}</h1>
        <p className="text-tg-hint mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-tg-button text-tg-button-text rounded-lg"
        >
          {t('btn.retry')}
        </button>
      </div>
    );
  }

  // Render overlay pages
  if (page.type === 'post-detail' && page.postId) {
    return (
      <PostDetailPage
        postId={page.postId}
        onBack={() => setPage({ type: 'main' })}
        currentUser={user}
      />
    );
  }

  if (page.type === 'topic-feed' && page.category) {
    return (
      <div className="min-h-screen bg-tg-bg text-tg-text">
        <TopicFeedPage
          category={page.category}
          onBack={() => setPage({ type: 'main' })}
          onPostTap={(postId) => setPage({ type: 'post-detail', postId })}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tg-bg text-tg-text">
      {/* Main Content */}
      <main className="pb-20">
        {activeTab === 'home' && (
          <HomePage onPostTap={(postId) => setPage({ type: 'post-detail', postId })} />
        )}
        {activeTab === 'topics' && (
          <TopicsPage
            onCategoryTap={(category) => setPage({ type: 'topic-feed', category })}
          />
        )}
        {activeTab === 'write' && (
          canWrite && user
            ? <CreatePostPage
                user={user}
                onSuccess={(postId) => setPage({ type: 'post-detail', postId })}
              />
            : user
              ? <LockedWritePage user={user} />
              : <PlaceholderPage title={t('nav.write')} />
        )}
        {activeTab === 'alerts' && (
          <PlaceholderPage title={t('nav.alerts')} />
        )}
        {activeTab === 'me' && (
          <PlaceholderPage title={t('nav.me')} />
        )}
      </main>

      {/* Bottom Navigation */}
      {isAuthenticated && page.type === 'main' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-tg-secondary-bg border-t border-tg-hint/10 px-2 pt-1 pb-safe z-50">
          <div className="flex justify-around items-center pb-2">
            <NavItem
              icon={<Home className="w-6 h-6" />}
              label={t('nav.home')}
              isActive={activeTab === 'home'}
              onClick={() => handleTabChange('home')}
            />
            <NavItem
              icon={<FolderOpen className="w-6 h-6" />}
              label={t('nav.topics')}
              isActive={activeTab === 'topics'}
              onClick={() => handleTabChange('topics')}
            />
            <NavItem
              icon={<PenSquare className="w-6 h-6" />}
              label={t('nav.write')}
              isActive={activeTab === 'write'}
              onClick={() => handleTabChange('write')}
            />
            <NavItem
              icon={<Bell className="w-6 h-6" />}
              label={t('nav.alerts')}
              isActive={activeTab === 'alerts'}
              onClick={() => handleTabChange('alerts')}
              badge={unreadCount > 0 ? unreadCount : undefined}
            />
            <NavItem
              icon={<User className="w-6 h-6" />}
              label={t('nav.me')}
              isActive={activeTab === 'me'}
              onClick={() => handleTabChange('me')}
            />
          </div>
        </nav>
      )}
    </div>
  );
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
}

function NavItem({ icon, label, isActive, onClick, badge }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors relative ${
        isActive ? 'text-tg-button' : 'text-tg-hint'
      }`}
    >
      <div className="relative">
        {icon}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className="text-xs mt-1">{label}</span>
    </button>
  );
}

export default AppContent;
