import { useTranslation } from '@/lib/i18n';
import type { PostType } from '@/lib/api';

const POST_TYPES: { type: PostType; icon: string; labelKey: string }[] = [
  { type: 'question', icon: '❓', labelKey: 'post_type.question' },
  { type: 'tip', icon: '💡', labelKey: 'post_type.tip' },
  { type: 'story', icon: '📖', labelKey: 'post_type.story' },
  { type: 'discussion', icon: '💬', labelKey: 'post_type.discussion' },
];

interface PostTypeSelectorProps {
  selected: PostType | null;
  onSelect: (type: PostType) => void;
}

export function PostTypeSelector({ selected, onSelect }: PostTypeSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {POST_TYPES.map(({ type, icon, labelKey }) => (
        <button
          key={type}
          type="button"
          onClick={() => onSelect(type)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
            selected === type
              ? 'bg-tg-button text-tg-button-text'
              : 'bg-tg-secondary-bg text-tg-hint'
          }`}
        >
          <span>{icon}</span>
          <span>{t(labelKey)}</span>
        </button>
      ))}
    </div>
  );
}
