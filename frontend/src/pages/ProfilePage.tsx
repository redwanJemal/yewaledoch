import { PenSquare, Bookmark, BookOpen, Settings } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useTelegram } from '@/lib/telegram';
import type { User } from '@/lib/api';

const parentingRoleLabels: Record<string, string> = {
  mom: 'profile.role.mother',
  dad: 'profile.role.father',
  guardian: 'profile.role.guardian',
  expecting: 'profile.role.expecting',
};


interface ProfilePageProps {
  user: User;
  onNavigate: (page: string, data?: Record<string, string>) => void;
}

export function ProfilePage({ user, onNavigate }: ProfilePageProps) {
  const { t } = useTranslation();
  const { haptic } = useTelegram();

  const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'User';
  const roleKey = user.parenting_role ? parentingRoleLabels[user.parenting_role] : null;

  const quickLinks = [
    { icon: <PenSquare className="w-5 h-5" />, label: t('profile.my_posts'), page: 'my-posts', emoji: '📝' },
    { icon: <Bookmark className="w-5 h-5" />, label: t('profile.saved_posts'), page: 'saved-posts', emoji: '🔖' },
    { icon: <BookOpen className="w-5 h-5" />, label: t('profile.resources'), page: 'resources', emoji: '📖' },
    { icon: <Settings className="w-5 h-5" />, label: t('profile.settings'), page: 'settings', emoji: '⚙️' },
  ];

  return (
    <div className="p-4 space-y-5">
      {/* User Info */}
      <div className="bg-tg-section-bg rounded-2xl p-5">
        <div className="flex items-center gap-4">
          {user.photo_url ? (
            <img src={user.photo_url} alt="" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-tg-button/20 flex items-center justify-center text-2xl">
              👤
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-tg-text truncate">{displayName}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs px-2 py-0.5 rounded-full bg-tg-button/10 text-tg-button font-medium">
                {user.role}
              </span>
              {roleKey && (
                <span className="text-xs text-tg-hint">{t(roleKey)}</span>
              )}
            </div>
            {user.city && (
              <p className="text-xs text-tg-hint mt-1">📍 {user.city}</p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex justify-around mt-4 pt-4 border-t border-tg-hint/10">
          <div className="text-center">
            <p className="text-lg font-bold text-tg-text">{user.post_count}</p>
            <p className="text-xs text-tg-hint">{t('profile.posts_count')}</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-tg-text">{user.comment_count}</p>
            <p className="text-xs text-tg-hint">{t('profile.comments_count')}</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-tg-text">{user.reputation}</p>
            <p className="text-xs text-tg-hint">{t('profile.reputation_count')}</p>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3">
        {quickLinks.map((link) => (
          <button
            key={link.page}
            onClick={() => {
              haptic.impact('light');
              onNavigate(link.page);
            }}
            className="flex items-center gap-3 bg-tg-section-bg rounded-xl p-4 active:scale-[0.98] transition-transform"
          >
            <span className="text-xl">{link.emoji}</span>
            <span className="text-sm font-medium text-tg-text">{link.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
