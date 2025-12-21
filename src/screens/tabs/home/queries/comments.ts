/**
 * Comments Query Functions
 * 
 * Handle comments/replies with optimized queries.
 */

import { db } from '@/config/firebase';
import { createNotification } from '@/services/notifications';
import { COLLECTIONS, CommentDocument, PostDocument, UserDocument } from '@/types/firestore';
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
  updateDoc,
  where
} from 'firebase/firestore';

const COMMENTS_PER_PAGE = 20;

// ============================================================================
// COMMENT QUERIES
// ============================================================================

/**
 * Get comments for a post (top-level only)
 * Simplified query to avoid complex index requirements
 */
export async function getPostComments(
  postId: string,
  lastDoc?: QueryDocumentSnapshot<DocumentData>
): Promise<{ comments: CommentDocument[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
  const commentsRef = collection(db, COLLECTIONS.COMMENTS);
  
  // Simplified query - filter parentCommentId in memory to avoid complex index
  let q = query(
    commentsRef,
    where('postId', '==', postId),
    orderBy('createdAt', 'asc'),
    limit(COMMENTS_PER_PAGE * 2) // Fetch more to account for filtered items
  );
  
  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }
  
  const snapshot = await getDocs(q);
  
  // Filter in memory for top-level comments only
  const allComments = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as CommentDocument[];
  
  const comments = allComments
    .filter(c => !c.parentCommentId && !c.isDeleted && !c.isHidden)
    .slice(0, COMMENTS_PER_PAGE);
  
  const newLastDoc = snapshot.docs.length > 0 
    ? snapshot.docs[snapshot.docs.length - 1] 
    : null;
  
  return { comments, lastDoc: newLastDoc };
}

/**
 * Get replies to a specific comment
 * Simplified query to avoid complex index requirements
 */
export async function getCommentReplies(
  postId: string,
  parentCommentId: string,
  lastDoc?: QueryDocumentSnapshot<DocumentData>
): Promise<{ comments: CommentDocument[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
  console.log('getCommentReplies called:', { postId, parentCommentId });
  
  const commentsRef = collection(db, COLLECTIONS.COMMENTS);
  
  try {
    // Query requires composite index: postId (asc), parentCommentId (asc), createdAt (asc)
    let q = query(
      commentsRef,
      where('postId', '==', postId),
      where('parentCommentId', '==', parentCommentId),
      orderBy('createdAt', 'asc'),
      limit(COMMENTS_PER_PAGE * 2)
    );
    
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    
    const snapshot = await getDocs(q);
    console.log('getCommentReplies - snapshot size:', snapshot.size);
    
    // Filter in memory
    const allComments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as CommentDocument[];
    
    const comments = allComments
      .filter(c => !c.isDeleted && !c.isHidden)
      .slice(0, COMMENTS_PER_PAGE);
    
    console.log('getCommentReplies - filtered comments count:', comments.length);
    
    const newLastDoc = snapshot.docs.length > 0 
      ? snapshot.docs[snapshot.docs.length - 1] 
      : null;
    
    return { comments, lastDoc: newLastDoc };
  } catch (error: any) {
    console.error('Error in getCommentReplies:', error);
    console.error('Error code:', error?.code);
    console.error('Error message:', error?.message);
    
    // If it's an index error, provide helpful message
    if (error?.code === 'failed-precondition') {
      throw new Error(
        'Missing Firestore index. Please create a composite index for comments collection with fields: postId (asc), parentCommentId (asc), createdAt (asc). ' +
        'Check FIRESTORE_INDEXES.md for details.'
      );
    }
    
    throw error;
  }
}

/**
 * Get all comments for a post (flat list, for simple display)
 * Simplified query to avoid index requirements
 */
export async function getAllPostComments(
  postId: string,
  lastDoc?: QueryDocumentSnapshot<DocumentData>
): Promise<{ comments: CommentDocument[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
  const commentsRef = collection(db, COLLECTIONS.COMMENTS);
  
  // Simplified query - just filter by postId and order by createdAt
  // Filter deleted/hidden in memory to avoid complex index
  let q = query(
    commentsRef,
    where('postId', '==', postId),
    orderBy('createdAt', 'asc'),
    limit(COMMENTS_PER_PAGE * 2) // Fetch more to account for filtered items
  );
  
  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }
  
  const snapshot = await getDocs(q);
  
  // Filter in memory
  const allComments = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as CommentDocument[];
  
  const comments = allComments
    .filter(c => !c.isDeleted && !c.isHidden)
    .slice(0, COMMENTS_PER_PAGE);
  
  const newLastDoc = snapshot.docs.length > 0 
    ? snapshot.docs[snapshot.docs.length - 1] 
    : null;
  
  return { comments, lastDoc: newLastDoc };
}

/**
 * Get a single comment by ID
 */
export async function getCommentById(commentId: string): Promise<CommentDocument | null> {
  const commentRef = doc(db, COLLECTIONS.COMMENTS, commentId);
  const commentSnap = await getDoc(commentRef);
  
  if (!commentSnap.exists()) {
    return null;
  }
  
  return {
    id: commentSnap.id,
    ...commentSnap.data(),
  } as CommentDocument;
}

/**
 * Get comment count for a post
 */
export async function getPostCommentCount(postId: string): Promise<number> {
  const commentsRef = collection(db, COLLECTIONS.COMMENTS);
  
  const q = query(
    commentsRef,
    where('postId', '==', postId),
    where('isDeleted', '==', false)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.size;
}

/**
 * Get post IDs that a user has commented on
 */
export async function getUserCommentedPostIds(userId: string): Promise<string[]> {
  const commentsRef = collection(db, COLLECTIONS.COMMENTS);
  
  // Query comments by user, get unique postIds
  const q = query(
    commentsRef,
    where('authorId', '==', userId),
    where('isDeleted', '==', false)
  );
  
  const snapshot = await getDocs(q);
  const postIds = new Set<string>();
  
  snapshot.docs.forEach(doc => {
    const comment = doc.data() as CommentDocument;
    if (comment.postId) {
      postIds.add(comment.postId);
    }
  });
  
  return Array.from(postIds);
}

/**
 * Get total count of comments by a user
 */
export async function getUserCommentsCount(userId: string): Promise<number> {
  const commentsRef = collection(db, COLLECTIONS.COMMENTS);
  
  const q = query(
    commentsRef,
    where('authorId', '==', userId),
    where('isDeleted', '==', false)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.size;
}

// ============================================================================
// COMMENT MUTATIONS
// ============================================================================

export interface CreateCommentInput {
  content: string;
  parentCommentId?: string;
}

/**
 * Create a new comment
 */
export async function createComment(
  postId: string,
  author: UserDocument,
  input: CreateCommentInput
): Promise<string> {
  console.log('createComment called with:', { postId, author, input });
  
  const commentsRef = collection(db, COLLECTIONS.COMMENTS);
  
  // Determine depth
  let depth = 0;
  if (input.parentCommentId) {
    const parentComment = await getCommentById(input.parentCommentId);
    if (parentComment) {
      depth = parentComment.depth + 1;
    }
  }
  
  const commentData: Record<string, any> = {
    postId,
    content: input.content,
    
    // Author info (denormalized)
    authorId: author.id,
    authorUsername: author.username || 'user',
    authorDisplayName: author.username || 'user', // Use username instead of displayName
    authorIsVerified: author.isVerified || false,
    authorIsAdmin: author.isAdmin || false,
    
    // Threading
    parentCommentId: input.parentCommentId || null,
    depth,
    
    // Counters
    likesCount: 0,
    repliesCount: 0,
    
    // Moderation
    isDeleted: false,
    isHidden: false,
    reportCount: 0,
    
    // Timestamps
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  
  // Only include authorAvatar if it exists (Firestore doesn't allow undefined)
  if (author.avatar) {
    commentData.authorAvatar = author.avatar;
  }
  
  console.log('Creating comment with data:', commentData);
  
  const docRef = await addDoc(commentsRef, commentData);
  console.log('Comment created with ID:', docRef.id);
  
  // Update post's comment count
  try {
    const postRef = doc(db, COLLECTIONS.POSTS, postId);
    await updateDoc(postRef, {
      commentsCount: increment(1),
    });
    console.log('Post comment count updated');
  } catch (err) {
    console.error('Error updating post comment count:', err);
  }
  
  // If replying to a comment, update parent's reply count and notify parent comment author
  if (input.parentCommentId) {
    try {
      const parentRef = doc(db, COLLECTIONS.COMMENTS, input.parentCommentId);
      await updateDoc(parentRef, {
        repliesCount: increment(1),
      });
      
      // Get parent comment to notify its author
      const parentComment = await getCommentById(input.parentCommentId);
      if (parentComment && parentComment.authorId !== author.id) {
        try {
          // Get post to get post content preview
          const postRef = doc(db, COLLECTIONS.POSTS, postId);
          const postSnap = await getDoc(postRef);
          const postData = postSnap.exists() ? (postSnap.data() as PostDocument) : null;
          
          const replyNotificationData: any = {
            userId: parentComment.authorId,
            type: 'reply',
            actorId: author.id,
            actorUsername: author.username || 'user',
            actorDisplayName: author.username || 'user', // Use username instead of displayName
            postId: postId,
            commentId: docRef.id,
            postContent: postData?.content?.substring(0, 100) || '',
          };
          
          // Only include actorAvatar if it exists (Firestore doesn't allow undefined)
          if (author.avatar) {
            replyNotificationData.actorAvatar = author.avatar;
          }
          
          await createNotification(replyNotificationData);
          console.log('[Comment] Reply notification created for parent comment author');
        } catch (error) {
          console.error('Error creating reply notification:', error);
        }
      }
    } catch (err) {
      console.error('Error updating parent reply count:', err);
    }
  } else {
    // Top-level comment - notify post author (if different from comment author)
    try {
      const postRef = doc(db, COLLECTIONS.POSTS, postId);
      const postSnap = await getDoc(postRef);
      
      if (postSnap.exists()) {
        const postData = postSnap.data() as PostDocument;
        
        // Only notify if comment author is different from post author
        if (postData.authorId !== author.id) {
          const commentNotificationData: any = {
            userId: postData.authorId,
            type: 'comment',
            actorId: author.id,
            actorUsername: author.username || 'user',
            actorDisplayName: author.username || 'user', // Use username instead of displayName
            postId: postId,
            commentId: docRef.id,
            postContent: postData.content?.substring(0, 100) || '',
          };
          
          // Only include actorAvatar if it exists (Firestore doesn't allow undefined)
          if (author.avatar) {
            commentNotificationData.actorAvatar = author.avatar;
          }
          
          await createNotification(commentNotificationData);
          console.log('[Comment] Notification created for post author');
        }
      }
    } catch (error) {
      console.error('Error creating comment notification:', error);
      // Don't fail the comment creation if notification fails
    }
  }
  
  return docRef.id;
}

/**
 * Soft delete a comment
 */
export async function deleteComment(
  commentId: string,
  postId: string,
  parentCommentId?: string
): Promise<void> {
  const commentRef = doc(db, COLLECTIONS.COMMENTS, commentId);
  
  await updateDoc(commentRef, {
    isDeleted: true,
    updatedAt: serverTimestamp(),
  });
  
  // Decrement post's comment count
  const postRef = doc(db, COLLECTIONS.POSTS, postId);
  await updateDoc(postRef, {
    commentsCount: increment(-1),
  });
  
  // If reply, decrement parent's reply count
  if (parentCommentId) {
    const parentRef = doc(db, COLLECTIONS.COMMENTS, parentCommentId);
    await updateDoc(parentRef, {
      repliesCount: increment(-1),
    });
  }
}

/**
 * Update a comment's content
 */
export async function updateComment(
  commentId: string,
  content: string
): Promise<void> {
  const commentRef = doc(db, COLLECTIONS.COMMENTS, commentId);
  
  await updateDoc(commentRef, {
    content,
    updatedAt: serverTimestamp(),
  });
}
