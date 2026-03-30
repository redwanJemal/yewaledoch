/**
 * Format a date string into a relative time string.
 */
export function formatTimeAgo(dateStr: string, t: (key: string) => string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return t('time.just_now');
  if (diffMin < 60) return `${diffMin} ${t('time.minutes_ago')}`;
  if (diffHr < 24) return `${diffHr} ${t('time.hours_ago')}`;
  return `${diffDay} ${t('time.days_ago')}`;
}
