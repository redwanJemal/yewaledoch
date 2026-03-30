import { useTranslation } from '@/lib/i18n';

export function LoadingScreen() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-tg-bg">
      <div className="w-10 h-10 border-3 border-tg-hint/30 border-t-tg-button rounded-full animate-spin mb-4" />
      <p className="text-tg-hint animate-pulse text-sm">{t('app.name')}</p>
    </div>
  );
}
