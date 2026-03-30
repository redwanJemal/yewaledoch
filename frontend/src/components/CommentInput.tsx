import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface CommentInputProps {
  onSubmit: (body: string, isAnonymous: boolean) => Promise<void>;
  placeholder?: string;
  autoFocus?: boolean;
}

export function CommentInput({ onSubmit, placeholder, autoFocus }: CommentInputProps) {
  const { t } = useTranslation();
  const [body, setBody] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = async () => {
    const trimmed = body.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      await onSubmit(trimmed, isAnonymous);
      setBody('');
      setIsAnonymous(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t('comment.placeholder')}
          rows={1}
          className="flex-1 resize-none bg-tg-secondary-bg rounded-xl px-3 py-2.5 text-sm text-tg-text placeholder:text-tg-hint outline-none focus:ring-2 focus:ring-tg-button/30 transition-shadow min-h-[40px] max-h-[120px]"
          style={{ height: 'auto' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = Math.min(target.scrollHeight, 120) + 'px';
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!body.trim() || submitting}
          className="flex-shrink-0 w-10 h-10 rounded-full bg-tg-button text-tg-button-text flex items-center justify-center disabled:opacity-40 transition-opacity"
        >
          {submitting ? (
            <div className="w-4 h-4 border-2 border-tg-button-text/30 border-t-tg-button-text rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isAnonymous}
          onChange={(e) => setIsAnonymous(e.target.checked)}
          className="w-4 h-4 rounded border-tg-hint accent-tg-button"
        />
        <span className="text-xs text-tg-hint">{t('comment.anonymous_toggle')}</span>
      </label>
    </div>
  );
}
