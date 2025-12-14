/**
 * Likes Query Functions
 * 
 * Handle post likes with optimized queries.
 */

import { db } from '@/config/firebase';
import { createNotification } from '@/services/notifications';
import { COLLECTIONS, PostDocument, PostLikeDocument, UserDocument } from '@/types/firestore';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';

// ============================================================================
// LIKE QUERIES
// ============================================================================

/**
 * Check if a user has liked a post
 */
export async function hasUserLikedPost(
  postId: string,
  userId: string
): Promise<boolean> {
  const likeId = `${postId}_${userId}`;
  const likeRef = doc(db, COLLECTIONS.POST_LIKES, likeId);
  const likeSnap = await getDoc(likeRef);
  return likeSnap.exists();
}

/**
 * Get users who liked a post (with pagination)
 */
export async function getPostLikes(
  postId: string,
  limitCount: number = 20
): Promise<PostLikeDocument[]> {
  const likesRef = collection(db, COLLECTIONS.POST_LIKES);
  
  const q = query(
    likesRef,
    where('postId', '==', postId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as PostLikeDocument[];
}

/**
 * Get posts liked by a user
 */
export async function getUserLikedPosts(
  userId: string,
  limitCount: number = 20
): Promise<string[]> {
  const likesRef = collection(db, COLLECTIONS.POST_LIKES);
  
  const q = query(
    likesRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data().postId as string);
}

/**
 * Check multiple posts for likes by a user (batch check)
 * Useful for displaying like status on a feed
 */
export async function checkUserLikesForPosts(
  postIds: string[],
  userId: string
): Promise<Set<string>> {
  if (postIds.length === 0) return new Set();
  
  // Firestore doesn't support batch get by ID in collections,
  // so we query by postId and userId
  const likesRef = collection(db, COLLECTIONS.POST_LIKES);
  
  // Batch in groups of 10 (Firestore 'in' limit)
  const likedPostIds = new Set<string>();
  
  for (let i = 0; i < postIds.length; i += 10) {
    const batch = postIds.slice(i, i + 10);
    
    const q = query(
      likesRef,
      where('postId', 'in', batch),
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(q);
    snapshot.docs.forEach(doc => {
      likedPostIds.add(doc.data().postId as string);
    });
  }
  
  return likedPostIds;
}

// ============================================================================
// LIKE MUTATIONS
// ============================================================================

/**
 * Like a post
 */
export async function likePost(
  postId: string,
  user: UserDocument
): Promise<void> {
  const likeId = `${postId}_${user.id}`;
  const likeRef = doc(db, COLLECTIONS.POST_LIKES, likeId);
  
  // Check if already liked
  const existingLike = await getDoc(likeRef);
  if (existingLike.exists()) {
    return; // Already liked
  }
  
  const likeData: Record<string, any> = {
    id: likeId,
    postId,
    userId: user.id,
    username: user.username,
    displayName: user.username, // Keep for type compatibility but use username
    createdAt: serverTimestamp(),
  };
  
  await setDoc(likeRef, likeData);
  
  // Get post to get author info
  const postRef = doc(db, COLLECTIONS.POSTS, postId);
  const postSnap = await getDoc(postRef);
  
  // Increment post like count
  await updateDoc(postRef, {
    likesCount: increment(1),
  });
  
  // Create notification if post author is different from user who liked
  if (postSnap.exists()) {
    const postData = postSnap.data() as PostDocument;
    if (postData.authorId !== user.id) {
      try {
        const notificationData: any = {
          userId: postData.authorId,
          type: 'like',
          actorId: user.id,
          actorUsername: user.username,
          actorDisplayName: user.username, // Use username instead of displayName
          postId: postId,
          postContent: postData.content.substring(0, 100),
        };
        
        // Only include actorAvatar if it exists (Firestore doesn't allow undefined)
        if (user.avatar) {
          notificationData.actorAvatar = user.avatar;
        }
        
        await createNotification(notificationData);
        console.log('[Like] Notification created for post author');
      } catch (error) {
        console.error('Error creating like notification:', error);
        // Don't fail the like operation if notification fails
      }
    }
  }
}

/**
 * Unlike a post
 */
export async function unlikePost(
  postId: string,
  userId: string
): Promise<void> {
  const likeId = `${postId}_${userId}`;
  const likeRef = doc(db, COLLECTIONS.POST_LIKES, likeId);
  
  // Check if like exists
  const existingLike = await getDoc(likeRef);
  if (!existingLike.exists()) {
    return; // Not liked
  }
  
  await deleteDoc(likeRef);
  
  // Decrement post like count
  const postRef = doc(db, COLLECTIONS.POSTS, postId);
  await updateDoc(postRef, {
    likesCount: increment(-1),
  });
}

/**
 * Toggle like status on a post
 */
export async function toggleLike(
  postId: string,
  user: UserDocument
): Promise<boolean> {
  const isLiked = await hasUserLikedPost(postId, user.id);
  
  if (isLiked) {
    await unlikePost(postId, user.id);
    return false;
  } else {
    await likePost(postId, user);
    return true;
  }
}

// ============================================================================
// COMMENT LIKES
// ============================================================================

/**
 * Check if a user has liked a comment
 */
export async function hasUserLikedComment(
  commentId: string,
  userId: string
): Promise<boolean> {
  const likeId = `${commentId}_${userId}`;
  const likeRef = doc(db, COLLECTIONS.COMMENT_LIKES, likeId);
  const likeSnap = await getDoc(likeRef);
  return likeSnap.exists();
}

/**
 * Like a comment
 */
export async function likeComment(
  commentId: string,
  user: UserDocument
): Promise<void> {
  const likeId = `${commentId}_${user.id}`;
  const likeRef = doc(db, COLLECTIONS.COMMENT_LIKES, likeId);
  
  // Check if already liked
  const existingLike = await getDoc(likeRef);
  if (existingLike.exists()) {
    return; // Already liked
  }
  
  const likeData: Record<string, any> = {
    id: likeId,
    commentId,
    userId: user.id,
    username: user.username,
    displayName: user.username, // Keep for type compatibility but use username
    createdAt: serverTimestamp(),
  };
  
  // Only include avatar if it exists
  if (user.avatar) {
    likeData.avatar = user.avatar;
  }
  
  await setDoc(likeRef, likeData);
  
  // Get comment to get author info
  const commentRef = doc(db, COLLECTIONS.COMMENTS, commentId);
  const commentSnap = await getDoc(commentRef);
  
  // Increment comment like count
  await updateDoc(commentRef, {
    likesCount: increment(1),
  });
  
  // Note: Comment likes don't create notifications (unlike post likes)
  // as they would be too noisy
}

/**
 * Unlike a comment
 */
export async function unlikeComment(
  commentId: string,
  userId: string
): Promise<void> {
  const likeId = `${commentId}_${userId}`;
  const likeRef = doc(db, COLLECTIONS.COMMENT_LIKES, likeId);
  
  // Check if like exists
  const existingLike = await getDoc(likeRef);
  if (!existingLike.exists()) {
    return; // Not liked
  }
  
  await deleteDoc(likeRef);
  
  // Decrement comment like count
  const commentRef = doc(db, COLLECTIONS.COMMENTS, commentId);
  await updateDoc(commentRef, {
    likesCount: increment(-1),
  });
}

/**
 * Toggle like status on a comment
 */
export async function toggleCommentLike(
  commentId: string,
  user: UserDocument
): Promise<boolean> {
  const isLiked = await hasUserLikedComment(commentId, user.id);
  
  if (isLiked) {
    await unlikeComment(commentId, user.id);
    return false;
  } else {
    await likeComment(commentId, user);
    return true;
  }
}

/**
 * Check multiple comments for likes by a user (batch check)
 */
export async function checkUserLikesForComments(
  commentIds: string[],
  userId: string
): Promise<Set<string>> {
  if (commentIds.length === 0) return new Set();
  
  const likesRef = collection(db, COLLECTIONS.COMMENT_LIKES);
  const likedCommentIds = new Set<string>();
  
  // Batch in groups of 10 (Firestore 'in' limit)
  for (let i = 0; i < commentIds.length; i += 10) {
    const batch = commentIds.slice(i, i + 10);
    
    const q = query(
      likesRef,
      where('commentId', 'in', batch),
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(q);
    snapshot.docs.forEach(doc => {
      likedCommentIds.add(doc.data().commentId as string);
    });
  }
  
  return likedCommentIds;
}
