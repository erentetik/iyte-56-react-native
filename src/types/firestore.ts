/**
 * Firestore Data Model for Twitter-like MVP
 * 
 * Collections:
 * - users: User profiles and settings
 * - posts: Main content (tweets)
 * - comments: Replies to posts
 * - post_likes: Like records for posts
 * - follows: Follow relationships between users
 * - moderation_queue: Reported content for review
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// USERS COLLECTION
// Path: users/{userId}
// Purpose: Store user profiles, settings, and denormalized stats
// userId = Firebase Auth UID
// ============================================================================
export interface UserDocument {
  // Core fields
  id: string;                    // Same as document ID (auth.uid)
  email: string;                 // User's email
  username: string;              // Unique @username
  displayName: string;           // Display name
  avatar?: string;               // Profile image URL
  bio?: string;                  // User bio (max 160 chars)
  
  // Denormalized counters (updated via Cloud Functions or transactions)
  postsCount: number;            // Total posts by user
  followersCount: number;        // Users following this user
  followingCount: number;        // Users this user follows
  likesCount: number;            // Total likes received on posts
  
  // Status & moderation
  isVerified: boolean;           // Verified account badge
  isAdmin?: boolean;             // Admin account (special styling)
  isPrivate: boolean;            // Private account (future feature)
  isBanned: boolean;             // Account banned
  banReason?: string;            // Reason for ban
  
  // Warnings
  warningCount?: number;         // Total number of warnings
  warningShowed?: number;        // Number of warnings already shown to user
  lastWarningAt?: Timestamp;     // Timestamp of last warning
  
  // Notifications
  fcmToken?: string;             // Firebase Cloud Messaging token for push notifications
  notificationPermissionAsked?: boolean; // Whether we've asked for notification permission
  
  // Timestamps
  createdAt: Timestamp;          // Account creation
  updatedAt: Timestamp;          // Last profile update
  lastActiveAt?: Timestamp;      // Last activity timestamp
}

// ============================================================================
// POSTS COLLECTION
// Path: posts/{postId}
// Purpose: Main content feed. Denormalized author info for fast feed queries.
// ============================================================================
export interface PostDocument {
  // Core fields
  id: string;                    // Document ID (auto-generated)
  content: string;               // Post text (max 280 chars)
  
  // Author info (denormalized for feed performance)
  authorId: string;              // Reference to users/{userId}
  authorUsername: string;        // @username (denormalized)
  authorDisplayName: string;     // Display name (denormalized)
  authorAvatar?: string;         // Avatar URL (denormalized)
  authorIsVerified: boolean;     // Verified status (denormalized)
  authorIsAdmin?: boolean;       // Admin status (denormalized)
  
  // Media (optional)
  mediaUrls?: string[];          // Array of media URLs
  mediaType?: 'image' | 'video'; // Type of media
  
  // Engagement counters (denormalized)
  likesCount: number;            // Total likes
  commentsCount: number;         // Total comments/replies
  savesCount?: number;            // Total saves (optional, for popularity calculation)
  sharesCount?: number;          // Total shares (optional, for popularity calculation)
  popularityScore: number;       // Calculated popularity score for featured feed
  lastScoreUpdate?: Timestamp;   // Last time popularity score was updated
  
  // Post metadata
  replyToPostId?: string;        // If reply in thread, parent post
  isAnonymous: boolean;          // Posted anonymously (author info hidden in UI)
  
  // Visibility & moderation
  visibility: 'public' | 'followers' | 'private';
  isDeleted: boolean;            // Soft delete flag
  isHidden: boolean;             // Hidden by moderation
  reportCount: number;           // Number of reports
  
  // Timestamps
  createdAt: Timestamp;          // Post creation time
  updatedAt: Timestamp;          // Last edit time
}

// ============================================================================
// COMMENTS COLLECTION
// Path: comments/{commentId}
// Purpose: Replies/comments on posts. Separate collection for scalability.
// ============================================================================
export interface CommentDocument {
  // Core fields
  id: string;                    // Document ID (auto-generated)
  postId: string;                // Reference to posts/{postId}
  content: string;               // Comment text (max 280 chars)
  
  // Author info (denormalized)
  authorId: string;              // Reference to users/{userId}
  authorUsername: string;        // @username (denormalized)
  authorDisplayName: string;     // Display name (denormalized)
  authorAvatar?: string;         // Avatar URL (denormalized)
  authorIsVerified: boolean;     // Verified status (denormalized)
  authorIsAdmin?: boolean;       // Admin status (denormalized)
  
  // Threading (for nested replies)
  parentCommentId?: string;      // If nested reply, parent comment
  depth: number;                 // Nesting depth (0 = direct reply)
  
  // Engagement
  likesCount: number;            // Comment likes
  repliesCount: number;          // Nested replies count
  
  // Moderation
  isDeleted: boolean;            // Soft delete flag
  isHidden: boolean;             // Hidden by moderation
  reportCount: number;           // Number of reports
  
  // Timestamps
  createdAt: Timestamp;          // Comment creation
  updatedAt: Timestamp;          // Last edit
}

// ============================================================================
// POST_LIKES COLLECTION
// Path: post_likes/{likeId}
// Purpose: Track who liked what. Enables "users who liked" queries.
// Document ID format: {postId}_{userId} for uniqueness
// ============================================================================
export interface PostLikeDocument {
  id: string;                    // Format: {postId}_{userId}
  postId: string;                // Reference to posts/{postId}
  userId: string;                // Reference to users/{userId}
  
  // Denormalized for "liked by" list display
  username: string;              // @username
  displayName: string;           // Display name
  avatar?: string;               // Avatar URL
  
  // Timestamp
  createdAt: Timestamp;          // When the like occurred
}

// ============================================================================
// SAVED_POSTS COLLECTION
// Path: saved_posts/{saveId}
// Purpose: Track saved/bookmarked posts. Enables "saved posts" queries.
// Document ID format: {postId}_{userId} for uniqueness
// ============================================================================
export interface PostSaveDocument {
  id: string;                    // Format: {postId}_{userId}
  postId: string;                // Reference to posts/{postId}
  userId: string;                // Reference to users/{userId}
  
  // Denormalized post info (for quick display in saved posts list)
  postContent?: string;          // Preview first 100 chars
  postAuthorUsername?: string;   // @username
  postAuthorDisplayName?: string; // Display name
  postIsAnonymous?: boolean;     // Whether post is anonymous
  postMediaUrl?: string;         // First media URL if present
  
  // Timestamp
  createdAt: Timestamp;          // When the save occurred
}

// ============================================================================
// FOLLOWS COLLECTION
// Path: follows/{followId}
// Purpose: Track follow relationships. Enables follower/following queries.
// Document ID format: {followerId}_{followingId} for uniqueness
// ============================================================================
export interface FollowDocument {
  id: string;                    // Format: {followerId}_{followingId}
  followerId: string;            // User who is following
  followingId: string;         // User being followed
  
  // Denormalized for follower/following lists
  followerUsername: string;      // Follower's @username
  followerDisplayName: string;   // Follower's display name
  followerAvatar?: string;       // Follower's avatar
  
  followingUsername: string;     // Following's @username
  followingDisplayName: string;  // Following's display name
  followingAvatar?: string;      // Following's avatar
  
  // Timestamp
  createdAt: Timestamp;          // When the follow occurred
}

// ============================================================================
// MODERATION_QUEUE COLLECTION
// Path: moderation_queue/{reportId}
// Purpose: Store reported content for moderator review.
// ============================================================================
export interface ModerationQueueDocument {
  id: string;                    // Document ID (auto-generated)
  
  // What was reported
  contentType: 'post' | 'comment' | 'user';
  contentId: string;             // ID of reported content
  contentPreview: string;        // Preview text of reported content
  
  // Who reported
  reporterId: string;            // User who reported
  reporterUsername: string;      // Reporter's @username
  
  // Who was reported (content author)
  reportedUserId: string;        // Author of reported content
  reportedUsername: string;      // Author's @username
  
  // Report details
  reason: ReportReason;          // Categorized reason
  description?: string;          // Additional details from reporter
  
  // Moderation status
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  moderatorId?: string;          // Moderator who handled
  moderatorAction?: ModerationAction;
  moderatorNotes?: string;       // Internal notes
  
  // Timestamps
  createdAt: Timestamp;          // Report submission
  reviewedAt?: Timestamp;        // When reviewed
  resolvedAt?: Timestamp;        // When resolved
}

// ============================================================================
// WARNING TEXT DOCUMENT
// Path: users/{userId}/warningTexts/{warningId}
// Purpose: Store warning messages for users
// ============================================================================
export interface WarningTextDocument {
  id: number;                    // Warning ID (should match warningCount)
  message: string;               // Warning message text
}

// ============================================================================
// NOTIFICATIONS COLLECTION
// Path: notifications/{notificationId}
// Purpose: Store user notifications for likes, comments, replies
// ============================================================================
export interface NotificationDocument {
  id: string;                    // Document ID (auto-generated)
  userId: string;                // User who receives the notification
  type: 'like' | 'comment' | 'reply' | 'follow';
  
  // Actor (who performed the action)
  actorId: string;               // User who performed the action
  actorUsername: string;         // @username (denormalized)
  actorDisplayName: string;      // Display name (denormalized)
  actorAvatar?: string;           // Avatar URL (denormalized)
  
  // Target content
  postId?: string;               // Post ID (for like/comment notifications)
  commentId?: string;            // Comment ID (for reply notifications)
  postContent?: string;          // Post content preview (first 100 chars)
  
  // Status
  isRead: boolean;               // Whether user has read the notification
  
  // Timestamps
  createdAt: Timestamp;          // When the notification was created
}

// ============================================================================
// ENUMS & TYPES
// ============================================================================
export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'violence'
  | 'nudity'
  | 'misinformation'
  | 'impersonation'
  | 'other';

export type ModerationAction =
  | 'no_action'
  | 'content_removed'
  | 'content_hidden'
  | 'user_warned'
  | 'user_suspended'
  | 'user_banned';

// ============================================================================
// COLLECTION NAMES (constants)
// ============================================================================
export const COLLECTIONS = {
  USERS: 'users',
  POSTS: 'posts',
  COMMENTS: 'comments',
  POST_LIKES: 'post_likes',
  SAVED_POSTS: 'saved_posts',
  FOLLOWS: 'follows',
  MODERATION_QUEUE: 'moderation_queue',
  NOTIFICATIONS: 'notifications',
} as const;

// ============================================================================
// INDEX RECOMMENDATIONS
// ============================================================================
/**
 * Recommended Firestore Indexes:
 * 
 * 1. posts (public feed):
 *    - visibility ASC, createdAt DESC
 *    - authorId ASC, createdAt DESC
 * 
 * 2. comments:
 *    - postId ASC, createdAt ASC
 *    - postId ASC, parentCommentId ASC, createdAt ASC
 * 
 * 3. post_likes:
 *    - postId ASC, createdAt DESC
 *    - userId ASC, createdAt DESC
 * 
 * 4. follows:
 *    - followerId ASC, createdAt DESC
 *    - followingId ASC, createdAt DESC
 * 
 * 5. moderation_queue:
 *    - status ASC, createdAt ASC
 *    - reportedUserId ASC, status ASC
 */
