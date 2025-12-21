import type { TweetData } from '@/components/tweet';
import type { PostDocument } from '@/types/firestore';
import { formatTimestamp } from './formatTimestamp';

/**
 * Transform PostDocument to TweetData for the Tweet component
 */
export function postToTweet(
  post: PostDocument, 
  isLiked: boolean, 
  isSaved: boolean, 
  isReported: boolean,
  t: (key: string) => string,
): TweetData {
  return {
    id: post.id,
    author: {
      id: post.authorId,
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

