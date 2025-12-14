/**
 * Users Service
 * 
 * Handle user profile operations.
 */

import { db } from '@/config/firebase';
import { COLLECTIONS, UserDocument } from '@/types/firestore';
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';

// ============================================================================
// USER QUERIES
// ============================================================================

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<UserDocument | null> {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    return null;
  }
  
  return {
    id: userSnap.id,
    ...userSnap.data(),
  } as UserDocument;
}

/**
 * Get user by username
 */
export async function getUserByUsername(username: string): Promise<UserDocument | null> {
  const usersRef = collection(db, COLLECTIONS.USERS);
  
  const q = query(
    usersRef,
    where('username', '==', username.toLowerCase())
  );
  
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return null;
  }
  
  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as UserDocument;
}

/**
 * Check if username is available
 */
export async function isUsernameAvailable(
  username: string,
  excludeUserId?: string
): Promise<boolean> {
  const user = await getUserByUsername(username);
  
  if (!user) {
    return true;
  }
  
  // If we're excluding a user (for updates), check if it's them
  if (excludeUserId && user.id === excludeUserId) {
    return true;
  }
  
  return false;
}

/**
 * Search users by username or display name
 */
export async function searchUsers(
  searchTerm: string,
  limitCount: number = 20
): Promise<UserDocument[]> {
  // Note: Firestore doesn't support full-text search natively
  // For production, consider using Algolia, Typesense, or Cloud Functions
  // This is a basic prefix search
  
  const usersRef = collection(db, COLLECTIONS.USERS);
  const searchLower = searchTerm.toLowerCase();
  
  const q = query(
    usersRef,
    where('username', '>=', searchLower),
    where('username', '<=', searchLower + '\uf8ff')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs
    .slice(0, limitCount)
    .map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as UserDocument[];
}

// ============================================================================
// USER MUTATIONS
// ============================================================================

export interface CreateUserInput {
  email: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
}

/**
 * Create a new user profile
 */
export async function createUser(
  userId: string,
  input: CreateUserInput
): Promise<void> {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  
  // Check if username is available
  const available = await isUsernameAvailable(input.username);
  if (!available) {
    throw new Error('Username is already taken');
  }
  
  const userData: UserDocument = {
    id: userId,
    email: input.email,
    username: input.username.toLowerCase(),
    displayName: input.displayName,
    avatar: input.avatar,
    bio: input.bio,
    
    // Initialize counters
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
    likesCount: 0,
    
    // Status
    isVerified: false,
    isPrivate: false,
    isBanned: false,
    
    // Timestamps
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };
  
  await setDoc(userRef, userData);
}

export interface UpdateUserInput {
  displayName?: string;
  username?: string;
  avatar?: string;
  bio?: string;
}

/**
 * Update user profile
 */
export async function updateUser(
  userId: string,
  input: UpdateUserInput
): Promise<void> {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  
  // If username is being updated, check availability
  if (input.username) {
    const available = await isUsernameAvailable(input.username, userId);
    if (!available) {
      throw new Error('Username is already taken');
    }
    input.username = input.username.toLowerCase();
  }
  
  // Filter out undefined values
  const updates: Record<string, any> = {
    updatedAt: serverTimestamp(),
  };
  
  if (input.displayName !== undefined) updates.displayName = input.displayName;
  if (input.username !== undefined) updates.username = input.username;
  if (input.avatar !== undefined) updates.avatar = input.avatar;
  if (input.bio !== undefined) updates.bio = input.bio;
  
  await updateDoc(userRef, updates);
  
  // Note: If username or display name changes, you may want to
  // update denormalized data in posts/comments via Cloud Functions
}

/**
 * Update user's last active timestamp
 */
export async function updateLastActive(userId: string): Promise<void> {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  
  await updateDoc(userRef, {
    lastActiveAt: serverTimestamp(),
  });
}

/**
 * Update warningShowed to mark a warning as shown
 */
export async function updateWarningShowed(
  userId: string,
  warningId: number
): Promise<void> {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  
  await updateDoc(userRef, {
    warningShowed: warningId,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Block a user
 * Adds the blocked user's ID to the current user's blockedUsers array
 */
export async function blockUser(currentUserId: string, blockedUserId: string): Promise<void> {
  if (currentUserId === blockedUserId) {
    throw new Error('Cannot block yourself');
  }

  const userRef = doc(db, COLLECTIONS.USERS, currentUserId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    throw new Error('User not found');
  }

  const userData = userSnap.data() as UserDocument;
  const blockedUsers = userData.blockedUsers || [];

  // Check if already blocked
  if (blockedUsers.includes(blockedUserId)) {
    return; // Already blocked, no-op
  }

  await updateDoc(userRef, {
    blockedUsers: arrayUnion(blockedUserId),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Unblock a user
 * Removes the blocked user's ID from the current user's blockedUsers array
 */
export async function unblockUser(currentUserId: string, blockedUserId: string): Promise<void> {
  const userRef = doc(db, COLLECTIONS.USERS, currentUserId);
  
  await updateDoc(userRef, {
    blockedUsers: arrayRemove(blockedUserId),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Unblock all users
 * Clears the blockedUsers array
 */
export async function unblockAllUsers(userId: string): Promise<void> {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  
  await updateDoc(userRef, {
    blockedUsers: [],
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get blocked users count
 */
export async function getBlockedUsersCount(userId: string): Promise<number> {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    return 0;
  }

  const userData = userSnap.data() as UserDocument;
  return userData.blockedUsers?.length || 0;
}

/**
 * Check if a user is blocked by another user
 */
export async function isUserBlocked(currentUserId: string, otherUserId: string): Promise<boolean> {
  const userRef = doc(db, COLLECTIONS.USERS, currentUserId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    return false;
  }

  const userData = userSnap.data() as UserDocument;
  const blockedUsers = userData.blockedUsers || [];
  return blockedUsers.includes(otherUserId);
}

/**
 * Delete user account and all associated data
 * 
 * This function performs a comprehensive cleanup:
 * - Soft deletes user's posts (sets isDeleted flag)
 * - Soft deletes user's comments (sets isDeleted flag)
 * - Deletes user's likes
 * - Deletes user's saved posts
 * - Deletes follow relationships (both following and followers)
 * - Deletes user's notifications
 * - Deletes user document
 * 
 * Note: For production, consider moving this to a Cloud Function
 * for better performance and to handle large datasets.
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  const batch = writeBatch(db);
  const batchLimit = 500; // Firestore batch write limit
  
  try {
    // 1. Soft delete user's posts
    const postsRef = collection(db, COLLECTIONS.POSTS);
    const userPostsQuery = query(postsRef, where('authorId', '==', userId));
    const postsSnapshot = await getDocs(userPostsQuery);
    
    let batchCount = 0;
    for (const postDoc of postsSnapshot.docs) {
      if (batchCount >= batchLimit) {
        await batch.commit();
        batchCount = 0;
      }
      batch.update(postDoc.ref, {
        isDeleted: true,
        updatedAt: serverTimestamp(),
      });
      batchCount++;
    }
    
    // 2. Soft delete user's comments
    const commentsRef = collection(db, COLLECTIONS.COMMENTS);
    const userCommentsQuery = query(commentsRef, where('authorId', '==', userId));
    const commentsSnapshot = await getDocs(userCommentsQuery);
    
    for (const commentDoc of commentsSnapshot.docs) {
      if (batchCount >= batchLimit) {
        await batch.commit();
        batchCount = 0;
      }
      batch.update(commentDoc.ref, {
        isDeleted: true,
        updatedAt: serverTimestamp(),
      });
      batchCount++;
    }
    
    // 3. Delete user's likes
    const likesRef = collection(db, COLLECTIONS.POST_LIKES);
    const userLikesQuery = query(likesRef, where('userId', '==', userId));
    const likesSnapshot = await getDocs(userLikesQuery);
    
    for (const likeDoc of likesSnapshot.docs) {
      if (batchCount >= batchLimit) {
        await batch.commit();
        batchCount = 0;
      }
      batch.delete(likeDoc.ref);
      batchCount++;
    }
    
    // 4. Delete user's saved posts
    const savesRef = collection(db, COLLECTIONS.SAVED_POSTS);
    const userSavesQuery = query(savesRef, where('userId', '==', userId));
    const savesSnapshot = await getDocs(userSavesQuery);
    
    for (const saveDoc of savesSnapshot.docs) {
      if (batchCount >= batchLimit) {
        await batch.commit();
        batchCount = 0;
      }
      batch.delete(saveDoc.ref);
      batchCount++;
    }
    
    // 5. Delete follow relationships (where user is follower)
    const followsRef = collection(db, COLLECTIONS.FOLLOWS);
    const followingQuery = query(followsRef, where('followerId', '==', userId));
    const followingSnapshot = await getDocs(followingQuery);
    
    for (const followDoc of followingSnapshot.docs) {
      if (batchCount >= batchLimit) {
        await batch.commit();
        batchCount = 0;
      }
      batch.delete(followDoc.ref);
      batchCount++;
    }
    
    // 6. Delete follow relationships (where user is being followed)
    const followersQuery = query(followsRef, where('followingId', '==', userId));
    const followersSnapshot = await getDocs(followersQuery);
    
    for (const followDoc of followersSnapshot.docs) {
      if (batchCount >= batchLimit) {
        await batch.commit();
        batchCount = 0;
      }
      batch.delete(followDoc.ref);
      batchCount++;
    }
    
    // 7. Delete user's notifications
    const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS);
    const userNotificationsQuery = query(notificationsRef, where('userId', '==', userId));
    const notificationsSnapshot = await getDocs(userNotificationsQuery);
    
    for (const notificationDoc of notificationsSnapshot.docs) {
      if (batchCount >= batchLimit) {
        await batch.commit();
        batchCount = 0;
      }
      batch.delete(notificationDoc.ref);
      batchCount++;
    }
    
    // 8. Delete user document
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    batch.delete(userRef);
    
    // Commit remaining operations
    if (batchCount > 0) {
      await batch.commit();
    }
    
    console.log(`[deleteUserAccount] Successfully deleted account and data for user: ${userId}`);
  } catch (error) {
    console.error('[deleteUserAccount] Error deleting user account:', error);
    throw error;
  }
}
