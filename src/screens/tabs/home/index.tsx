import { Tweet, TweetData } from '@/components/tweet';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { WarningModal } from '@/components/warning-modal';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWarning } from '@/contexts/WarningContext';
// import { useFollowingIds, useFollowUser, useUnfollowUser } from '@/hooks/queries/use-follows';
import { queryKeys } from '@/hooks/queries/query-client';
import { useBatchLikeCheck, useToggleLike } from '@/hooks/queries/use-likes';
import { useDeletePost, useFeaturedFeed, /* useFollowingFeed, */ useLatestFeed } from '@/hooks/queries/use-posts';
import { useBatchReportCheck } from '@/hooks/queries/use-reports';
import { useBatchSaveCheck, useToggleSave } from '@/hooks/queries/use-saves';
import { useUser } from '@/hooks/queries/use-user';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { ReportPostModal } from '@/screens/modal/report-post';
import { configureNotificationHandler, hasNotificationPermissionBeenAsked, registerFCMToken } from '@/services/notifications';
import { blockUser, updateWarningShowed } from '@/services/users';
import { getPendingWarningId, getWarningText } from '@/services/warnings';
import { PostDocument, UserDocument } from '@/types/firestore';
import { applyFont } from '@/utils/apply-fonts';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
  const postDate = timestamp.toDate();
  const diffMs = now.getTime() - postDate.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 60) return `${diffSeconds}${t('time.seconds')} ${t('time.ago')}`;
  if (diffMinutes < 60) return `${diffMinutes} ${diffMinutes > 1 ? t('time.minutesPlural') : t('time.minute')} ${t('time.ago')}`;
  if (diffHours < 24) return `${diffHours} ${diffHours > 1 ? t('time.hoursPlural') : t('time.hour')} ${t('time.ago')}`;
  if (diffDays < 7) return `${diffDays} ${diffDays > 1 ? t('time.daysPlural') : t('time.day')} ${t('time.ago')}`;
  
  return postDate.toLocaleDateString();
}

/**
 * Transform PostDocument to TweetData for the Tweet component
 */
function postToTweet(
  post: PostDocument, 
  isLiked: boolean, 
  isSaved: boolean, 
  isReported: boolean,
  t: (key: string) => string,
  // isFollowingAuthor: boolean
): TweetData {
  return {
    id: post.id,
    author: {
      id: post.authorId,
      name: post.authorDisplayName,
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
    // isFollowing: isFollowingAuthor,
  };
}

type HomeTab = 'featured' | 'latest';

export function HomeScreen() {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { pendingWarning, clearPendingWarning, setPendingWarning } = useWarning();
  
  const [activeTab, setActiveTab] = useState<HomeTab>('featured');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostDocument | null>(null);
  const [selectedPostAuthor, setSelectedPostAuthor] = useState<UserDocument | null>(null);
  const [warningModalVisible, setWarningModalVisible] = useState(false);
  const [warningJustClosed, setWarningJustClosed] = useState(false);
  
  // Fetch current user's profile for like/save/report operations
  const { data: userProfile } = useUser(user?.uid);
  
  // Configure Firebase Messaging notification handlers on mount
  React.useEffect(() => {
    configureNotificationHandler();
  }, []);
  
  // Request notification permissions and register FCM token
  React.useEffect(() => {
    const requestNotificationPermission = async () => {
      if (!user?.uid || !userProfile) {
        return;
      }
      
      try {
        // Check if we've already asked for permission
        const hasAsked = await hasNotificationPermissionBeenAsked(user.uid);
        
        if (!hasAsked) {
          // Register FCM token (this will request permission if not granted)
          await registerFCMToken(user.uid);
          
          // Invalidate user query to refetch updated profile
          queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(user.uid) });
        } else if (!userProfile.fcmToken) {
          // If permission was asked but token is missing, try to register again
          await registerFCMToken(user.uid);
          queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(user.uid) });
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    };
    
    requestNotificationPermission();
  }, [user?.uid, userProfile, queryClient]);
  
  // Check for warnings if not already set (fallback check in home screen)
  React.useEffect(() => {
    const checkWarnings = async () => {
      // Don't check if warning was just closed or if there's already a pending warning
      if (!userProfile || !user?.uid || pendingWarning || warningJustClosed) {
        return;
      }
      
      try {
        const pendingWarningId = getPendingWarningId(
          userProfile.warningCount,
          userProfile.warningShowed
        );
        
        if (pendingWarningId) {
          const warningText = await getWarningText(user?.uid, pendingWarningId);
          if (warningText) {
            setPendingWarning(warningText);
          }
        }
      } catch (error) {
        console.error('Error checking warnings:', error);
      }
    };
    
    if (userProfile) {
      checkWarnings();
    }
  }, [userProfile, user?.uid, pendingWarning, warningJustClosed, setPendingWarning]);
  
  // Show warning modal if there's a pending warning
  React.useEffect(() => {
    if (pendingWarning && user?.uid) {
      setWarningModalVisible(true);
    }
  }, [pendingWarning, user?.uid]);
  
  // Handle warning modal close - update warningShowed
  const handleWarningClose = useCallback(async () => {
    if (pendingWarning && user?.uid) {
      try {
        // Set flag to prevent immediate re-check
        setWarningJustClosed(true);
        
        // Update warningShowed in Firestore
        await updateWarningShowed(user?.uid, pendingWarning.id);
        
        // Invalidate user query to refetch updated profile
        queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(user?.uid) });
        
        // Clear warning and close modal
        clearPendingWarning();
        setWarningModalVisible(false);
        
        // Reset flag after a delay to allow profile to update
        setTimeout(() => {
          setWarningJustClosed(false);
        }, 1000);
      } catch (error) {
        console.error('Error updating warningShowed:', error);
        // Still close the modal even if update fails
        clearPendingWarning();
        setWarningModalVisible(false);
        setWarningJustClosed(false);
      }
    } else {
      setWarningModalVisible(false);
    }
  }, [pendingWarning, user?.uid, clearPendingWarning, queryClient]);
  
  // Fetch following IDs for the current user
  // const { data: followingIds } = useFollowingIds(user?.uid);
  
  // Fetch featured feed (sorted by popularity)
  // Get blocked users list from user profile
  const blockedUsers = userProfile?.blockedUsers || [];
  
  const featuredFeed = useFeaturedFeed(blockedUsers);
  
  // Fetch latest feed (sorted by createdAt)
  const latestFeed = useLatestFeed(blockedUsers);
  
  // Fetch following feed
  // const followingFeed = useFollowingFeed(user?.uid || '', followingIds || []);
  
  // Get the active feed based on tab
  const getActiveFeed = () => {
    switch (activeTab) {
      case 'featured':
        return featuredFeed;
      case 'latest':
        return latestFeed;
      default:
        return featuredFeed;
    }
  };
  
  const activeFeed = getActiveFeed();
  
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = activeFeed;
  
  // Flatten pages into single array of posts
  const posts = useMemo((): PostDocument[] => {
    return data?.pages.flatMap((page: { posts: PostDocument[] }) => page.posts) ?? [];
  }, [data]);
  
  // Filter posts based on search query
  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return posts;
    const query = searchQuery.toLowerCase();
    return posts.filter(
      (post) =>
        post.content.toLowerCase().includes(query) ||
        post.authorUsername.toLowerCase().includes(query) ||
        post.authorDisplayName.toLowerCase().includes(query)
    );
  }, [posts, searchQuery]);
  
  // Get post IDs for batch checks
  const postIds = useMemo(() => filteredPosts.map((p: PostDocument) => p.id), [filteredPosts]);
  
  // Create a Set of following IDs for quick lookup
  // const followingIdsSet = useMemo(() => new Set(followingIds || []), [followingIds]);
  
  // Batch check which posts user has liked
  const { data: likedPostIds } = useBatchLikeCheck(postIds, user?.uid);
  
  // Batch check which posts user has saved
  const { data: savedPostIds } = useBatchSaveCheck(postIds, user?.uid);
  
  // Batch check which posts user has reported
  const { data: reportedPostIds } = useBatchReportCheck(postIds, user?.uid);
  
  // Toggle like mutation
  const toggleLikeMutation = useToggleLike();
  
  // Toggle save mutation
  const toggleSaveMutation = useToggleSave();
  
  // Delete post mutation
  const deletePostMutation = useDeletePost();
  
  // Follow/unfollow mutations
  // const followUserMutation = useFollowUser();
  // const unfollowUserMutation = useUnfollowUser();
  
  // Handle like action
  const handleLike = useCallback(
    (postId: string) => {
      if (!userProfile) return;
      
      toggleLikeMutation.mutate({
        postId,
        user: userProfile as UserDocument,
      });
    },
    [userProfile, toggleLikeMutation]
  );
  
  // Handle post press - navigate to detail
  const handlePostPress = useCallback(
    (postId: string) => {
      router.push(`/post/${postId}`);
    },
    [router]
  );
  
  // Handle reply - navigate to detail
  const handleReply = useCallback(
    (postId: string) => {
      router.push(`/post/${postId}`);
    },
    [router]
  );
  
  // Handle save action
  const handleSave = useCallback(
    (post: PostDocument) => {
      if (!userProfile) return;
      
      toggleSaveMutation.mutate({
        post,
        user: userProfile as UserDocument,
      });
    },
    [userProfile, toggleSaveMutation]
  );
  
  // Handle delete action
  const handleDelete = useCallback(async (post: PostDocument) => {
    if (!userProfile || !user?.uid || post.authorId !== user.uid) return;
    
    try {
      await deletePostMutation.mutateAsync({
        postId: post.id,
        authorId: user.uid,
      });
    } catch (error: any) {
      console.error('Error deleting post:', error);
      Alert.alert(t('common.error'), error?.message || t('postOptions.deleteError'));
    }
  }, [userProfile, user?.uid, deletePostMutation, t]);
  
  // Handle report action
  const handleReport = useCallback((post: PostDocument) => {
    if (!userProfile) return;
    
    const author: UserDocument = {
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
    
    setSelectedPost(post);
    setSelectedPostAuthor(author);
    setReportModalVisible(true);
  }, [userProfile]);

  // Handle block user action
  const handleBlock = useCallback(async (post: PostDocument) => {
    if (!userProfile || !user?.uid || post.authorId === user.uid || post.isAnonymous) return;
    
    Alert.alert(
      t('postOptions.blockUserConfirm'),
      t('postOptions.blockUserMessage').replace('{{username}}', post.authorUsername),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('postOptions.blockUser'),
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(user.uid, post.authorId);
              Alert.alert(t('common.success'), t('postOptions.blockUserSuccess'));
              // Invalidate user query to refresh blocked users list
              queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(user.uid) });
              // Invalidate feeds to remove blocked user's posts
              queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
            } catch (error: any) {
              console.error('Error blocking user:', error);
              Alert.alert(t('common.error'), error?.message || t('postOptions.blockUserError'));
            }
          },
        },
      ]
    );
  }, [userProfile, user?.uid, t, queryClient]);
  
  // Handle follow/unfollow action
  // const handleFollow = useCallback(
  //   (post: PostDocument) => {
  //     if (!userProfile || post.isAnonymous) return;
  //     
  //     const isCurrentlyFollowing = followingIdsSet.has(post.authorId);
  //     
  //     const followingUser: UserDocument = {
  //       id: post.authorId,
  //       username: post.authorUsername,
  //       displayName: post.authorDisplayName,
  //       email: '',
  //       postsCount: 0,
  //       followersCount: 0,
  //       followingCount: 0,
  //       likesCount: 0,
  //       isVerified: post.authorIsVerified,
  //       isPrivate: false,
  //       isBanned: false,
  //       createdAt: post.createdAt,
  //       updatedAt: post.updatedAt,
  //     };
  //     
  //     if (isCurrentlyFollowing) {
  //       unfollowUserMutation.mutate({
  //         followerId: userProfile.id,
  //         followingId: post.authorId,
  //       });
  //     } else {
  //       followUserMutation.mutate({
  //         follower: userProfile as UserDocument,
  //         following: followingUser,
  //       });
  //     }
  //   },
  //   [userProfile, followingIdsSet, followUserMutation, unfollowUserMutation]
  // );
  
  // Close report modal
  const handleCloseReportModal = useCallback(() => {
    setReportModalVisible(false);
    setSelectedPost(null);
    setSelectedPostAuthor(null);
  }, []);
  
  // Load more posts when reaching end
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  
  // Handle search toggle
  const handleSearchToggle = useCallback(() => {
    setShowSearch(!showSearch);
    if (showSearch) {
      setSearchQuery('');
    }
  }, [showSearch]);
  
  // Render each post item
  const renderItem = useCallback(
    ({ item }: { item: PostDocument }) => {
      const isLiked = likedPostIds?.has(item.id) ?? false;
      const isSaved = savedPostIds?.has(item.id) ?? false;
      const isReported = reportedPostIds?.has(item.id) ?? false;
      const isOwnPost = !!(user?.uid && item.authorId === user.uid);
      // const isFollowingAuthor = followingIdsSet.has(item.authorId);
      
      const tweet = postToTweet(item, isLiked, isSaved, isReported, t /*, isFollowingAuthor */);
      
      return (
        <Tweet
          tweet={tweet}
          onPress={() => handlePostPress(item.id)}
          onLike={() => handleLike(item.id)}
          onReply={() => handleReply(item.id)}
          onSave={() => handleSave(item)}
          onReport={() => handleReport(item)}
          onDelete={() => handleDelete(item)}
          onBlock={() => handleBlock(item)}
          isOwnPost={isOwnPost}
          // onFollow={() => handleFollow(item)}
          // currentUserId={user?.uid}
        />
      );
    },
    [likedPostIds, savedPostIds, reportedPostIds, user?.uid, handlePostPress, handleLike, handleReply, handleSave, handleReport, handleDelete, handleBlock, t /*, followingIdsSet, handleFollow */]
  );
  
  // Render footer (loading indicator for pagination)
  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.orange[9]} />
      </View>
    );
  }, [isFetchingNextPage, colors.orange]);
  
  // Render empty state
  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    
    let message = searchQuery ? t('tabs.home.noPostsFound') : t('tabs.home.empty');
    // if (activeTab === 'follow' && !searchQuery) {
    //   message = 'Follow users to see their posts here';
    // }
    
    return (
      <View style={styles.emptyContainer}>
        <IconSymbol name="doc.text" size={48} color={colors.neutral[8]} />
        <Text style={[styles.emptyText, { color: colors.neutral[9] }]}>
          {message}
        </Text>
      </View>
    );
  }, [isLoading, colors, t, searchQuery /*, activeTab */]);

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
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.neutral[12] }]}>
            IYTE56
          </Text>
        </View>
        <TouchableOpacity style={styles.headerIcon} onPress={handleSearchToggle}>
          <IconSymbol 
            name={showSearch ? "xmark" : "magnifyingglass"} 
            size={20} 
            color={colors.neutral[12]} 
          />
        </TouchableOpacity>
      </View>
      
      {/* Search Bar */}
      {showSearch && (
        <View style={[styles.searchContainer, { backgroundColor: colors.background, borderBottomColor: colors.neutral[6] }]}>
          <View style={[styles.searchInputWrapper, { backgroundColor: colors.neutral[3], borderColor: colors.neutral[6] }]}>
            <IconSymbol name="magnifyingglass" size={18} color={colors.neutral[9]} />
            <TextInput
              style={[styles.searchInput, { color: colors.neutral[12] }]}
              placeholder={t('search.placeholder')}
              placeholderTextColor={colors.neutral[9]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <IconSymbol name="xmark.circle.fill" size={18} color={colors.neutral[9]} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
      
      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.background, borderBottomColor: colors.neutral[6] }]}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'featured' && [styles.tabButtonActive, { borderBottomColor: colors.orange[9] }],
          ]}
          onPress={() => setActiveTab('featured')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'featured' ? colors.orange[9] : colors.neutral[9] },
              activeTab === 'featured' && styles.tabTextActive,
            ]}
          >
            {t('tabs.home.featured')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'latest' && [styles.tabButtonActive, { borderBottomColor: colors.orange[9] }],
          ]}
          onPress={() => setActiveTab('latest')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'latest' ? colors.orange[9] : colors.neutral[9] },
              activeTab === 'latest' && styles.tabTextActive,
            ]}
          >
            {t('tabs.home.latest')}
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.orange[9]} />
        </View>
      ) : isError ? (
        <View style={styles.errorContainer}>
          <IconSymbol name="exclamationmark.triangle" size={48} color={colors.orange[9]} />
          <Text style={[styles.errorText, { color: colors.neutral[11] }]}>
            {error?.message || t('common.error')}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.orange[9] }]}
            onPress={() => refetch()}
          >
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredPosts}
          renderItem={renderItem}
          keyExtractor={(item) => `${activeTab}-${item.id}`}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.orange[9]}
              colors={[colors.orange[9]]}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
      
      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.orange[9] }]}
        onPress={() => router.push('/add-post')}
        activeOpacity={0.8}
      >
        <IconSymbol name="plus" size={24} color="#fff" />
      </TouchableOpacity>
      
      {/* Report Modal */}
      <ReportPostModal
        visible={reportModalVisible}
        post={selectedPost}
        author={selectedPostAuthor}
        reporter={userProfile as UserDocument | null}
        onClose={handleCloseReportModal}
      />
      
      {/* Warning Modal */}
      {pendingWarning && userProfile && (
        <WarningModal
          visible={warningModalVisible}
          message={pendingWarning.message}
          warningCount={userProfile.warningCount || 0}
          onClose={handleWarningClose}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    ...applyFont({
      fontSize: 24,
      fontWeight: '700',
    }),
  },
  headerIcon: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    ...applyFont({
      fontSize: 15,
    }),
    padding: 0,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    // Handled inline
  },
  tabText: {
    ...applyFont({
      fontSize: 15,
    }),
  },
  tabTextActive: {
    ...applyFont({
      fontWeight: '600',
    }),
  },
  listContent: {
    paddingBottom: 16,
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
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    ...applyFont({
      fontWeight: '600',
      fontSize: 16,
    }),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    ...applyFont({
      fontSize: 16,
    }),
    marginTop: 16,
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
