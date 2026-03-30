import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
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

const CATEGORIES = Object.keys(CATEGORY_CONFIG);

interface CategorySelectorProps {
  selected: string | null;
  onSelect: (category: string) => void;
  placeholder?: string;
}

export function CategorySelector({ selected, onSelect, placeholder }: CategorySelectorProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const selectedConfig = selected ? CATEGORY_CONFIG[selected] : null;

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 bg-tg-secondary-bg rounded-xl text-sm transition-colors ${
          selected ? 'text-tg-text' : 'text-tg-hint'
        }`}
      >
        <span className="flex items-center gap-2">
          {selectedConfig && <span>{selectedConfig.icon}</span>}
          <span>{selected ? t(`cat.${selected}`) : placeholder || t('write.select_category')}</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-tg-hint transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown / Bottom sheet */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-tg-bg rounded-t-2xl shadow-2xl max-h-[60vh] overflow-y-auto animate-slide-up pb-safe">
            <div className="sticky top-0 bg-tg-bg px-4 pt-4 pb-2 border-b border-tg-hint/10">
              <div className="w-10 h-1 bg-tg-hint/30 rounded-full mx-auto mb-3" />
              <h3 className="text-tg-text font-semibold">{t('write.select_category')}</h3>
            </div>

            <div className="p-2">
              {CATEGORIES.map((cat) => {
                const config = CATEGORY_CONFIG[cat];
                const isSelected = selected === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      onSelect(cat);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                      isSelected ? 'bg-tg-button/10' : 'active:bg-tg-secondary-bg'
                    }`}
                  >
                    <span className="text-xl">{config.icon}</span>
                    <span className={`text-sm font-medium flex-1 ${isSelected ? 'text-tg-button' : 'text-tg-text'}`}>
                      {t(`cat.${cat}`)}
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-tg-button" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
