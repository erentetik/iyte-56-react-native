import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  DocumentData,
  QueryConstraint,
  Timestamp,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';

// Generic type for Firestore documents
export interface FirestoreDocument {
  id: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// User profile interface
export interface UserProfile extends FirestoreDocument {
  email: string;
  displayName?: string;
  username?: string;
  avatar?: string;
  bio?: string;
}

// Tweet interface
export interface Tweet extends FirestoreDocument {
  authorId: string;
  content: string;
  likes: number;
  replies: number;
  likedBy: string[];
}

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  TWEETS: 'tweets',
  NOTIFICATIONS: 'notifications',
} as const;

// ============ Generic CRUD Operations ============

/**
 * Get a single document by ID
 */
export async function getDocument<T extends DocumentData>(
  collectionName: string,
  documentId: string
): Promise<(T & { id: string }) | null> {
  const docRef = doc(db, collectionName, documentId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as T & { id: string };
  }
  return null;
}

/**
 * Get all documents from a collection with optional query constraints
 */
export async function getDocuments<T extends DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[] = []
): Promise<(T & { id: string })[]> {
  const collectionRef = collection(db, collectionName);
  const q = constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as (T & { id: string })[];
}

/**
 * Add a new document to a collection
 */
export async function addDocument<T extends DocumentData>(
  collectionName: string,
  data: T
): Promise<string> {
  const collectionRef = collection(db, collectionName);
  const docRef = await addDoc(collectionRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Set a document with a specific ID (creates or overwrites)
 */
export async function setDocument<T extends DocumentData>(
  collectionName: string,
  documentId: string,
  data: T,
  merge: boolean = true
): Promise<void> {
  const docRef = doc(db, collectionName, documentId);
  await setDoc(
    docRef,
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge }
  );
}

/**
 * Update an existing document
 */
export async function updateDocument<T extends DocumentData>(
  collectionName: string,
  documentId: string,
  data: Partial<T>
): Promise<void> {
  const docRef = doc(db, collectionName, documentId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a document
 */
export async function deleteDocument(
  collectionName: string,
  documentId: string
): Promise<void> {
  const docRef = doc(db, collectionName, documentId);
  await deleteDoc(docRef);
}

/**
 * Subscribe to real-time updates for a document
 */
export function subscribeToDocument<T extends DocumentData>(
  collectionName: string,
  documentId: string,
  callback: (data: (T & { id: string }) | null) => void
): () => void {
  const docRef = doc(db, collectionName, documentId);
  
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as T & { id: string });
    } else {
      callback(null);
    }
  });
}

/**
 * Subscribe to real-time updates for a collection
 */
export function subscribeToCollection<T extends DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[],
  callback: (data: (T & { id: string })[]) => void
): () => void {
  const collectionRef = collection(db, collectionName);
  const q = constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;
  
  return onSnapshot(q, (querySnapshot) => {
    const documents = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as (T & { id: string })[];
    callback(documents);
  });
}

// ============ User Profile Operations ============

/**
 * Create or update a user profile
 */
export async function createUserProfile(
  userId: string,
  data: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  await setDocument(COLLECTIONS.USERS, userId, {
    ...data,
    createdAt: serverTimestamp(),
  });
}

/**
 * Get a user profile by ID
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  return getDocument<UserProfile>(COLLECTIONS.USERS, userId);
}

/**
 * Update a user profile
 */
export async function updateUserProfile(
  userId: string,
  data: Partial<UserProfile>
): Promise<void> {
  await updateDocument(COLLECTIONS.USERS, userId, data);
}

// ============ Tweet Operations ============

/**
 * Create a new tweet
 */
export async function createTweet(
  data: Omit<Tweet, 'id' | 'createdAt' | 'updatedAt' | 'likes' | 'replies' | 'likedBy'>
): Promise<string> {
  return addDocument(COLLECTIONS.TWEETS, {
    ...data,
    likes: 0,
    replies: 0,
    likedBy: [],
  });
}

/**
 * Get tweets with pagination
 */
export async function getTweets(limitCount: number = 20): Promise<Tweet[]> {
  return getDocuments<Tweet>(COLLECTIONS.TWEETS, [
    orderBy('createdAt', 'desc'),
    limit(limitCount),
  ]);
}

/**
 * Get tweets by a specific user
 */
export async function getUserTweets(userId: string, limitCount: number = 20): Promise<Tweet[]> {
  return getDocuments<Tweet>(COLLECTIONS.TWEETS, [
    where('authorId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount),
  ]);
}

/**
 * Subscribe to tweets in real-time
 */
export function subscribeToTweets(
  callback: (tweets: Tweet[]) => void,
  limitCount: number = 20
): () => void {
  return subscribeToCollection<Tweet>(
    COLLECTIONS.TWEETS,
    [orderBy('createdAt', 'desc'), limit(limitCount)],
    callback
  );
}

// Re-export query helpers for custom queries
export { where, orderBy, limit, query, collection, doc, Timestamp, serverTimestamp };





