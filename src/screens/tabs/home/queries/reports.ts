/**
 * Reports Query Functions
 * 
 * Handle content reporting with moderation queue.
 */

import { db } from '@/config/firebase';
import { COLLECTIONS, ReportReason, UserDocument } from '@/types/firestore';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    setDoc,
    Timestamp,
    where,
} from 'firebase/firestore';

// ============================================================================
// REPORT QUERIES
// ============================================================================

/**
 * Check if a user has already reported a post
 */
export async function hasUserReportedPost(
  postId: string,
  userId: string
): Promise<boolean> {
  const reportsRef = collection(db, COLLECTIONS.MODERATION_QUEUE);
  
  const q = query(
    reportsRef,
    where('contentType', '==', 'post'),
    where('contentId', '==', postId),
    where('reporterId', '==', userId)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.size > 0;
}

/**
 * Report a post
 */
export async function reportPost(
  postId: string,
  author: UserDocument,
  reporter: UserDocument,
  reason: ReportReason,
  description?: string
): Promise<void> {
  // Check if already reported
  const alreadyReported = await hasUserReportedPost(postId, reporter.id);
  if (alreadyReported) {
    throw new Error('You have already reported this post');
  }
  
  // Get post to extract preview
  const postRef = doc(db, COLLECTIONS.POSTS, postId);
  const postSnap = await getDoc(postRef);
  
  if (!postSnap.exists()) {
    throw new Error('Post not found');
  }
  
  const postData = postSnap.data();
  const contentPreview = postData.content?.substring(0, 100) || '';
  
  // Create report
  const reportsRef = collection(db, COLLECTIONS.MODERATION_QUEUE);
  const reportData = {
    contentType: 'post',
    contentId: postId,
    contentPreview,
    
    reporterId: reporter.id,
    reporterUsername: reporter.username,
    
    reportedUserId: author.id,
    reportedUsername: author.username,
    
    reason,
    description: description || null,
    
    status: 'pending',
    moderatorId: null,
    moderatorAction: null,
    moderatorNotes: null,
    
    createdAt: serverTimestamp() as Timestamp,
    reviewedAt: null,
    resolvedAt: null,
  };
  
  await setDoc(doc(reportsRef), reportData);
  
  // Increment post's report count
  const updateData: any = {
    reportCount: (postData.reportCount || 0) + 1,
  };
  
  await setDoc(postRef, updateData, { merge: true });
}

/**
 * Batch check which posts a user has reported
 */
export async function checkUserReportsForPosts(
  postIds: string[],
  userId: string
): Promise<Set<string>> {
  if (postIds.length === 0) return new Set();
  
  const reportsRef = collection(db, COLLECTIONS.MODERATION_QUEUE);
  const reportedPostIds = new Set<string>();
  
  // Batch in groups of 10 (Firestore 'in' limit)
  for (let i = 0; i < postIds.length; i += 10) {
    const batch = postIds.slice(i, i + 10);
    
    const q = query(
      reportsRef,
      where('contentType', '==', 'post'),
      where('contentId', 'in', batch),
      where('reporterId', '==', userId)
    );
    
    const snapshot = await getDocs(q);
    snapshot.docs.forEach(doc => {
      reportedPostIds.add(doc.data().contentId as string);
    });
  }
  
  return reportedPostIds;
}

