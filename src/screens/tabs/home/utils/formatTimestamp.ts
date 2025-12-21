import { Timestamp } from 'firebase/firestore';

/**
 * Format timestamp to relative time string
 */
export function formatTimestamp(timestamp: Timestamp | undefined, t: (key: string) => string): string {
  if (!timestamp) return '';
  
  const now = new Date();
  const postDate = timestamp.toDate();
  const diffMs = now.getTime() - postDate.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 60) return `${diffSeconds}${t('time.seconds')} ${t('time.ago')}`;
  if (diffMinutes < 60) return `${diffMinutes} ${diffMinutes > 1 ? t('time.minutesPlural') : t('time.minute')} ${t('time.ago')}`;
  if (diffHours < 24) return `${diffHours} ${diffHours > 1 ? t('time.hoursPlural') : t('time.hour')} ${t('time.ago')}`;
  if (diffDays < 7) return `${diffDays} ${diffDays > 1 ? t('time.daysPlural') : t('time.day')} ${t('time.ago')}`;
  
  return postDate.toLocaleDateString();
}

