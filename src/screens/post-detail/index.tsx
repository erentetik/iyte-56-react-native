/**
 * Post Detail Screen
 * 
 * Displays a single post with its comments and allows adding new comments.
 */

import { AnimatedGradientText } from '@/components/animated-gradient-text';
import { Tweet, TweetData } from '@/components/tweet';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCommentReplies, useCreateComment, useDeleteComment, usePostComments } from '@/hooks/queries/use-comments';
import { useHasLikedComment, useHasLikedPost, useToggleCommentLike, useToggleLike } from '@/hooks/queries/use-likes';
import { useDeletePost, usePost } from '@/hooks/queries/use-posts';
import { useHasReportedPost } from '@/hooks/queries/use-reports';
import { useHasSavedPost, useToggleSave } from '@/hooks/queries/use-saves';
import { useUser } from '@/hooks/queries/use-user';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { PostOptionsModal } from '@/screens/modal/post-options';
import { ReportCommentModal } from '@/screens/modal/report-comment';
import { ReportPostModal } from '@/screens/modal/report-post';
import { CommentDocument, PostDocument, UserDocument } from '@/types/firestore';
import { applyFont } from '@/utils/apply-fonts';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Format timestamp to relative time string
 */
function formatTimestamp(timestamp: Timestamp | undefined, t: (key: string) => string): string {
  if (!timestamp) return '';
  
  const now = new Date();
  const date = timestamp.toDate();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 60) return `${diffSeconds}${t('time.seconds')} ${t('time.ago')}`;
  if (diffMinutes < 60) return `${diffMinutes} ${diffMinutes > 1 ? t('time.minutesPlural') : t('time.minute')} ${t('time.ago')}`;
  if (diffHours < 24) return `${diffHours} ${diffHours > 1 ? t('time.hoursPlural') : t('time.hour')} ${t('time.ago')}`;
  if (diffDays < 7) return `${diffDays} ${diffDays > 1 ? t('time.daysPlural') : t('time.day')} ${t('time.ago')}`;
  
  return date.toLocaleDateString();
}

/**
 * Transform PostDocument to TweetData
 */
function postToTweet(post: PostDocument, isLiked: boolean, isSaved: boolean, isReported: boolean, t: (key: string) => string): TweetData {
  return {
    id: post.id,
    author: {
      name: post.authorUsername,
      username: post.authorUsername,
      avatar: post.authorAvatar,
      isAdmin: post.authorIsAdmin,
    },
    content: post.content,
    timestamp: formatTimestamp(post.createdAt, t),
    likes: post.likesCount,
    replies: post.commentsCount,
    isLiked,
    isSaved,
    isReported,
    isAnonymous: post.isAnonymous,
    imageUrl: post.mediaUrls?.[0],
  };
}

/**
 * Reply Item Component (nested reply) - Card style
 */
interface ReplyItemProps {
  reply: CommentDocument;
  onReply?: () => void;
  isReplyTarget?: boolean;
  isLast?: boolean;
  currentUserId?: string;
  userProfile?: UserDocument;
  onReport?: (comment: CommentDocument) => void;
  onDelete?: (comment: CommentDocument) => void;
}

function ReplyItem({ 
  reply, 
  onReply, 
  isReplyTarget, 
  isLast,
  currentUserId,
  userProfile,
  onReport,
  onDelete,
}: ReplyItemProps) {
  const { t } = useLanguage();
  const colors = useThemeColors();
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const isAdmin = reply.authorIsAdmin === true;
  const showAvatar = isAdmin && reply.authorAvatar;
  const isOwnComment = !!(currentUserId && reply.authorId === currentUserId);
  
  // Check if user has liked this comment
  const { data: isLiked } = useHasLikedComment(reply.id, currentUserId);
  const toggleCommentLikeMutation = useToggleCommentLike();
  
  // Handle like
  const handleLike = useCallback(() => {
    if (!userProfile) return;
    toggleCommentLikeMutation.mutate({
      commentId: reply.id,
      user: userProfile,
    });
  }, [userProfile, reply.id, toggleCommentLikeMutation]);
  
  // Handle report
  const handleReport = useCallback(() => {
    setShowOptionsModal(false);
    onReport?.(reply);
  }, [reply, onReport]);
  
  // Handle delete
  const handleDelete = useCallback(() => {
    setShowOptionsModal(false);
    Alert.alert(
      t('postOptions.deleteTitle'),
      t('postOptions.deleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('postOptions.delete'),
          style: 'destructive',
          onPress: () => onDelete?.(reply),
        },
      ]
    );
  }, [reply, onDelete, t]);
  
  return (
    <View style={styles.commentCardWrapper}>
      <View style={[
        styles.commentCard,
        {
          backgroundColor: colors.backgroundEmphasis,
          borderColor: colors.neutral[6],
        },
        isReplyTarget && { borderColor: colors.orange[6] }
      ]}>
        {/* Header row */}
        <View style={styles.commentHeaderRow}>
          <View style={styles.commentUserInfo}>
            {showAvatar && (
              <Image
                source={{ uri: reply.authorAvatar }}
                style={styles.commentAvatar}
                contentFit="cover"
              />
            )}
            <View style={styles.commentUsernameContainer}>
              {isAdmin ? (
                <AnimatedGradientText text={`@${reply.authorUsername || t('common.user')}`} style={styles.commentUsername} />
              ) : (
                <Text style={[styles.commentUsername, { color: colors.orange[9] }]}>
                  @{reply.authorUsername || t('common.user')}
                </Text>
              )}
            </View>
            <Text style={[styles.commentDot, { color: colors.neutral[9] }]}>•</Text>
            <Text style={[styles.commentTime, { color: colors.neutral[9] }]}>
              {formatTimestamp(reply.createdAt, t)}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.moreButton}
            onPress={() => setShowOptionsModal(true)}
          >
            <IconSymbol name="ellipsis" size={14} color={colors.neutral[9]} />
          </TouchableOpacity>
        </View>
        
        {/* Content */}
        <Text style={[styles.commentContent, { color: colors.neutral[12] }]}>
          {reply.content}
        </Text>
        
        {/* Action pills */}
        <View style={styles.commentActionsRow}>
          <View style={styles.commentActionsLeft}>
            <TouchableOpacity 
              style={[
                styles.smallPillButton, 
                { 
                  borderColor: isLiked ? colors.orange[6] : colors.neutral[6],
                  backgroundColor: isLiked ? colors.orange[2] : 'transparent',
                }
              ]}
              onPress={handleLike}
            >
              <IconSymbol 
                name={isLiked ? "heart.fill" : "heart"} 
                size={14} 
                color={isLiked ? colors.orange[9] : colors.neutral[9]} 
              />
              <Text style={[
                styles.smallPillText, 
                { color: isLiked ? colors.orange[9] : colors.neutral[9] }
              ]}>
                {reply.likesCount}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={[styles.responsePill, { borderColor: colors.neutral[6] }]}
            onPress={onReply}
          >
            <IconSymbol name="message" size={14} color={colors.neutral[9]} />
            <View style={[styles.pillSeparator, { backgroundColor: colors.neutral[6] }]} />
            <Text style={[styles.responsePillText, { color: colors.neutral[9] }]}>Reply</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Reply Options Modal */}
      <PostOptionsModal
        visible={showOptionsModal}
        isOwnPost={isOwnComment}
        onClose={() => setShowOptionsModal(false)}
        onDelete={handleDelete}
        onReport={handleReport}
      />
    </View>
  );
}

/**
 * Replies Section Component
 */
interface RepliesSectionProps {
  postId: string;
  parentCommentId: string;
  onReplyToComment: (comment: CommentDocument) => void;
  replyingToId?: string;
  currentUserId?: string;
  userProfile?: UserDocument;
  onReport?: (comment: CommentDocument) => void;
  onDelete?: (comment: CommentDocument) => void;
}

function RepliesSection({ 
  postId, 
  parentCommentId, 
  onReplyToComment, 
  replyingToId,
  currentUserId,
  userProfile,
  onReport,
  onDelete,
}: RepliesSectionProps) {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useCommentReplies(postId, parentCommentId);
  
  const replies = useMemo((): CommentDocument[] => {
    return data?.pages.flatMap((page: { comments: CommentDocument[] }) => page.comments) ?? [];
  }, [data]);
  
  if (isLoading) {
    return (
      <View style={styles.repliesLoading}>
        <ActivityIndicator size="small" color={colors.orange[9]} />
      </View>
    );
  }
  
  if (error) {
    console.error('Error loading replies:', error);
    return (
      <View style={styles.repliesError}>
        <Text style={[styles.repliesErrorText, { color: colors.neutral[11] }]}>
          {t('postDetail.repliesError')}
        </Text>
      </View>
    );
  }
  
  if (replies.length === 0) {
    return (
      <View style={styles.repliesEmpty}>
        <Text style={[styles.repliesEmptyText, { color: colors.neutral[9] }]}>
          {t('postDetail.noReplies')}
        </Text>
      </View>
    );
  }
  
  return (
    <View style={styles.repliesContainer}>
      {replies.map((reply, index) => (
        <ReplyItem
          key={reply.id}
          reply={reply}
          onReply={() => onReplyToComment(reply)}
          isReplyTarget={replyingToId === reply.id}
          isLast={index === replies.length - 1 && !hasNextPage}
          currentUserId={currentUserId}
          userProfile={userProfile}
          onReport={onReport}
          onDelete={onDelete}
        />
      ))}
      {hasNextPage && (
        <TouchableOpacity
          style={styles.loadMoreReplies}
          onPress={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? (
            <ActivityIndicator size="small" color={colors.orange[9]} />
          ) : (
            <Text style={[styles.loadMoreText, { color: colors.orange[9] }]}>
              {t('postDetail.loadMoreReplies')}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Comment Item Component - Card style with expandable replies
 */
interface CommentItemProps {
  comment: CommentDocument;
  postId: string;
  onReply?: () => void;
  isReplyTarget?: boolean;
  onReplyToComment: (comment: CommentDocument) => void;
  replyingToId?: string;
  currentUserId?: string;
  userProfile?: UserDocument;
  onReport?: (comment: CommentDocument) => void;
  onDelete?: (comment: CommentDocument) => void;
}

function CommentItem({ 
  comment, 
  postId, 
  onReply, 
  isReplyTarget, 
  onReplyToComment, 
  replyingToId,
  currentUserId,
  userProfile,
  onReport,
  onDelete,
}: CommentItemProps) {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [showReplies, setShowReplies] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const isAdmin = comment.authorIsAdmin === true;
  const showAvatar = isAdmin && comment.authorAvatar;
  const isOwnComment = !!(currentUserId && comment.authorId === currentUserId);
  
  // Check if user has liked this comment
  const { data: isLiked } = useHasLikedComment(comment.id, currentUserId);
  const toggleCommentLikeMutation = useToggleCommentLike();
  
  // Handle like
  const handleLike = useCallback(() => {
    if (!userProfile) return;
    toggleCommentLikeMutation.mutate({
      commentId: comment.id,
      user: userProfile,
    });
  }, [userProfile, comment.id, toggleCommentLikeMutation]);
  
  // Handle report
  const handleReport = useCallback(() => {
    setShowOptionsModal(false);
    onReport?.(comment);
  }, [comment, onReport]);
  
  // Handle delete
  const handleDelete = useCallback(() => {
    setShowOptionsModal(false);
    Alert.alert(
      t('postOptions.deleteTitle'),
      t('postOptions.deleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('postOptions.delete'),
          style: 'destructive',
          onPress: () => onDelete?.(comment),
        },
      ]
    );
  }, [comment, onDelete, t]);
  
  return (
    <View>
      <View style={styles.commentCardWrapper}>
        <View style={[
          styles.commentCard,
          {
            backgroundColor: colors.backgroundEmphasis,
            borderColor: colors.neutral[6],
          },
          isReplyTarget && { borderColor: colors.orange[6] }
        ]}>
          {/* Header row */}
          <View style={styles.commentHeaderRow}>
            <View style={styles.commentUserInfo}>
              {showAvatar && (
                <Image
                  source={{ uri: comment.authorAvatar }}
                  style={styles.commentAvatar}
                  contentFit="cover"
                />
              )}
              <View style={styles.commentUsernameContainer}>
                {isAdmin ? (
                  <AnimatedGradientText text={`@${comment.authorUsername || t('common.user')}`} style={styles.commentUsername} />
                ) : (
                  <Text style={[styles.commentUsername, { color: colors.orange[9] }]}>
                    @{comment.authorUsername || t('common.user')}
                  </Text>
                )}
              </View>
              <Text style={[styles.commentDot, { color: colors.neutral[9] }]}>•</Text>
              <Text style={[styles.commentTime, { color: colors.neutral[9] }]}>
                {formatTimestamp(comment.createdAt, t)}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.moreButton}
              onPress={() => setShowOptionsModal(true)}
            >
              <IconSymbol name="ellipsis" size={14} color={colors.neutral[9]} />
            </TouchableOpacity>
          </View>
          
          {/* Content */}
          <Text style={[styles.commentContent, { color: colors.neutral[12] }]}>
            {comment.content}
          </Text>
          
          {/* Action pills */}
          <View style={styles.commentActionsRow}>
            <View style={styles.commentActionsLeft}>
              <TouchableOpacity 
                style={[
                  styles.smallPillButton, 
                  { 
                    borderColor: isLiked ? colors.orange[6] : colors.neutral[6],
                    backgroundColor: isLiked ? colors.orange[2] : 'transparent',
                  }
                ]}
                onPress={handleLike}
              >
                <IconSymbol 
                  name={isLiked ? "heart.fill" : "heart"} 
                  size={14} 
                  color={isLiked ? colors.orange[9] : colors.neutral[9]} 
                />
                <Text style={[
                  styles.smallPillText, 
                  { color: isLiked ? colors.orange[9] : colors.neutral[9] }
                ]}>
                  {comment.likesCount}
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Right side: Responses pill with separator */}
            <TouchableOpacity 
              style={[styles.responsePill, { borderColor: colors.neutral[6] }]}
              onPress={() => {
                if (comment.repliesCount > 0) {
                  setShowReplies(!showReplies);
                } else {
                  onReply?.();
                }
              }}
            >
              <IconSymbol name="message" size={14} color={colors.neutral[9]} />
              <View style={[styles.pillSeparator, { backgroundColor: colors.neutral[6] }]} />
              <Text style={[styles.responsePillText, { color: colors.neutral[9] }]}>
                {comment.repliesCount > 0 
                  ? `${comment.repliesCount} Comments`
                  : 'Reply'
                }
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      {/* Nested replies */}
      {showReplies && comment.repliesCount > 0 && (
        <View style={styles.repliesSection}>
          <RepliesSection
            postId={postId}
            parentCommentId={comment.id}
            onReplyToComment={onReplyToComment}
            replyingToId={replyingToId}
            currentUserId={currentUserId}
            userProfile={userProfile}
            onReport={onReport}
            onDelete={onDelete}
          />
        </View>
      )}
      
      {/* Comment Options Modal */}
      <PostOptionsModal
        visible={showOptionsModal}
        isOwnPost={isOwnComment}
        onClose={() => setShowOptionsModal(false)}
        onDelete={handleDelete}
        onReport={handleReport}
      />
    </View>
  );
}

export function PostDetailScreen() {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ postId: string }>();
  const postId = params.postId;

  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<CommentDocument | null>(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [commentReportModalVisible, setCommentReportModalVisible] = useState(false);
  const [postOptionsModalVisible, setPostOptionsModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState<'latest' | 'mostLiked'>('latest');
  const [selectedComment, setSelectedComment] = useState<CommentDocument | null>(null);

  // Fetch post data
  const { data: post, isLoading: isLoadingPost, refetch: refetchPost } = usePost(postId);
  
  // Fetch user profile
  const { data: userProfile } = useUser(user?.uid);
  
  // Check if user has liked the post
  const { data: isLiked } = useHasLikedPost(postId, user?.uid);
  
  // Check if user has saved the post
  const { data: isSaved } = useHasSavedPost(postId, user?.uid);
  
  // Check if user has reported the post
  const { data: isReported } = useHasReportedPost(postId, user?.uid);
  
  // Toggle like mutation
  const toggleLikeMutation = useToggleLike();
  
  // Toggle save mutation
  const toggleSaveMutation = useToggleSave();
  
  // Delete post mutation
  const deletePostMutation = useDeletePost();
  
  // Delete comment mutation
  const deleteCommentMutation = useDeleteComment();
  
  // Check if current user is the author
  const isOwnPost = useMemo(() => {
    return !!(post && user?.uid && post.authorId === user.uid);
  }, [post, user?.uid]);
  
  // Fetch top-level comments only (replies are loaded separately)
  const {
    data: commentsData,
    isLoading: isLoadingComments,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchComments,
    isRefetching,
  } = usePostComments(postId);
  
  // Create comment mutation
  const createCommentMutation = useCreateComment();
  
  // Flatten and sort comments
  const comments = useMemo((): CommentDocument[] => {
    const allComments = commentsData?.pages.flatMap((page: { comments: CommentDocument[] }) => page.comments) ?? [];
    
    // Sort comments based on selected option
    if (sortBy === 'mostLiked') {
      return [...allComments].sort((a, b) => b.likesCount - a.likesCount);
    } else {
      // Latest: sort by createdAt descending (newest first)
      return [...allComments].sort((a, b) => {
        const aTime = a.createdAt?.toMillis() || 0;
        const bTime = b.createdAt?.toMillis() || 0;
        return bTime - aTime;
      });
    }
  }, [commentsData, sortBy]);
  
  // Handle like
  const handleLike = useCallback(() => {
    if (!userProfile || !postId) return;
    
    toggleLikeMutation.mutate({
      postId,
      user: userProfile as UserDocument,
    });
  }, [userProfile, postId, toggleLikeMutation]);
  
  // Handle save
  const handleSave = useCallback(() => {
    if (!userProfile || !post) return;
    
    toggleSaveMutation.mutate({
      post,
      user: userProfile as UserDocument,
    });
  }, [userProfile, post, toggleSaveMutation]);
  
  // Handle report
  const handleReport = useCallback(() => {
    if (!userProfile || !post) return;
    setReportModalVisible(true);
  }, [userProfile, post]);
  
  // Handle delete post
  const handleDelete = useCallback(async () => {
    if (!post || !user?.uid || !isOwnPost) return;
    
    try {
      await deletePostMutation.mutateAsync({
        postId: post.id,
        authorId: user.uid,
      });
      // Navigate back after successful delete
      router.back();
    } catch (error: any) {
      console.error('Error deleting post:', error);
      Alert.alert(t('common.error'), error?.message || t('postOptions.deleteError'));
    }
  }, [post, user?.uid, isOwnPost, deletePostMutation, router, t]);

  // Handle comment report
  const handleCommentReport = useCallback((comment: CommentDocument) => {
    if (!userProfile) return;
    setSelectedComment(comment);
    setCommentReportModalVisible(true);
  }, [userProfile]);

  // Handle comment delete
  const handleCommentDelete = useCallback(async (comment: CommentDocument) => {
    if (!user?.uid || comment.authorId !== user.uid) return;
    
    try {
      await deleteCommentMutation.mutateAsync({
        commentId: comment.id,
        postId: postId,
        parentCommentId: comment.parentCommentId,
      });
      // Refetch comments to update UI
      refetchComments();
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      Alert.alert(t('common.error'), error?.message || t('postOptions.deleteError'));
    }
  }, [user?.uid, postId, deleteCommentMutation, refetchComments, t]);
  
  // Handle sort button press
  const handleSortPress = useCallback(() => {
    const options = [t('postDetail.latest'), t('postDetail.mostLiked')];
    
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...options, t('common.cancel')],
          cancelButtonIndex: options.length,
          title: t('postDetail.sortComments'),
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            setSortBy('latest');
          } else if (buttonIndex === 1) {
            setSortBy('mostLiked');
          }
        }
      );
    } else {
      Alert.alert(
        t('postDetail.sortComments'),
        undefined,
        [
          ...options.map((option, index) => ({
            text: option,
            onPress: () => setSortBy(index === 0 ? 'latest' : 'mostLiked'),
          })),
          { text: t('common.cancel'), style: 'cancel' },
        ]
      );
    }
  }, [t]);

  // Close report modal
  const handleCloseReportModal = useCallback(() => {
    setReportModalVisible(false);
  }, []);
  
  // Handle header more button press - show modal
  const handleHeaderMorePress = useCallback(() => {
    setPostOptionsModalVisible(true);
  }, []);

  const handlePostDelete = useCallback(() => {
    Alert.alert(
      t('postOptions.deleteTitle'),
      t('postOptions.deleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('postOptions.delete'), style: 'destructive', onPress: handleDelete },
      ]
    );
  }, [handleDelete, t]);
  
  // Handle reply to a comment
  const handleReplyToComment = useCallback((comment: CommentDocument) => {
    setReplyingTo(comment);
  }, []);
  
  // Cancel reply
  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);
  
  // Handle submit comment - optimistic update
  const handleSubmitComment = useCallback(() => {
    if (!commentText.trim() || !userProfile || !postId) {
      return;
    }
    
    const content = commentText.trim();
    const parentCommentId = replyingTo?.id;
    
    // Clear input immediately (optimistic UI)
    setCommentText('');
    setReplyingTo(null);
    
    // Submit in background (don't await)
    createCommentMutation.mutate(
      {
        postId,
        author: userProfile as UserDocument,
        input: { 
          content,
          parentCommentId,
        },
      },
      {
        onError: (error: any) => {
          console.error('Error creating comment:', error);
          // Restore the comment text on error
          setCommentText(content);
          if (replyingTo) {
            setReplyingTo(replyingTo);
          }
          Alert.alert(t('common.error'), error?.message || t('postDetail.commentError'));
        },
      }
    );
  }, [commentText, userProfile, postId, replyingTo, createCommentMutation, t]);
  
  // Load more comments
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  
  // Render post header
  const renderHeader = useCallback(() => {
    if (!post) return null;
    
    const tweetData = postToTweet(post, isLiked ?? false, isSaved ?? false, isReported ?? false, t);
    
    return (
      <View>
        <Tweet
          tweet={tweetData}
          onLike={handleLike}
          onSave={handleSave}
          onReport={handleReport}
          onDelete={handleDelete}
          isOwnPost={isOwnPost}
        />
        
        {/* Comments section header with Latest/Filter */}
        <View style={[styles.commentsHeader, { borderBottomColor: colors.neutral[6] }]}>
          <TouchableOpacity 
            style={styles.sortButton}
            onPress={handleSortPress}
          >
            <Text style={[styles.sortButtonText, { color: colors.neutral[12] }]}>
              {sortBy === 'latest' ? t('postDetail.latest') : t('postDetail.mostLiked')}
            </Text>
            <IconSymbol name="chevron.down" size={14} color={colors.neutral[12]} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [post, isLiked, isSaved, isReported, handleLike, handleSave, handleReport, handleDelete, isOwnPost, colors, sortBy, t, handleSortPress]);
  
  // Render comment item
  const renderComment = useCallback(
    ({ item }: { item: CommentDocument }) => (
      <CommentItem 
        comment={item}
        postId={postId}
        onReply={() => handleReplyToComment(item)}
        isReplyTarget={replyingTo?.id === item.id}
        onReplyToComment={handleReplyToComment}
        replyingToId={replyingTo?.id}
        currentUserId={user?.uid}
        userProfile={userProfile ?? undefined}
        onReport={handleCommentReport}
        onDelete={handleCommentDelete}
      />
    ),
    [postId, handleReplyToComment, replyingTo, user?.uid, userProfile, handleCommentReport, handleCommentDelete]
  );
  
  // Render footer
  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.orange[9]} />
      </View>
    );
  }, [isFetchingNextPage, colors.orange]);
  
  // Render empty comments
  const renderEmpty = useCallback(() => {
    if (isLoadingComments) return null;
    
    return (
      <View style={styles.emptyComments}>
        <IconSymbol name="bubble.left" size={40} color={colors.neutral[8]} />
        <Text style={[styles.emptyText, { color: colors.neutral[9] }]}>
          {t('postDetail.noComments')}
        </Text>
      </View>
    );
  }, [isLoadingComments, colors, t]);

  if (isLoadingPost) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.orange[9]} />
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.neutral[11] }]}>
            {t('postDetail.notFound')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Create author object for report modal
  const postAuthor: UserDocument = {
    id: post.authorId,
    username: post.authorUsername,
    displayName: post.authorUsername, // Keep for type compatibility but use username
    email: '',
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
    likesCount: 0,
    isVerified: post.authorIsVerified,
    isPrivate: false,
    isBanned: false,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.neutral[6],
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={20} color={colors.neutral[12]} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIcon} onPress={handleHeaderMorePress}>
          <IconSymbol name="ellipsis" size={20} color={colors.neutral[12]} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior="padding"
        style={styles.keyboardView}
        keyboardVerticalOffset={0}
      >
        {/* Comments List */}
        <FlatList
          data={comments}
          renderItem={renderComment}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                refetchPost();
                refetchComments();
              }}
              tintColor={colors.orange[9]}
              colors={[colors.orange[9]]}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />

        {/* Comment Input */}
        <View
          style={[
            styles.inputWrapper,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.neutral[6],
            },
          ]}
        >
          {/* Reply indicator */}
          {replyingTo && (
            <View style={[styles.replyingToBar, { backgroundColor: colors.neutral[3] }]}>
              <Text style={[styles.replyingToText, { color: colors.neutral[11] }]}>
                Replying to <Text style={{ color: colors.orange[9] }}>@{replyingTo.authorUsername}</Text>
              </Text>
              <TouchableOpacity onPress={handleCancelReply}>
                <IconSymbol name="xmark.circle.fill" size={20} color={colors.neutral[9]} />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.commentInput,
                {
                  backgroundColor: colors.neutral[3],
                  color: colors.neutral[12],
                  borderColor: colors.neutral[6],
                },
              ]}
              placeholder={replyingTo ? t('postDetail.replyPlaceholder') : t('postDetail.commentPlaceholder')}
              placeholderTextColor={colors.neutral[9]}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor: commentText.trim() ? colors.orange[9] : colors.neutral[6],
                },
              ]}
              onPress={handleSubmitComment}
              disabled={!commentText.trim() || createCommentMutation.isPending}
            >
              {createCommentMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <IconSymbol name="paperplane.fill" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      
      {/* Report Modal */}
      <PostOptionsModal
        visible={postOptionsModalVisible}
        isOwnPost={isOwnPost}
        onClose={() => setPostOptionsModalVisible(false)}
        onDelete={handlePostDelete}
        onReport={handleReport}
      />
      <ReportPostModal
        visible={reportModalVisible}
        post={post}
        author={postAuthor}
        reporter={userProfile as UserDocument | null}
        onClose={handleCloseReportModal}
      />
      <ReportCommentModal
        visible={commentReportModalVisible}
        comment={selectedComment}
        reporter={userProfile as UserDocument | null}
        onClose={() => {
          setCommentReportModalVisible(false);
          setSelectedComment(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerIcon: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    ...applyFont({
      fontSize: 16,
    }),
    textAlign: 'center',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sortButtonText: {
    ...applyFont({
      fontSize: 16,
      fontWeight: '600',
    }),
  },
  commentCardWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  commentCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  commentUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  commentUsernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentUsername: {
    ...applyFont({
      fontSize: 15,
      fontWeight: '600',
    }),
  },
  commentDot: {
    marginHorizontal: 6,
    ...applyFont({
      fontSize: 14,
    }),
  },
  commentTime: {
    ...applyFont({
      fontSize: 14,
    }),
  },
  moreButton: {
    padding: 4,
  },
  commentContent: {
    ...applyFont({
      fontSize: 15,
    }),
    lineHeight: 22,
    marginBottom: 14,
  },
  commentActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentActionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  smallPillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 5,
  },
  smallPillText: {
    ...applyFont({
      fontSize: 13,
      fontWeight: '500',
    }),
  },
  responsePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  pillSeparator: {
    width: 1,
    height: 14,
  },
  responsePillText: {
    ...applyFont({
      fontSize: 13,
      fontWeight: '500',
    }),
  },
  repliesSection: {
    marginLeft: 24,
  },
  repliesContainer: {
    // Container for replies
  },
  repliesLoading: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  repliesError: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  repliesErrorText: {
    ...applyFont({
      fontSize: 13,
    }),
  },
  repliesEmpty: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  repliesEmptyText: {
    ...applyFont({
      fontSize: 13,
    }),
  },
  loadMoreReplies: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  loadMoreText: {
    ...applyFont({
      fontSize: 13,
      fontWeight: '500',
    }),
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    ...applyFont({
      fontSize: 15,
    }),
    marginTop: 12,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  inputWrapper: {
    borderTopWidth: 1,
  },
  replyingToBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  replyingToText: {
    ...applyFont({
      fontSize: 14,
    }),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  commentInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...applyFont({
      fontSize: 15,
    }),
    maxHeight: 100,
    borderWidth: 1,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
