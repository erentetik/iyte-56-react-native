/**
 * Moderation Service
 * 
 * Handle content reporting and moderation queue.
 */

import { db } from '@/config/firebase';
import {
  COLLECTIONS,
  CommentDocument,
  ModerationAction,
  ModerationQueueDocument,
  PostDocument,
  ReportReason,
  UserDocument,
} from '@/types/firestore';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

// ============================================================================
// REPORT QUERIES
// ============================================================================

/**
 * Get pending reports (for moderators)
 */
export async function getPendingReports(
  limitCount: number = 50
): Promise<ModerationQueueDocument[]> {
  const moderationRef = collection(db, COLLECTIONS.MODERATION_QUEUE);
  
  const q = query(
    moderationRef,
    where('status', '==', 'pending'),
    orderBy('createdAt', 'asc'),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as ModerationQueueDocument[];
}

/**
 * Get reports for a specific user
 */
export async function getReportsForUser(
  userId: string,
  limitCount: number = 50
): Promise<ModerationQueueDocument[]> {
  const moderationRef = collection(db, COLLECTIONS.MODERATION_QUEUE);
  
  const q = query(
    moderationRef,
    where('reportedUserId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as ModerationQueueDocument[];
}

/**
 * Check if user has already reported content
 */
export async function hasUserReportedContent(
  contentType: 'post' | 'comment' | 'user',
  contentId: string,
  reporterId: string
): Promise<boolean> {
  const moderationRef = collection(db, COLLECTIONS.MODERATION_QUEUE);
  
  const q = query(
    moderationRef,
    where('contentType', '==', contentType),
    where('contentId', '==', contentId),
    where('reporterId', '==', reporterId)
  );
  
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

// ============================================================================
// REPORT MUTATIONS
// ============================================================================

export interface ReportInput {
  reason: ReportReason;
  description?: string;
}

/**
 * Report a post
 */
export async function reportPost(
  post: PostDocument,
  reporter: UserDocument,
  input: ReportInput
): Promise<string> {
  // Check if already reported by this user
  const alreadyReported = await hasUserReportedContent('post', post.id, reporter.id);
  if (alreadyReported) {
    throw new Error('You have already reported this content');
  }
  
  const moderationRef = collection(db, COLLECTIONS.MODERATION_QUEUE);
  
  const reportData: Omit<ModerationQueueDocument, 'id'> = {
    contentType: 'post',
    contentId: post.id,
    contentPreview: post.content.substring(0, 200),
    
    reporterId: reporter.id,
    reporterUsername: reporter.username,
    
    reportedUserId: post.authorId,
    reportedUsername: post.authorUsername,
    
    reason: input.reason,
    description: input.description,
    
    status: 'pending',
    
    createdAt: serverTimestamp() as Timestamp,
  };
  
  const docRef = await addDoc(moderationRef, reportData);
  
  // Increment post's report count
  const postRef = doc(db, COLLECTIONS.POSTS, post.id);
  await updateDoc(postRef, {
    reportCount: increment(1),
  });
  
  return docRef.id;
}

/**
 * Report a comment
 */
export async function reportComment(
  comment: CommentDocument,
  reporter: UserDocument,
  input: ReportInput
): Promise<string> {
  // Check if already reported by this user
  const alreadyReported = await hasUserReportedContent('comment', comment.id, reporter.id);
  if (alreadyReported) {
    throw new Error('You have already reported this content');
  }
  
  const moderationRef = collection(db, COLLECTIONS.MODERATION_QUEUE);
  
  const reportData: Omit<ModerationQueueDocument, 'id'> = {
    contentType: 'comment',
    contentId: comment.id,
    contentPreview: comment.content.substring(0, 200),
    
    reporterId: reporter.id,
    reporterUsername: reporter.username,
    
    reportedUserId: comment.authorId,
    reportedUsername: comment.authorUsername,
    
    reason: input.reason,
    description: input.description,
    
    status: 'pending',
    
    createdAt: serverTimestamp() as Timestamp,
  };
  
  const docRef = await addDoc(moderationRef, reportData);
  
  // Increment comment's report count
  const commentRef = doc(db, COLLECTIONS.COMMENTS, comment.id);
  await updateDoc(commentRef, {
    reportCount: increment(1),
  });
  
  return docRef.id;
}

/**
 * Report a user
 */
export async function reportUser(
  reportedUser: UserDocument,
  reporter: UserDocument,
  input: ReportInput
): Promise<string> {
  // Check if already reported by this user
  const alreadyReported = await hasUserReportedContent('user', reportedUser.id, reporter.id);
  if (alreadyReported) {
    throw new Error('You have already reported this user');
  }
  
  const moderationRef = collection(db, COLLECTIONS.MODERATION_QUEUE);
  
  const reportData: Omit<ModerationQueueDocument, 'id'> = {
    contentType: 'user',
    contentId: reportedUser.id,
    contentPreview: `@${reportedUser.username} - ${reportedUser.bio?.substring(0, 100) || 'No bio'}`,
    
    reporterId: reporter.id,
    reporterUsername: reporter.username,
    
    reportedUserId: reportedUser.id,
    reportedUsername: reportedUser.username,
    
    reason: input.reason,
    description: input.description,
    
    status: 'pending',
    
    createdAt: serverTimestamp() as Timestamp,
  };
  
  const docRef = await addDoc(moderationRef, reportData);
  
  return docRef.id;
}

// ============================================================================
// MODERATION ACTIONS (for moderators)
// ============================================================================

/**
 * Resolve a report
 */
export async function resolveReport(
  reportId: string,
  moderatorId: string,
  action: ModerationAction,
  notes?: string
): Promise<void> {
  const reportRef = doc(db, COLLECTIONS.MODERATION_QUEUE, reportId);
  
  await updateDoc(reportRef, {
    status: 'resolved',
    moderatorId,
    moderatorAction: action,
    moderatorNotes: notes,
    reviewedAt: serverTimestamp(),
    resolvedAt: serverTimestamp(),
  });
  
  // If content should be hidden/removed, update the content
  const reportSnap = await getDoc(reportRef);
  if (!reportSnap.exists()) return;
  
  const report = reportSnap.data() as ModerationQueueDocument;
  
  if (action === 'content_removed' || action === 'content_hidden') {
    if (report.contentType === 'post') {
      const postRef = doc(db, COLLECTIONS.POSTS, report.contentId);
      await updateDoc(postRef, {
        isHidden: action === 'content_hidden',
        isDeleted: action === 'content_removed',
      });
    } else if (report.contentType === 'comment') {
      const commentRef = doc(db, COLLECTIONS.COMMENTS, report.contentId);
      await updateDoc(commentRef, {
        isHidden: action === 'content_hidden',
        isDeleted: action === 'content_removed',
      });
    }
  }
  
  if (action === 'user_banned') {
    const userRef = doc(db, COLLECTIONS.USERS, report.reportedUserId);
    await updateDoc(userRef, {
      isBanned: true,
      banReason: notes || 'Violation of community guidelines',
    });
  }
}

/**
 * Dismiss a report (no action needed)
 */
export async function dismissReport(
  reportId: string,
  moderatorId: string,
  notes?: string
): Promise<void> {
  const reportRef = doc(db, COLLECTIONS.MODERATION_QUEUE, reportId);
  
  await updateDoc(reportRef, {
    status: 'dismissed',
    moderatorId,
    moderatorAction: 'no_action',
    moderatorNotes: notes,
    reviewedAt: serverTimestamp(),
    resolvedAt: serverTimestamp(),
  });
}
