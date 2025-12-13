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
import { useCommentReplies, useCreateComment, usePostComments } from '@/hooks/queries/use-comments';
import { useHasLikedPost, useToggleLike } from '@/hooks/queries/use-likes';
import { useDeletePost, usePost } from '@/hooks/queries/use-posts';
import { useHasReportedPost } from '@/hooks/queries/use-reports';
import { useHasSavedPost, useToggleSave } from '@/hooks/queries/use-saves';
import { useUser } from '@/hooks/queries/use-user';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { PostOptionsModal } from '@/screens/modal/post-options';
import { ReportPostModal } from '@/screens/modal/report-post';
import { CommentDocument, PostDocument, UserDocument } from '@/types/firestore';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
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
function formatTimestamp(timestamp: Timestamp | undefined): string {
  if (!timestamp) return '';
  
  const now = new Date();
  const date = timestamp.toDate();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
}

/**
 * Transform PostDocument to TweetData
 */
function postToTweet(post: PostDocument, isLiked: boolean, isSaved: boolean, isReported: boolean): TweetData {
  return {
    id: post.id,
    author: {
      name: post.authorDisplayName,
      username: post.authorUsername,
      avatar: post.authorAvatar,
      isAdmin: post.authorIsAdmin,
    },
    content: post.content,
    timestamp: formatTimestamp(post.createdAt),
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
}

function ReplyItem({ reply, onReply, isReplyTarget, isLast }: ReplyItemProps) {
  const colors = useThemeColors();
  const isAdmin = reply.authorIsAdmin === true;
  const showAvatar = isAdmin && reply.authorAvatar;
  
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
                <AnimatedGradientText text={`@${reply.authorUsername || 'user'}`} style={styles.commentUsername} />
              ) : (
                <Text style={[styles.commentUsername, { color: colors.orange[9] }]}>
                  @{reply.authorUsername || 'user'}
                </Text>
              )}
            </View>
            <Text style={[styles.commentDot, { color: colors.neutral[9] }]}>•</Text>
            <Text style={[styles.commentTime, { color: colors.neutral[9] }]}>
              {formatTimestamp(reply.createdAt)}
            </Text>
          </View>
          <TouchableOpacity style={styles.moreButton}>
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
              style={[styles.smallPillButton, { borderColor: colors.neutral[6] }]}
            >
              <IconSymbol name="heart" size={14} color={colors.neutral[9]} />
              <Text style={[styles.smallPillText, { color: colors.neutral[9] }]}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.smallPillButton, { borderColor: colors.neutral[6] }]}
            >
              <IconSymbol name="bookmark" size={14} color={colors.neutral[9]} />
              <Text style={[styles.smallPillText, { color: colors.neutral[9] }]}>0</Text>
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
}

function RepliesSection({ postId, parentCommentId, onReplyToComment, replyingToId }: RepliesSectionProps) {
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
}

function CommentItem({ comment, postId, onReply, isReplyTarget, onReplyToComment, replyingToId }: CommentItemProps) {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const [showReplies, setShowReplies] = useState(false);
  const isAdmin = comment.authorIsAdmin === true;
  const showAvatar = isAdmin && comment.authorAvatar;
  
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
                  <AnimatedGradientText text={`@${comment.authorUsername || 'user'}`} style={styles.commentUsername} />
                ) : (
                  <Text style={[styles.commentUsername, { color: colors.orange[9] }]}>
                    @{comment.authorUsername || 'user'}
                  </Text>
                )}
              </View>
              <Text style={[styles.commentDot, { color: colors.neutral[9] }]}>•</Text>
              <Text style={[styles.commentTime, { color: colors.neutral[9] }]}>
                {formatTimestamp(comment.createdAt)}
              </Text>
            </View>
            <TouchableOpacity style={styles.moreButton}>
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
                style={[styles.smallPillButton, { borderColor: colors.neutral[6] }]}
              >
                <IconSymbol name="heart" size={14} color={colors.neutral[9]} />
                <Text style={[styles.smallPillText, { color: colors.neutral[9] }]}>0</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.smallPillButton, { borderColor: colors.neutral[6] }]}
              >
                <IconSymbol name="bookmark" size={14} color={colors.neutral[9]} />
                <Text style={[styles.smallPillText, { color: colors.neutral[9] }]}>0</Text>
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
          />
        </View>
      )}
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<CommentDocument | null>(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [postOptionsModalVisible, setPostOptionsModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'popular'>('latest');

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
  
  // Flatten comments
  const comments = useMemo((): CommentDocument[] => {
    return commentsData?.pages.flatMap((page: { comments: CommentDocument[] }) => page.comments) ?? [];
  }, [commentsData]);
  
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
      Alert.alert(t('common.error'), error?.message || 'Failed to delete post');
    }
  }, [post, user?.uid, isOwnPost, deletePostMutation, router, t]);
  
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
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleDelete },
      ]
    );
  }, [handleDelete]);
  
  // Handle reply to a comment
  const handleReplyToComment = useCallback((comment: CommentDocument) => {
    setReplyingTo(comment);
  }, []);
  
  // Cancel reply
  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);
  
  // Handle submit comment
  const handleSubmitComment = useCallback(async () => {
    if (!commentText.trim() || !userProfile || !postId) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      await createCommentMutation.mutateAsync({
        postId,
        author: userProfile as UserDocument,
        input: { 
          content: commentText.trim(),
          parentCommentId: replyingTo?.id,
        },
      });
      setCommentText('');
      setReplyingTo(null);
      refetchComments();
      refetchPost();
    } catch (error: any) {
      console.error('Error creating comment:', error);
      Alert.alert(t('common.error'), error?.message || t('postDetail.commentError'));
    } finally {
      setIsSubmitting(false);
    }
  }, [commentText, userProfile, postId, replyingTo, createCommentMutation, refetchComments, refetchPost, t]);
  
  // Load more comments
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  
  // Render post header
  const renderHeader = useCallback(() => {
    if (!post) return null;
    
    const tweetData = postToTweet(post, isLiked ?? false, isSaved ?? false, isReported ?? false);
    
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
          <TouchableOpacity style={styles.sortButton}>
            <Text style={[styles.sortButtonText, { color: colors.neutral[12] }]}>
              {sortBy === 'latest' ? 'Latest' : sortBy === 'oldest' ? 'Oldest' : 'Popular'}
            </Text>
            <IconSymbol name="chevron.down" size={14} color={colors.neutral[12]} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton}>
            <IconSymbol name="line.3.horizontal.decrease" size={16} color={colors.neutral[9]} />
            <Text style={[styles.filterText, { color: colors.neutral[9] }]}>Filter</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [post, isLiked, isSaved, isReported, handleLike, handleSave, handleReport, colors, sortBy]);
  
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
      />
    ),
    [postId, handleReplyToComment, replyingTo]
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
    displayName: post.authorDisplayName,
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
              disabled={!commentText.trim() || isSubmitting}
            >
              {isSubmitting ? (
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
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: '600',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
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
    fontSize: 15,
    fontWeight: '600',
  },
  commentDot: {
    marginHorizontal: 6,
    fontSize: 14,
  },
  commentTime: {
    fontSize: 14,
  },
  moreButton: {
    padding: 4,
  },
  commentContent: {
    fontSize: 15,
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
    fontSize: 13,
    fontWeight: '500',
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
    fontSize: 13,
    fontWeight: '500',
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
    fontSize: 13,
  },
  repliesEmpty: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  repliesEmptyText: {
    fontSize: 13,
  },
  loadMoreReplies: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
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
    fontSize: 14,
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
    fontSize: 15,
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
