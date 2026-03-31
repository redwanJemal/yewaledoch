import { useQuery } from '@tanstack/react-query';
import { resourcesApi } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';

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

interface TopicsPageProps {
  onCategoryTap: (category: string) => void;
}

export function TopicsPage({ onCategoryTap }: TopicsPageProps) {
  const { t, language } = useTranslation();

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: resourcesApi.categories,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="px-4 pt-4 pb-4">
      {/* Header */}
      <h1 className="text-xl font-bold text-tg-text mb-1">{t('nav.topics')}</h1>
      <p className="text-sm text-tg-hint mb-4">{t('topics.subtitle')}</p>

      {/* Category Grid */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-tg-secondary-bg rounded-xl p-4 animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {(categories || []).map((cat) => {
            const config = CATEGORY_CONFIG[cat.slug] || { icon: '📋' };
            return (
              <button
                key={cat.slug}
                onClick={() => onCategoryTap(cat.slug)}
                className="bg-tg-section-bg rounded-xl p-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
              >
                <span className="text-2xl">{config.icon}</span>
                <span className="text-xs font-semibold text-tg-text text-center leading-tight">
                  {language === 'am' ? cat.name_am : cat.name_en}
                </span>
                <span className="text-[10px] text-tg-hint text-center leading-tight">
                  {language === 'am' ? cat.name_en : cat.name_am}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
