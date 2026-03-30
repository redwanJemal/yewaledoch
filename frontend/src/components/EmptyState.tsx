interface EmptyStateProps {
  icon?: string;
  message: string;
  subMessage?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = '📭', message, subMessage, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <p className="text-5xl mb-4">{icon}</p>
      <p className="text-tg-text font-medium mb-1">{message}</p>
      {subMessage && (
        <p className="text-tg-hint text-sm mb-4">{subMessage}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2 bg-tg-button text-tg-button-text rounded-lg text-sm font-medium"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
