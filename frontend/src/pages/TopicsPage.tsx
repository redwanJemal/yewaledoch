import { useQuery } from '@tanstack/react-query';
import { resourcesApi } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';

const CATEGORY_CONFIG: Record<string, { icon: string; color: string }> = {
  pregnancy: { icon: '🤰', color: 'bg-pink-50' },
  newborn: { icon: '👶', color: 'bg-blue-50' },
  toddler: { icon: '🧒', color: 'bg-green-50' },
  school_age: { icon: '🎒', color: 'bg-yellow-50' },
  teens: { icon: '🧑', color: 'bg-purple-50' },
  health: { icon: '🏥', color: 'bg-red-50' },
  nutrition: { icon: '🍎', color: 'bg-orange-50' },
  dads: { icon: '👨', color: 'bg-indigo-50' },
  mental_health: { icon: '🧠', color: 'bg-teal-50' },
  special_needs: { icon: '💙', color: 'bg-cyan-50' },
  education: { icon: '📚', color: 'bg-amber-50' },
  fun_activities: { icon: '🎨', color: 'bg-lime-50' },
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
            const config = CATEGORY_CONFIG[cat.slug] || { icon: '📋', color: 'bg-gray-50' };
            return (
              <button
                key={cat.slug}
                onClick={() => onCategoryTap(cat.slug)}
                className={`${config.color} rounded-xl p-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform`}
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
