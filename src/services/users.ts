/**
 * Users Service
 * 
 * Handle user profile operations.
 */

import { db } from '@/config/firebase';
import { COLLECTIONS, UserDocument } from '@/types/firestore';
import {
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
