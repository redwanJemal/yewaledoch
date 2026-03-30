import { useState, useEffect, useCallback } from 'react';
import { Check } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useTelegram } from '@/lib/telegram';
import { notificationsApi } from '@/lib/api';
import type { Notification } from '@/lib/api';
import { EmptyState } from '@/components/EmptyState';

interface NotificationsPageProps {
  onPostTap: (postId: string) => void;
}

function groupByDate(notifications: Notification[], t: (key: string) => string) {
  const groups: { label: string; items: Notification[] }[] = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 6 * 86400000);

  const buckets: Record<string, Notification[]> = {};
  const order: string[] = [];

  for (const n of notifications) {
    const d = new Date(n.created_at);
    let label: string;
    if (d >= today) label = t('notif.today');
    else if (d >= yesterday) label = t('notif.yesterday');
    else if (d >= weekAgo) label = t('notif.this_week');
    else label = t('notif.earlier');

    if (!buckets[label]) {
      buckets[label] = [];
      order.push(label);
    }
    buckets[label].push(n);
  }

  for (const label of order) {
    groups.push({ label, items: buckets[label] });
  }
  return groups;
}

const typeIcons: Record<string, string> = {
  like: '❤️',
  comment: '💬',
  reply: '↩️',
  mention: '@',
  system: '📢',
  expert_answer: '🏥',
  promotion: '🎉',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '< 1m';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}

export function NotificationsPage({ onPostTap }: NotificationsPageProps) {
  const { t } = useTranslation();
  const { haptic } = useTelegram();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async (pg: number, append = false) => {
    try {
      const res = await notificationsApi.list({ page: pg, per_page: 20 });
      setNotifications((prev) => append ? [...prev, ...res.notifications] : res.notifications);
      setHasMore(res.has_more);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications(1);
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    haptic.impact('light');
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // ignore
    } finally {
      setMarkingAll(false);
    }
  };

  const handleTap = async (notif: Notification) => {
    haptic.impact('light');
    if (!notif.is_read) {
      try {
        await notificationsApi.markRead([notif.id]);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
      } catch {
        // ignore
      }
    }
    const postId = notif.data?.post_id as string | undefined;
    if (postId) {
      onPostTap(postId);
    }
  };

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchNotifications(next, true);
  };

  // Pull to refresh
  const handleRefresh = () => {
    setLoading(true);
    setPage(1);
    fetchNotifications(1);
  };

  const hasUnread = notifications.some((n) => !n.is_read);

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-tg-section-bg rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <EmptyState
        icon="🔔"
        message={t('notif.empty')}
        actionLabel={t('btn.retry')}
        onAction={handleRefresh}
      />
    );
  }

  const groups = groupByDate(notifications, t);

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-tg-text">{t('nav.alerts')}</h1>
        {hasUnread && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="flex items-center gap-1 text-sm text-tg-button font-medium disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {t('notif.mark_all_read')}
          </button>
        )}
      </div>

      {/* Grouped notifications */}
      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="text-xs font-semibold text-tg-hint uppercase mb-2">{group.label}</p>
            <div className="space-y-2">
              {group.items.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleTap(notif)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors active:scale-[0.98] ${
                    notif.is_read ? 'bg-tg-section-bg' : 'bg-tg-button/5 ring-1 ring-tg-button/10'
                  }`}
                >
                  <span className="text-lg mt-0.5">{typeIcons[notif.type] || '📌'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium truncate ${notif.is_read ? 'text-tg-text' : 'text-tg-text'}`}>
                        {notif.title}
                      </p>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-tg-button flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-tg-hint line-clamp-2 mt-0.5">{notif.body}</p>
                    <p className="text-xs text-tg-hint/60 mt-1">{timeAgo(notif.created_at)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <button
          onClick={handleLoadMore}
          className="w-full mt-4 py-3 text-sm text-tg-button font-medium bg-tg-section-bg rounded-xl"
        >
          {t('btn.load_more')}
        </button>
      )}
    </div>
  );
}
