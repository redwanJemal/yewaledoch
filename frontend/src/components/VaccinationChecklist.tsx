import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useTelegram } from '@/lib/telegram';
import { childrenApi } from '@/lib/api';
import type { Vaccination, VaccineInfo } from '@/lib/api';

interface VaccinationChecklistProps {
  childId: string;
  childDob: string;
  vaccinations: Vaccination[];
  vaccineSchedule: VaccineInfo[];
  onUpdate: (updated: Vaccination) => void;
}

interface ScheduleItem {
  vaccineName: string;
  nameAm: string;
  dose: number;
  scheduledDate: Date;
  weeksLabel: string;
  vaccination: Vaccination | null;
  status: 'completed' | 'overdue' | 'upcoming' | 'future';
}

function buildScheduleItems(
  dob: string,
  vaccineSchedule: VaccineInfo[],
  vaccinations: Vaccination[],
  t: (key: string) => string,
): ScheduleItem[] {
  const birthDate = new Date(dob);
  const now = new Date();
  const twoWeeksFromNow = new Date(now.getTime() + 14 * 86400000);
  const items: ScheduleItem[] = [];

  // Build map of existing vaccinations by name+dose
  const vacMap = new Map<string, Vaccination>();
  for (const v of vaccinations) {
    vacMap.set(`${v.vaccine_name}:${v.dose_number}`, v);
  }

  for (const vaccine of vaccineSchedule) {
    for (let dose = 0; dose < vaccine.doses; dose++) {
      const weeks = vaccine.schedule_weeks[dose] ?? 0;
      const scheduledDate = new Date(birthDate.getTime() + weeks * 7 * 86400000);
      const key = `${vaccine.name}:${dose + 1}`;
      const existing = vacMap.get(key);

      let status: ScheduleItem['status'];
      if (existing?.status === 'completed' || existing?.administered_date) {
        status = 'completed';
      } else if (scheduledDate < now) {
        status = 'overdue';
      } else if (scheduledDate < twoWeeksFromNow) {
        status = 'upcoming';
      } else {
        status = 'future';
      }

      const weeksLabel = weeks === 0
        ? t('child.at_birth')
        : `${weeks} ${t('child.weeks')}`;

      items.push({
        vaccineName: vaccine.name,
        nameAm: vaccine.name_am,
        dose: dose + 1,
        scheduledDate,
        weeksLabel,
        vaccination: existing || null,
        status,
      });
    }
  }

  return items;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-CA'); // YYYY-MM-DD
}

const statusConfig = {
  completed: { icon: '✅', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
  overdue: { icon: '🔴', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
  upcoming: { icon: '⏰', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
  future: { icon: '⬜', bg: 'bg-tg-secondary-bg', border: 'border-tg-hint/10', text: 'text-tg-hint' },
};

export function VaccinationChecklist({ childId, childDob, vaccinations, vaccineSchedule, onUpdate }: VaccinationChecklistProps) {
  const { t, language } = useTranslation();
  const { haptic } = useTelegram();
  const [marking, setMarking] = useState<string | null>(null);

  const items = buildScheduleItems(childDob, vaccineSchedule, vaccinations, t);

  // Group by weeks label
  const groups = new Map<string, ScheduleItem[]>();
  for (const item of items) {
    const key = item.weeksLabel;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  const handleMarkDone = async (item: ScheduleItem) => {
    const key = `${item.vaccineName}:${item.dose}`;
    if (marking === key) return;
    setMarking(key);
    haptic.impact('medium');

    try {
      const result = await childrenApi.logVaccination(childId, {
        vaccine_name: item.vaccineName,
        dose_number: item.dose,
        administered_date: new Date().toISOString().split('T')[0],
      });
      onUpdate(result);
    } catch {
      // ignore
    } finally {
      setMarking(null);
    }
  };

  return (
    <div className="space-y-4">
      {Array.from(groups.entries()).map(([label, groupItems]) => (
        <div key={label}>
          <p className="text-xs font-semibold text-tg-hint uppercase mb-2">{label}</p>
          <div className="space-y-2">
            {groupItems.map((item) => {
              const cfg = statusConfig[item.status];
              const isMarking = marking === `${item.vaccineName}:${item.dose}`;
              return (
                <div
                  key={`${item.vaccineName}-${item.dose}`}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${cfg.bg} ${cfg.border}`}
                >
                  <span className="text-lg">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${item.status === 'future' ? 'text-tg-hint' : 'text-tg-text'}`}>
                      {language === 'am' ? item.nameAm : item.vaccineName}
                      {item.dose > 1 && ` (${item.dose})`}
                    </p>
                    <p className="text-xs text-tg-hint">
                      {item.vaccination?.administered_date
                        ? `✓ ${item.vaccination.administered_date}`
                        : formatDate(item.scheduledDate)
                      }
                    </p>
                  </div>
                  {item.status !== 'completed' && (
                    <button
                      onClick={() => handleMarkDone(item)}
                      disabled={isMarking}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium ${cfg.text} bg-white/50 disabled:opacity-50`}
                    >
                      {isMarking ? '...' : t('child.mark_done')}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
