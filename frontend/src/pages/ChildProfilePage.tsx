import { useState, useEffect } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useTelegram } from '@/lib/telegram';
import { childrenApi, resourcesApi, transformVaccineData } from '@/lib/api';
import type { Child, Vaccination, Milestone, VaccineInfo, MilestoneInfo } from '@/lib/api';
import { VaccinationChecklist } from '@/components/VaccinationChecklist';

interface ChildProfilePageProps {
  childId: string;
  onBack: () => void;
}

function calcAge(dob: string, t: (key: string) => string): string {
  const birth = new Date(dob);
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (months >= 12) {
    return `${Math.floor(months / 12)} ${t('profile.years_old')}`;
  }
  return `${Math.max(0, months)} ${t('profile.months_old')}`;
}

export function ChildProfilePage({ childId, onBack }: ChildProfilePageProps) {
  const { t, language } = useTranslation();
  const { haptic, showConfirm } = useTelegram();
  const [child, setChild] = useState<Child | null>(null);
  const [tab, setTab] = useState<'vaccinations' | 'milestones'>('vaccinations');
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [vaccineSchedule, setVaccineSchedule] = useState<VaccineInfo[]>([]);
  const [milestoneInfo, setMilestoneInfo] = useState<MilestoneInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingMilestone, setLoggingMilestone] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [children, vacs, mils, vacSchedule, milInfo] = await Promise.all([
          childrenApi.list(),
          childrenApi.vaccinations(childId),
          childrenApi.milestones(childId),
          resourcesApi.vaccines(),
          resourcesApi.milestones(),
        ]);
        const found = children.find((c) => c.id === childId);
        if (found) setChild(found);
        setVaccinations(vacs);
        setMilestones(mils);
        setVaccineSchedule(transformVaccineData(vacSchedule));
        setMilestoneInfo(milInfo);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [childId]);

  const handleDelete = async () => {
    const confirmed = await showConfirm(t('child.delete_confirm'));
    if (!confirmed) return;
    haptic.notification('warning');
    try {
      await childrenApi.delete(childId);
      onBack();
    } catch {
      // ignore
    }
  };

  const handleVaccinationUpdate = (updated: Vaccination) => {
    setVaccinations((prev) => {
      const idx = prev.findIndex((v) => v.vaccine_name === updated.vaccine_name && v.dose_number === updated.dose_number);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [...prev, updated];
    });
  };

  const handleLogMilestone = async (milestoneType: string) => {
    if (loggingMilestone === milestoneType) return;
    setLoggingMilestone(milestoneType);
    haptic.impact('medium');
    try {
      const result = await childrenApi.logMilestone(childId, {
        milestone_type: milestoneType,
        completed_at: new Date().toISOString().split('T')[0],
      });
      setMilestones((prev) => {
        const idx = prev.findIndex((m) => m.milestone_type === milestoneType);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = result;
          return next;
        }
        return [...prev, result];
      });
    } catch {
      // ignore
    } finally {
      setLoggingMilestone(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-20 bg-tg-section-bg rounded-xl animate-pulse" />
        <div className="h-10 bg-tg-section-bg rounded-xl animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-tg-section-bg rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="p-4 text-center">
        <p className="text-tg-hint">{t('error.not_found')}</p>
        <button onClick={onBack} className="mt-4 text-tg-button">{t('btn.back')}</button>
      </div>
    );
  }

  // Group milestones by age
  const completedMilestoneTypes = new Set(milestones.filter((m) => m.completed_at).map((m) => m.milestone_type));
  const milestoneGroups = new Map<string, MilestoneInfo[]>();
  for (const mi of milestoneInfo) {
    const label = mi.age_months <= 0 ? '0-3 mo' : mi.age_months <= 6 ? '3-6 mo' : mi.age_months <= 12 ? '6-12 mo' : mi.age_months <= 24 ? '1-2 yr' : '2+ yr';
    if (!milestoneGroups.has(label)) milestoneGroups.set(label, []);
    milestoneGroups.get(label)!.push(mi);
  }

  return (
    <div className="min-h-screen bg-tg-bg">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-tg-bg border-b border-tg-hint/10 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-1 text-tg-text">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-tg-text">{child.name}</h1>
          <p className="text-xs text-tg-hint">
            {child.gender === 'M' ? '👦' : '👧'} {calcAge(child.date_of_birth, t)}
          </p>
        </div>
        <button onClick={handleDelete} className="p-2 text-tg-destructive">
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-tg-hint/10">
        <button
          onClick={() => setTab('vaccinations')}
          className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${
            tab === 'vaccinations'
              ? 'text-tg-button border-b-2 border-tg-button'
              : 'text-tg-hint'
          }`}
        >
          💉 {t('child.vaccinations')}
        </button>
        <button
          onClick={() => setTab('milestones')}
          className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${
            tab === 'milestones'
              ? 'text-tg-button border-b-2 border-tg-button'
              : 'text-tg-hint'
          }`}
        >
          🎯 {t('child.milestones')}
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {tab === 'vaccinations' ? (
          <VaccinationChecklist
            childId={childId}
            childDob={child.date_of_birth}
            vaccinations={vaccinations}
            vaccineSchedule={vaccineSchedule}
            onUpdate={handleVaccinationUpdate}
          />
        ) : (
          <div className="space-y-4">
            {milestoneInfo.length === 0 ? (
              <p className="text-sm text-tg-hint text-center py-8">{t('empty.children')}</p>
            ) : (
              Array.from(milestoneGroups.entries()).map(([ageLabel, items]) => (
                <div key={ageLabel}>
                  <p className="text-xs font-semibold text-tg-hint uppercase mb-2">{ageLabel}</p>
                  <div className="space-y-2">
                    {items.map((mi) => {
                      const isDone = completedMilestoneTypes.has(mi.type);
                      const matching = milestones.find((m) => m.milestone_type === mi.type);
                      const isLogging = loggingMilestone === mi.type;
                      return (
                        <div
                          key={mi.type}
                          className={`flex items-center gap-3 p-3 rounded-xl border ${
                            isDone
                              ? 'bg-green-500/10 border-green-500/20'
                              : 'bg-tg-section-bg border-tg-hint/10'
                          }`}
                        >
                          <span className="text-lg">{isDone ? '✅' : '⬜'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-tg-text">
                              {language === 'am' ? mi.name_am : mi.name_en}
                            </p>
                            {isDone && matching?.completed_at && (
                              <p className="text-xs text-green-600 dark:text-green-400">✓ {matching.completed_at}</p>
                            )}
                          </div>
                          {!isDone && (
                            <button
                              onClick={() => handleLogMilestone(mi.type)}
                              disabled={isLogging}
                              className="text-xs px-3 py-1.5 rounded-lg font-medium text-tg-button bg-tg-button/10 disabled:opacity-50"
                            >
                              {isLogging ? '...' : t('child.log_milestone')}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
