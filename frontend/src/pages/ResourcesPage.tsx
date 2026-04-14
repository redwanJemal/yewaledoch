import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useTelegram } from '@/lib/telegram';
import { resourcesApi } from '@/lib/api';
import type { VaccineScheduleGroup, MilestoneInfo } from '@/lib/api';

type ResourceSection = 'menu' | 'vaccines' | 'milestones' | 'recipes' | 'emergency' | 'pregnancy';

interface ResourcesPageProps {
  onBack: () => void;
}

const resourceCards: { key: ResourceSection; emoji: string; labelKey: string }[] = [
  { key: 'emergency', emoji: '📞', labelKey: 'resources.emergency' },
];

export function ResourcesPage({ onBack }: ResourcesPageProps) {
  const { t, language } = useTranslation();
  const { haptic } = useTelegram();
  const [section, setSection] = useState<ResourceSection>('menu');
  const [vaccines, setVaccines] = useState<VaccineScheduleGroup[]>([]);
  const [milestonesList, setMilestonesList] = useState<MilestoneInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const openSection = async (s: ResourceSection) => {
    haptic.impact('light');
    setSection(s);
    if (s === 'vaccines' && vaccines.length === 0) {
      setLoading(true);
      try {
        const data = await resourcesApi.vaccines();
        setVaccines(data);
      } catch { /* ignore */ }
      setLoading(false);
    } else if (s === 'milestones' && milestonesList.length === 0) {
      setLoading(true);
      try {
        const data = await resourcesApi.milestones();
        setMilestonesList(data);
      } catch { /* ignore */ }
      setLoading(false);
    }
  };

  const goBack = () => {
    haptic.impact('light');
    if (section === 'menu') {
      onBack();
    } else {
      setSection('menu');
    }
  };

  return (
    <div className="min-h-screen bg-tg-bg">
      <div className="sticky top-0 z-10 bg-tg-bg border-b border-tg-hint/10 px-4 py-3 flex items-center gap-3">
        <button onClick={goBack} className="p-1 text-tg-text">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-tg-text">{t('resources.title')}</h1>
      </div>

      <div className="p-4">
        {section === 'menu' && (
          <div className="grid grid-cols-2 gap-3">
            {resourceCards.map((card) => (
              <button
                key={card.key}
                onClick={() => openSection(card.key)}
                className="flex flex-col items-center gap-2 bg-tg-section-bg rounded-xl p-5 active:scale-[0.98] transition-transform"
              >
                <span className="text-3xl">{card.emoji}</span>
                <span className="text-sm font-medium text-tg-text text-center">{t(card.labelKey)}</span>
              </button>
            ))}
          </div>
        )}

        {section === 'vaccines' && (
          loading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-tg-section-bg rounded-xl animate-pulse" />)}</div>
          ) : (
            <div className="space-y-4">
              {vaccines.map((group) => (
                <div key={group.age_weeks}>
                  <p className="text-xs font-semibold text-tg-hint uppercase mb-2">
                    {group.age_weeks === 0 ? t('child.at_birth') : group.age}
                  </p>
                  <div className="space-y-2">
                    {group.vaccines.map((v) => (
                      <div key={`${v.name}-${v.dose}`} className="bg-tg-section-bg rounded-xl p-4">
                        <p className="text-sm font-semibold text-tg-text">
                          {language === 'am' ? v.name_am : v.name}
                          {v.dose > 1 && ` (${v.dose})`}
                        </p>
                        <p className="text-xs text-tg-hint mt-1">
                          {language === 'am' ? v.description_am : v.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {section === 'milestones' && (
          loading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-tg-section-bg rounded-xl animate-pulse" />)}</div>
          ) : (
            <div className="space-y-3">
              {milestonesList.map((m) => (
                <div key={m.type} className="bg-tg-section-bg rounded-xl p-4">
                  <p className="text-sm font-semibold text-tg-text">
                    {language === 'am' ? m.name_am : m.name_en}
                  </p>
                  <p className="text-xs text-tg-hint mt-1">
                    {m.age_months} {t('profile.months_old')} &middot; {m.category}
                  </p>
                </div>
              ))}
            </div>
          )
        )}

        {section === 'recipes' && (
          <div className="space-y-4">
            {[
              { title: language === 'am' ? 'የድንች እና ካሮት ንፁህ' : 'Potato & Carrot Puree', age: '6+ mo', desc: language === 'am' ? 'ድንች እና ካሮት አብስሉ ፣ ቀላቅሉ' : 'Boil potato and carrot, blend smooth' },
              { title: language === 'am' ? 'የሙዝ ገንፎ' : 'Banana Porridge', age: '6+ mo', desc: language === 'am' ? 'የበሰለ ሙዝ ከገንፎ ጋር ቀላቅሉ' : 'Mash ripe banana with porridge' },
              { title: language === 'am' ? 'የምስር ወጥ' : 'Lentil Stew', age: '8+ mo', desc: language === 'am' ? 'ምስር በቅመም ቀቅሉ' : 'Cook lentils with mild spices' },
              { title: language === 'am' ? 'የእንቁላል ገንፎ' : 'Egg Porridge', age: '8+ mo', desc: language === 'am' ? 'እንቁላል ከገንፎ ጋር ቀላቅሉ' : 'Mix egg into warm porridge' },
              { title: language === 'am' ? 'የአቮካዶ ንፁህ' : 'Avocado Mash', age: '6+ mo', desc: language === 'am' ? 'የበሰለ አቮካዶ ቀላቅሉ' : 'Mash ripe avocado until smooth' },
            ].map((recipe) => (
              <div key={recipe.title} className="bg-tg-section-bg rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-tg-text">{recipe.title}</p>
                  <span className="text-xs text-tg-hint bg-tg-secondary-bg px-2 py-0.5 rounded-full">{recipe.age}</span>
                </div>
                <p className="text-xs text-tg-hint mt-1">{recipe.desc}</p>
              </div>
            ))}
          </div>
        )}

        {section === 'emergency' && (
          <div className="space-y-3">
            {[
              { name: language === 'am' ? 'ብሔራዊ አምቡላንስ' : 'National Ambulance', phone: '907' },
              { name: language === 'am' ? 'ፖሊስ' : 'Police', phone: '991' },
              { name: language === 'am' ? 'እሳት አደጋ' : 'Fire Department', phone: '939' },
              { name: language === 'am' ? 'ቅዱስ ጳውሎስ ሆስፒታል' : "St. Paul's Hospital", phone: '+251 11 275 7065' },
              { name: language === 'am' ? 'ጥቁር አንበሳ ሆስፒታል' : 'Tikur Anbessa Hospital', phone: '+251 11 551 1211' },
              { name: language === 'am' ? 'የህፃናት ድንገተኛ' : 'Pediatric Emergency', phone: '8335' },
            ].map((contact) => (
              <a
                key={contact.phone}
                href={`tel:${contact.phone}`}
                className="flex items-center gap-3 bg-tg-section-bg rounded-xl p-4 active:scale-[0.98] transition-transform"
              >
                <span className="text-xl">📞</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-tg-text">{contact.name}</p>
                  <p className="text-xs text-tg-button">{contact.phone}</p>
                </div>
              </a>
            ))}
          </div>
        )}

        {section === 'pregnancy' && (
          <div className="space-y-4">
            {[
              { title: language === 'am' ? 'የመጀመሪያ ሶስት ወራት (1-12 ሳምንት)' : 'First Trimester (1-12 weeks)', items: language === 'am' ? ['ፎሊክ አሲድ ይውሰዱ', 'ቅድመ ወሊድ ክትትል ይጀምሩ', 'ጤናማ ምግብ ይመገቡ'] : ['Take folic acid', 'Start prenatal care', 'Eat a balanced diet'] },
              { title: language === 'am' ? 'ሁለተኛ ሶስት ወራት (13-27 ሳምንት)' : 'Second Trimester (13-27 weeks)', items: language === 'am' ? ['የአልትራሳውንድ ምርመራ', 'ለህፃኑ ክፍል ያዘጋጁ', 'ቀለል ያለ የአካል ብቃት'] : ['Ultrasound scan', 'Prepare baby room', 'Light exercise'] },
              { title: language === 'am' ? 'ሶስተኛ ሶስት ወራት (28-40 ሳምንት)' : 'Third Trimester (28-40 weeks)', items: language === 'am' ? ['የወሊድ ቦርሳ ያዘጋጁ', 'የወሊድ ምልክቶች ይወቁ', 'ሆስፒታል ይምረጡ'] : ['Pack hospital bag', 'Learn labor signs', 'Choose hospital'] },
            ].map((trimester) => (
              <div key={trimester.title} className="bg-tg-section-bg rounded-xl p-4">
                <p className="text-sm font-semibold text-tg-text mb-2">{trimester.title}</p>
                <ul className="space-y-1">
                  {trimester.items.map((item) => (
                    <li key={item} className="text-xs text-tg-hint flex items-start gap-2">
                      <span className="text-tg-button mt-0.5">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
