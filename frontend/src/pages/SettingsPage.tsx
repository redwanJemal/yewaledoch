import { useState } from 'react';
import { ArrowLeft, Globe, Bell, UserCog, Info, HelpCircle, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useTelegram } from '@/lib/telegram';
import { usersApi } from '@/lib/api';
import type { User } from '@/lib/api';

interface SettingsPageProps {
  user: User;
  onBack: () => void;
  onUserUpdate: () => void;
}

const parentingRoles = ['mom', 'dad', 'guardian', 'expecting'] as const;

export function SettingsPage({ user, onBack, onUserUpdate }: SettingsPageProps) {
  const { t, language, setLanguage } = useTranslation();
  const { haptic } = useTelegram();
  const [editMode, setEditMode] = useState(false);
  const [firstName, setFirstName] = useState(user.first_name || '');
  const [lastName, setLastName] = useState(user.last_name || '');
  const [city, setCity] = useState(user.city || '');
  const [parentingRole, setParentingRole] = useState(user.parenting_role || '');
  const [saving, setSaving] = useState(false);

  // Notification prefs from user.settings
  const [notifyLikes, setNotifyLikes] = useState(user.settings?.notify_likes !== false);
  const [notifyComments, setNotifyComments] = useState(user.settings?.notify_comments !== false);
  const [notifyReplies, setNotifyReplies] = useState(user.settings?.notify_replies !== false);

  const handleSaveProfile = async () => {
    setSaving(true);
    haptic.impact('light');
    try {
      await usersApi.updateProfile({
        first_name: firstName,
        last_name: lastName,
        city: city || undefined,
        parenting_role: parentingRole || undefined,
        language,
      });
      onUserUpdate();
      setEditMode(false);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const toggleLang = () => {
    haptic.selection();
    setLanguage(language === 'am' ? 'en' : 'am');
  };

  const ToggleSwitch = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className={`w-11 h-6 rounded-full transition-colors relative ${on ? 'bg-tg-button' : 'bg-tg-hint/30'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );

  return (
    <div className="min-h-screen bg-tg-bg">
      <div className="sticky top-0 z-10 bg-tg-bg border-b border-tg-hint/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => { haptic.impact('light'); onBack(); }} className="p-1 text-tg-text">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-tg-text">{t('settings.title')}</h1>
      </div>

      <div className="p-4 space-y-5">
        {/* Language */}
        <div className="bg-tg-section-bg rounded-xl p-4">
          <button onClick={toggleLang} className="w-full flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-tg-button" />
              <span className="text-sm font-medium text-tg-text">{t('settings.language')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-tg-hint">{language === 'am' ? 'አማርኛ' : 'English'}</span>
              <ChevronRight className="w-4 h-4 text-tg-hint" />
            </div>
          </button>
        </div>

        {/* Notification Preferences */}
        <div className="bg-tg-section-bg rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-3 mb-1">
            <Bell className="w-5 h-5 text-tg-button" />
            <span className="text-sm font-semibold text-tg-text">{t('settings.notifications')}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-tg-text">{t('settings.notify_likes')}</span>
            <ToggleSwitch on={notifyLikes} onToggle={() => setNotifyLikes(!notifyLikes)} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-tg-text">{t('settings.notify_comments')}</span>
            <ToggleSwitch on={notifyComments} onToggle={() => setNotifyComments(!notifyComments)} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-tg-text">{t('settings.notify_replies')}</span>
            <ToggleSwitch on={notifyReplies} onToggle={() => setNotifyReplies(!notifyReplies)} />
          </div>
        </div>

        {/* Edit Profile */}
        <div className="bg-tg-section-bg rounded-xl p-4">
          {!editMode ? (
            <button
              onClick={() => { haptic.impact('light'); setEditMode(true); }}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <UserCog className="w-5 h-5 text-tg-button" />
                <span className="text-sm font-medium text-tg-text">{t('settings.edit_profile')}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-tg-hint" />
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 mb-2">
                <UserCog className="w-5 h-5 text-tg-button" />
                <span className="text-sm font-semibold text-tg-text">{t('settings.edit_profile')}</span>
              </div>
              <div>
                <label className="block text-xs text-tg-hint mb-1">{t('settings.name')}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First"
                    className="flex-1 px-3 py-2 bg-tg-bg text-tg-text rounded-lg text-sm outline-none"
                  />
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last"
                    className="flex-1 px-3 py-2 bg-tg-bg text-tg-text rounded-lg text-sm outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-tg-hint mb-1">{t('settings.city')}</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Addis Ababa"
                  className="w-full px-3 py-2 bg-tg-bg text-tg-text rounded-lg text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-tg-hint mb-1">{t('settings.parenting_role')}</label>
                <div className="flex gap-2 flex-wrap">
                  {parentingRoles.map((role) => (
                    <button
                      key={role}
                      onClick={() => setParentingRole(role)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        parentingRole === role
                          ? 'bg-tg-button text-tg-button-text'
                          : 'bg-tg-bg text-tg-text'
                      }`}
                    >
                      {t(`profile.role.${role}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setEditMode(false)}
                  className="flex-1 py-2 text-sm text-tg-hint bg-tg-bg rounded-lg"
                >
                  {t('btn.cancel')}
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex-1 py-2 text-sm font-medium text-tg-button-text bg-tg-button rounded-lg disabled:opacity-50"
                >
                  {saving ? '...' : t('btn.save')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* About */}
        <div className="bg-tg-section-bg rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-tg-button" />
            <span className="text-sm font-semibold text-tg-text">{t('settings.about')}</span>
          </div>
          <p className="text-xs text-tg-hint">{t('settings.about_text')}</p>
          <p className="text-xs text-tg-hint/60">{t('settings.version')} 1.0.0</p>
        </div>

        {/* Help */}
        <div className="bg-tg-section-bg rounded-xl p-4">
          <a
            href="https://t.me/YeWaledochBot"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-tg-button" />
              <span className="text-sm font-medium text-tg-text">{t('settings.help')}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-tg-hint" />
          </a>
        </div>
      </div>
    </div>
  );
}
