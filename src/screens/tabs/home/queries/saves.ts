/**
 * Saves Query Functions
 * 
 * Handle saved/bookmarked posts with optimized queries.
 */

import { db } from '@/config/firebase';
import { COLLECTIONS, PostDocument, PostSaveDocument, UserDocument } from '@/types/firestore';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where
} from 'firebase/firestore';

// ============================================================================
// SAVE QUERIES
// ============================================================================

/**
 * Check if a user has saved a post
 */
export async function hasUserSavedPost(
  postId: string,
  userId: string
): Promise<boolean> {
  const saveId = `${postId}_${userId}`;
  const saveRef = doc(db, COLLECTIONS.SAVED_POSTS, saveId);
  const saveSnap = await getDoc(saveRef);
  return saveSnap.exists();
}

/**
 * Get posts saved by a user
 */
export async function getUserSavedPosts(
  userId: string,
  limitCount: number = 20
): Promise<PostSaveDocument[]> {
  const savesRef = collection(db, COLLECTIONS.SAVED_POSTS);
  
  const q = query(
    savesRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as PostSaveDocument[];
}

/**
 * Get saved post IDs for a user
 */
export async function getUserSavedPostIds(
  userId: string,
  limitCount: number = 50
): Promise<string[]> {
  const savesRef = collection(db, COLLECTIONS.SAVED_POSTS);
  
  const q = query(
    savesRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data().postId as string);
}

/**
 * Check multiple posts for saves by a user (batch check)
 * Useful for displaying save status on a feed
 */
export async function checkUserSavesForPosts(
  postIds: string[],
  userId: string
): Promise<Set<string>> {
  if (postIds.length === 0) return new Set();
  
  const savesRef = collection(db, COLLECTIONS.SAVED_POSTS);
  
  // Batch in groups of 10 (Firestore 'in' limit)
  const savedPostIds = new Set<string>();
  
  for (let i = 0; i < postIds.length; i += 10) {
    const batch = postIds.slice(i, i + 10);
    
    const q = query(
      savesRef,
      where('postId', 'in', batch),
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(q);
    snapshot.docs.forEach(doc => {
      savedPostIds.add(doc.data().postId as string);
    });
  }
  
  return savedPostIds;
}

// ============================================================================
// SAVE MUTATIONS
// ============================================================================

/**
 * Save a post
 */
export async function savePost(
  post: PostDocument,
  user: UserDocument
): Promise<void> {
  const saveId = `${post.id}_${user.id}`;
  const saveRef = doc(db, COLLECTIONS.SAVED_POSTS, saveId);
  
  // Check if already saved
  const existingSave = await getDoc(saveRef);
  if (existingSave.exists()) {
    return; // Already saved
  }
  
  // Build save data, only including defined values
  const saveData: Record<string, any> = {
    id: saveId,
    postId: post.id,
    userId: user.id,
    postContent: (post.content || '').substring(0, 100), // Preview first 100 chars
    postAuthorUsername: post.authorUsername || '',
    postAuthorDisplayName: post.authorDisplayName || '',
    postIsAnonymous: post.isAnonymous === true,
    createdAt: serverTimestamp(),
  };
  
  // Only include postMediaUrl if it exists and is a valid string (Firestore doesn't allow undefined)
  if (post.mediaUrls && Array.isArray(post.mediaUrls) && post.mediaUrls.length > 0 && post.mediaUrls[0]) {
    saveData.postMediaUrl = post.mediaUrls[0];
  }
  
  await setDoc(saveRef, saveData);
}

/**
 * Unsave a post
 */
export async function unsavePost(
  postId: string,
  userId: string
): Promise<void> {
  const saveId = `${postId}_${userId}`;
  const saveRef = doc(db, COLLECTIONS.SAVED_POSTS, saveId);
  
  // Check if save exists
  const existingSave = await getDoc(saveRef);
  if (!existingSave.exists()) {
    return; // Not saved
  }
  
  await deleteDoc(saveRef);
}

/**
 * Toggle save status on a post
 */
export async function toggleSave(
  post: PostDocument,
  user: UserDocument
): Promise<boolean> {
  const isSaved = await hasUserSavedPost(post.id, user.id);
  
  if (isSaved) {
    await unsavePost(post.id, user.id);
    return false;
  } else {
    await savePost(post, user);
    return true;
  }
}
