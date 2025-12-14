/**
 * Posts Query Functions
 * 
 * Optimized queries for the home feed and post-related operations.
 */

import { db } from '@/config/firebase';
import { COLLECTIONS, PostDocument, UserDocument } from '@/types/firestore';
import {
  addDoc,
  collection,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  QueryDocumentSnapshot,
  serverTimestamp,
  startAfter,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

const POSTS_PER_PAGE = 10;

// ============================================================================
// FEED QUERIES
// ============================================================================

/**
 * Get latest public feed posts with pagination (sorted by createdAt)
 * Filters out posts from blocked users
 */
export async function getLatestFeed(
  lastDoc?: QueryDocumentSnapshot<DocumentData>,
  blockedUsers: string[] = []
): Promise<{ posts: PostDocument[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
  const postsRef = collection(db, COLLECTIONS.POSTS);
  
  let q = query(
    postsRef,
    where('visibility', '==', 'public'),
    where('isDeleted', '==', false),
    where('isHidden', '==', false),
    where('moderationChecked', '==', true), // Only show checked content
    orderBy('createdAt', 'desc'),
    limit(POSTS_PER_PAGE * 2) // Fetch more to account for filtering
  );
  
  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }
  
  const snapshot = await getDocs(q);
  let posts = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as PostDocument[];
  
  // Filter out posts from blocked users
  if (blockedUsers.length > 0) {
    const blockedSet = new Set(blockedUsers);
    posts = posts.filter(post => !blockedSet.has(post.authorId));
  }
  
  // Limit to POSTS_PER_PAGE after filtering
  const limitedPosts = posts.slice(0, POSTS_PER_PAGE);
  
  // Find the lastDoc from the original snapshot that corresponds to the last post in filtered results
  const lastPostId = limitedPosts.length > 0 ? limitedPosts[limitedPosts.length - 1].id : null;
  const newLastDoc = lastPostId 
    ? snapshot.docs.find(doc => doc.id === lastPostId) || null
    : null;
  
  return { posts: limitedPosts, lastDoc: newLastDoc };
}

/**
 * Get featured/popular posts with pagination (sorted by popularityScore)
 * Filters out posts from blocked users
 */
export async function getFeaturedFeed(
  lastDoc?: QueryDocumentSnapshot<DocumentData>,
  blockedUsers: string[] = []
): Promise<{ posts: PostDocument[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
  const postsRef = collection(db, COLLECTIONS.POSTS);
  
  let q = query(
    postsRef,
    where('visibility', '==', 'public'),
    where('isDeleted', '==', false),
    where('isHidden', '==', false),
    where('moderationChecked', '==', true), // Only show checked content
    orderBy('popularityScore', 'desc'),
    orderBy('createdAt', 'desc'),
    limit(POSTS_PER_PAGE * 2) // Fetch more to account for filtering
  );
  
  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }
  
  const snapshot = await getDocs(q);
  let posts = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as PostDocument[];
  
  // Filter out posts from blocked users
  if (blockedUsers.length > 0) {
    const blockedSet = new Set(blockedUsers);
    posts = posts.filter(post => !blockedSet.has(post.authorId));
  }
  
  // Limit to POSTS_PER_PAGE after filtering
  const limitedPosts = posts.slice(0, POSTS_PER_PAGE);
  
  // Find the lastDoc from the original snapshot that corresponds to the last post in filtered results
  const lastPostId = limitedPosts.length > 0 ? limitedPosts[limitedPosts.length - 1].id : null;
  const newLastDoc = lastPostId 
    ? snapshot.docs.find(doc => doc.id === lastPostId) || null
    : null;
  
  return { posts: limitedPosts, lastDoc: newLastDoc };
}

/**
 * Get public feed posts with pagination (alias for getLatestFeed for backwards compatibility)
 */
export async function getPublicFeed(
  lastDoc?: QueryDocumentSnapshot<DocumentData>,
  blockedUsers: string[] = []
): Promise<{ posts: PostDocument[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
  return getLatestFeed(lastDoc, blockedUsers);
}

/**
 * Get posts from users that the current user follows
 * Filters out posts from blocked users
 */
export async function getFollowingFeed(
  userId: string,
  followingIds: string[],
  lastDoc?: QueryDocumentSnapshot<DocumentData>,
  blockedUsers: string[] = []
): Promise<{ posts: PostDocument[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
  if (followingIds.length === 0) {
    return { posts: [], lastDoc: null };
  }
  
  // Filter out blocked users from following list
  const blockedSet = new Set(blockedUsers);
  const filteredFollowingIds = followingIds.filter(id => !blockedSet.has(id));
  
  if (filteredFollowingIds.length === 0) {
    return { posts: [], lastDoc: null };
  }
  
  // Firestore 'in' queries are limited to 10 items
  // For larger following lists, you'd need to batch queries or use a different approach
  const limitedFollowingIds = filteredFollowingIds.slice(0, 10);
  
  const postsRef = collection(db, COLLECTIONS.POSTS);
  
  let q = query(
    postsRef,
    where('authorId', 'in', limitedFollowingIds),
    where('isDeleted', '==', false),
    where('isHidden', '==', false),
    where('moderationChecked', '==', true), // Only show checked content
    orderBy('createdAt', 'desc'),
    limit(POSTS_PER_PAGE)
  );
  
  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }
  
  const snapshot = await getDocs(q);
  const posts = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as PostDocument[];
  
  const newLastDoc = snapshot.docs.length > 0 
    ? snapshot.docs[snapshot.docs.length - 1] 
    : null;
  
  return { posts, lastDoc: newLastDoc };
}

/**
 * Get posts by a specific user
 */
export async function getUserPosts(
  userId: string,
  lastDoc?: QueryDocumentSnapshot<DocumentData>
): Promise<{ posts: PostDocument[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
  console.log('getUserPosts: Fetching posts for userId:', userId);
  const postsRef = collection(db, COLLECTIONS.POSTS);
  
  let q = query(
    postsRef,
    where('authorId', '==', userId),
    where('isDeleted', '==', false),
    orderBy('createdAt', 'desc'),
    limit(POSTS_PER_PAGE)
  );
  
  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }
  
  const snapshot = await getDocs(q);
  console.log('getUserPosts: Found', snapshot.docs.length, 'posts for userId:', userId);
  
  const posts = snapshot.docs.map(doc => {
    const data = doc.data();
    console.log('getUserPosts: Post', doc.id, 'authorId:', data.authorId, 'userId:', userId, 'match:', data.authorId === userId);
    return {
      id: doc.id,
      ...data,
    };
  }) as PostDocument[];
  
  const newLastDoc = snapshot.docs.length > 0 
    ? snapshot.docs[snapshot.docs.length - 1] 
    : null;
  
  return { posts, lastDoc: newLastDoc };
}

/**
 * Get a single post by ID
 */
export async function getPostById(postId: string): Promise<PostDocument | null> {
  const postRef = doc(db, COLLECTIONS.POSTS, postId);
  const postSnap = await getDoc(postRef);
  
  if (!postSnap.exists()) {
    return null;
  }
  
  return {
    id: postSnap.id,
    ...postSnap.data(),
  } as PostDocument;
}

/**
 * Get multiple posts by their IDs
 * Uses individual getDoc calls (Firestore doesn't support efficient batch gets by ID)
 */
export async function getPostsByIds(postIds: string[]): Promise<PostDocument[]> {
  if (postIds.length === 0) {
    return [];
  }
  
  // Use Promise.all with individual gets
  const posts = await Promise.all(
    postIds.map(async (id) => {
      const postRef = doc(db, COLLECTIONS.POSTS, id);
      const postSnap = await getDoc(postRef);
      if (postSnap.exists()) {
        const data = postSnap.data();
        // Filter out deleted/hidden posts
        if (!data.isDeleted && !data.isHidden) {
          return {
            id: postSnap.id,
            ...data,
          } as PostDocument;
        }
      }
      return null;
    })
  );
  
  // Filter out nulls and sort by createdAt descending (most recent first)
  return posts
    .filter((p): p is PostDocument => p !== null)
    .sort((a, b) => {
      const aTime = a.createdAt?.toMillis() || 0;
      const bTime = b.createdAt?.toMillis() || 0;
      return bTime - aTime;
    });
}

// ============================================================================
// POST MUTATIONS
// ============================================================================

export interface CreatePostInput {
  content: string;
  mediaUrls?: string[];
  mediaType?: 'image' | 'video';
  visibility?: 'public' | 'followers' | 'private';
  replyToPostId?: string;
  isAnonymous?: boolean;
}

/**
 * Create a new post
 */
export async function createPost(
  author: UserDocument,
  input: CreatePostInput
): Promise<string> {
  // Debug logging
  console.log('createPost called with author:', JSON.stringify(author, null, 2));
  
  // Guard against undefined author
  if (!author || !author.id) {
    throw new Error('Author is required to create a post');
  }
  
  const postsRef = collection(db, COLLECTIONS.POSTS);
  
  // Extract author info with safe defaults
  const authorId = author.id;
  const authorUsername = author.username || author.email?.split('@')[0] || 'user';
  const authorDisplayName = author.displayName || authorUsername || 'User';
  const authorAvatar = author.avatar || '';
  const authorIsVerified = author.isVerified === true;
  const authorIsAdmin = author.isAdmin === true;
  
  console.log('Post author info:', { authorId, authorUsername, authorDisplayName, authorAvatar, authorIsVerified, authorIsAdmin });
  
  const postData: Omit<PostDocument, 'id'> = {
    content: input.content,
    
    // Author info (denormalized)
    authorId,
    authorUsername,
    authorDisplayName,
    authorAvatar,
    authorIsVerified,
    authorIsAdmin,
    
    // Media - only include mediaType if there are media URLs
    mediaUrls: input.mediaUrls || [],
    ...(input.mediaType && input.mediaUrls?.length ? { mediaType: input.mediaType } : {}),
    
    // Counters
    likesCount: 0,
    commentsCount: 0,
    popularityScore: 0,
    
    // Metadata
    ...(input.replyToPostId ? { replyToPostId: input.replyToPostId } : {}),
    isAnonymous: input.isAnonymous || false,
    visibility: input.visibility || 'public',
    isDeleted: false,
    isHidden: false,
    reportCount: 0,
    
    // Timestamps
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };
  
  const docRef = await addDoc(postsRef, postData);
  
  // Update user's post count
  const userRef = doc(db, COLLECTIONS.USERS, author.id);
  await updateDoc(userRef, {
    postsCount: increment(1),
    updatedAt: serverTimestamp(),
  });
  
  return docRef.id;
}

/**
 * Soft delete a post
 * Only the author can delete their own post
 */
export async function deletePost(postId: string, authorId: string): Promise<void> {
  const postRef = doc(db, COLLECTIONS.POSTS, postId);
  
  // Verify the post exists and get its data
  const postSnap = await getDoc(postRef);
  if (!postSnap.exists()) {
    throw new Error('Post not found');
  }
  
  const postData = postSnap.data() as PostDocument;
  
  // Verify that the user is the author
  if (postData.authorId !== authorId) {
    throw new Error('You can only delete your own posts');
  }
  
  // Soft delete the post
  await updateDoc(postRef, {
    isDeleted: true,
    updatedAt: serverTimestamp(),
  });
  
  // Decrement user's post count
  const userRef = doc(db, COLLECTIONS.USERS, authorId);
  await updateDoc(userRef, {
    postsCount: increment(-1),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update a post's content
 */
export async function updatePost(
  postId: string,
  content: string
): Promise<void> {
  const postRef = doc(db, COLLECTIONS.POSTS, postId);
  
  await updateDoc(postRef, {
    content,
    updatedAt: serverTimestamp(),
  });
}
