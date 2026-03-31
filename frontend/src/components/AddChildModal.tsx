import { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useTelegram } from '@/lib/telegram';
import { childrenApi } from '@/lib/api';
import type { Child } from '@/lib/api';

interface AddChildModalProps {
  onClose: () => void;
  onSaved: (child: Child) => void;
}

export function AddChildModal({ onClose, onSaved }: AddChildModalProps) {
  const { t } = useTranslation();
  const { haptic, showConfirm } = useTelegram();
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | ''>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCancel = async () => {
    if (name || dob || gender) {
      const confirmed = await showConfirm(t('btn.cancel') + '?');
      if (!confirmed) return;
    }
    onClose();
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError(t('child.name'));
      return;
    }
    if (!dob) {
      setError(t('child.dob'));
      return;
    }

    setSaving(true);
    setError('');
    try {
      const child = await childrenApi.create({
        name: name.trim(),
        date_of_birth: dob,
        ...(gender ? { gender: gender as 'M' | 'F' } : {}),
      });
      haptic.notification('success');
      onSaved(child);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.generic'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={handleCancel}>
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-tg-bg rounded-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-tg-text">{t('profile.add_child')}</h2>
          <button onClick={handleCancel} className="p-1 text-tg-hint">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-tg-text mb-1">{t('child.name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('child.name')}
              className="w-full px-4 py-3 bg-tg-secondary-bg text-tg-text rounded-xl outline-none focus:ring-2 focus:ring-tg-button/30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-tg-text mb-1">{t('child.dob')}</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 bg-tg-secondary-bg text-tg-text rounded-xl outline-none focus:ring-2 focus:ring-tg-button/30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-tg-text mb-1">{t('child.gender')}</label>
            <div className="flex gap-3">
              <button
                onClick={() => setGender('M')}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${
                  gender === 'M'
                    ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300'
                    : 'bg-tg-secondary-bg text-tg-text'
                }`}
              >
                👦 {t('profile.boy')}
              </button>
              <button
                onClick={() => setGender('F')}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${
                  gender === 'F'
                    ? 'bg-pink-100 text-pink-700 ring-2 ring-pink-300'
                    : 'bg-tg-secondary-bg text-tg-text'
                }`}
              >
                👧 {t('profile.girl')}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-tg-button text-tg-button-text rounded-xl font-medium disabled:opacity-50"
          >
            {saving ? '...' : t('btn.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
