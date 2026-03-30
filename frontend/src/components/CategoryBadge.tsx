import { useTranslation } from '@/lib/i18n';

const CATEGORY_CONFIG: Record<string, { icon: string; color: string }> = {
  pregnancy: { icon: '🤰', color: 'bg-pink-100 text-pink-700' },
  newborn: { icon: '👶', color: 'bg-blue-100 text-blue-700' },
  toddler: { icon: '🧒', color: 'bg-green-100 text-green-700' },
  school_age: { icon: '🎒', color: 'bg-yellow-100 text-yellow-700' },
  teens: { icon: '🧑', color: 'bg-purple-100 text-purple-700' },
  health: { icon: '🏥', color: 'bg-red-100 text-red-700' },
  nutrition: { icon: '🍎', color: 'bg-orange-100 text-orange-700' },
  dads: { icon: '👨', color: 'bg-indigo-100 text-indigo-700' },
  mental_health: { icon: '🧠', color: 'bg-teal-100 text-teal-700' },
  special_needs: { icon: '💙', color: 'bg-cyan-100 text-cyan-700' },
  education: { icon: '📚', color: 'bg-amber-100 text-amber-700' },
  fun_activities: { icon: '🎨', color: 'bg-lime-100 text-lime-700' },
};

interface CategoryBadgeProps {
  category: string;
  size?: 'sm' | 'md';
}

export function CategoryBadge({ category, size = 'sm' }: CategoryBadgeProps) {
  const { t } = useTranslation();
  const config = CATEGORY_CONFIG[category] || { icon: '📋', color: 'bg-gray-100 text-gray-700' };
  const label = t(`cat.${category}`);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${config.color} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
    >
      <span>{config.icon}</span>
      <span>{label}</span>
    </span>
  );
}
