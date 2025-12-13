/**
 * Follows Service
 * 
 * Handle follow/unfollow relationships between users.
 */

import { db } from '@/config/firebase';
import { COLLECTIONS, FollowDocument, UserDocument } from '@/types/firestore';
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
    Timestamp,
    updateDoc,
    where,
} from 'firebase/firestore';

// ============================================================================
// FOLLOW QUERIES
// ============================================================================

/**
 * Check if user A follows user B
 */
export async function isFollowing(
  followerId: string,
  followingId: string
): Promise<boolean> {
  const followId = `${followerId}_${followingId}`;
  const followRef = doc(db, COLLECTIONS.FOLLOWS, followId);
  const followSnap = await getDoc(followRef);
  return followSnap.exists();
}

/**
 * Get users that a user is following
 */
export async function getFollowing(
  userId: string,
  limitCount: number = 50
): Promise<FollowDocument[]> {
  const followsRef = collection(db, COLLECTIONS.FOLLOWS);
  
  const q = query(
    followsRef,
    where('followerId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as FollowDocument[];
}

/**
 * Get IDs of users that a user is following
 * Useful for feed filtering
 */
export async function getFollowingIds(userId: string): Promise<string[]> {
  const following = await getFollowing(userId, 1000); // Adjust limit as needed
  return following.map(f => f.followingId);
}

/**
 * Get users who follow a user (followers)
 */
export async function getFollowers(
  userId: string,
  limitCount: number = 50
): Promise<FollowDocument[]> {
  const followsRef = collection(db, COLLECTIONS.FOLLOWS);
  
  const q = query(
    followsRef,
    where('followingId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as FollowDocument[];
}

/**
 * Get follower count for a user
 */
export async function getFollowerCount(userId: string): Promise<number> {
  const followsRef = collection(db, COLLECTIONS.FOLLOWS);
  
  const q = query(
    followsRef,
    where('followingId', '==', userId)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.size;
}

/**
 * Get following count for a user
 */
export async function getFollowingCount(userId: string): Promise<number> {
  const followsRef = collection(db, COLLECTIONS.FOLLOWS);
  
  const q = query(
    followsRef,
    where('followerId', '==', userId)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.size;
}

// ============================================================================
// FOLLOW MUTATIONS
// ============================================================================

/**
 * Follow a user
 */
export async function followUser(
  follower: UserDocument,
  following: UserDocument
): Promise<void> {
  if (follower.id === following.id) {
    throw new Error('Cannot follow yourself');
  }
  
  const followId = `${follower.id}_${following.id}`;
  const followRef = doc(db, COLLECTIONS.FOLLOWS, followId);
  
  // Check if already following
  const existingFollow = await getDoc(followRef);
  if (existingFollow.exists()) {
    return; // Already following
  }
  
  const followData: FollowDocument = {
    id: followId,
    followerId: follower.id,
    followingId: following.id,
    
    // Denormalized follower info
    followerUsername: follower.username,
    followerDisplayName: follower.displayName,
    followerAvatar: follower.avatar,
    
    // Denormalized following info
    followingUsername: following.username,
    followingDisplayName: following.displayName,
    followingAvatar: following.avatar,
    
    createdAt: serverTimestamp() as Timestamp,
  };
  
  await setDoc(followRef, followData);
  
  // Update follower's following count
  const followerRef = doc(db, COLLECTIONS.USERS, follower.id);
  await updateDoc(followerRef, {
    followingCount: increment(1),
  });
  
  // Update following's follower count
  const followingRef = doc(db, COLLECTIONS.USERS, following.id);
  await updateDoc(followingRef, {
    followersCount: increment(1),
  });
}

/**
 * Unfollow a user
 */
export async function unfollowUser(
  followerId: string,
  followingId: string
): Promise<void> {
  const followId = `${followerId}_${followingId}`;
  const followRef = doc(db, COLLECTIONS.FOLLOWS, followId);
  
  // Check if follow exists
  const existingFollow = await getDoc(followRef);
  if (!existingFollow.exists()) {
    return; // Not following
  }
  
  await deleteDoc(followRef);
  
  // Update follower's following count
  const followerRef = doc(db, COLLECTIONS.USERS, followerId);
  await updateDoc(followerRef, {
    followingCount: increment(-1),
  });
  
  // Update following's follower count
  const followingRef = doc(db, COLLECTIONS.USERS, followingId);
  await updateDoc(followingRef, {
    followersCount: increment(-1),
  });
}

/**
 * Toggle follow status
 */
export async function toggleFollow(
  follower: UserDocument,
  following: UserDocument
): Promise<boolean> {
  const following_status = await isFollowing(follower.id, following.id);
  
  if (following_status) {
    await unfollowUser(follower.id, following.id);
    return false;
  } else {
    await followUser(follower, following);
    return true;
  }
}
