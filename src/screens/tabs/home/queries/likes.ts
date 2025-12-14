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
    displayName: user.displayName,
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
          actorDisplayName: user.displayName,
          postId: postId,
          postContent: postData.content.substring(0, 100),
        };
        
        // Only include actorAvatar if it exists (Firestore doesn't allow undefined)
        if (user.avatar) {
          notificationData.actorAvatar = user.avatar;
        }
        
        await createNotification(notificationData);
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
