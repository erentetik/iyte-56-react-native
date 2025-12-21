/**
 * Post Detail Utilities
 * 
 * Helper functions for post detail screen
 */

import { TweetData } from '@/components/tweet';
import { PostDocument } from '@/types/firestore';
import { Timestamp } from 'firebase/firestore';

/**
 * Format timestamp to relative time string
 */
export function formatTimestamp(timestamp: Timestamp | undefined, t: (key: string) => string): string {
  if (!timestamp) return '';
  
  const now = new Date();
  const date = timestamp.toDate();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 60) return `${diffSeconds}${t('time.seconds')} ${t('time.ago')}`;
  if (diffMinutes < 60) return `${diffMinutes} ${diffMinutes > 1 ? t('time.minutesPlural') : t('time.minute')} ${t('time.ago')}`;
  if (diffHours < 24) return `${diffHours} ${diffHours > 1 ? t('time.hoursPlural') : t('time.hour')} ${t('time.ago')}`;
  if (diffDays < 7) return `${diffDays} ${diffDays > 1 ? t('time.daysPlural') : t('time.day')} ${t('time.ago')}`;
  
  return date.toLocaleDateString();
}

/**
 * Transform PostDocument to TweetData
 */
export function postToTweet(
  post: PostDocument, 
  isLiked: boolean, 
  isSaved: boolean, 
  isReported: boolean, 
  t: (key: string) => string
): TweetData {
  return {
    id: post.id,
    author: {
      name: post.authorUsername,
      username: post.authorUsername,
      avatar: post.authorAvatar,
      isAdmin: post.authorIsAdmin,
      borderColor: post.authorBorderColor,
      borderColors: post.authorBorderColors,
    },
    content: post.content,
    timestamp: formatTimestamp(post.createdAt, t),
    likes: post.likesCount,
    replies: post.commentsCount,
    isLiked,
    isSaved,
    isReported,
    isAnonymous: post.isAnonymous,
    imageUrl: post.mediaUrls?.[0], // Keep for backward compatibility
    imageUrls: post.mediaUrls?.filter(url => url) || undefined, // Array of all images
  };
}

