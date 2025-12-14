/**
 * Profile Screen
 * 
 * Shows user profile info and their posts with tabs for:
 * - My Posts (user's own posts)
 * - Liked (posts the user has liked)
 * - Commented (posts the user has commented on)
 * - Saved (posts the user has saved/bookmarked)
 */

import { Tweet, TweetData } from '@/components/tweet';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUserCommentedPostIds, useUserCommentsCount } from '@/hooks/queries/use-comments';
import { useBatchLikeCheck, useToggleLike, useUserLikedPosts } from '@/hooks/queries/use-likes';
import { useDeletePost, usePostsByIds, useUserPosts } from '@/hooks/queries/use-posts';
import { useBatchReportCheck } from '@/hooks/queries/use-reports';
import { useBatchSaveCheck, useToggleSave, useUserSavedPosts } from '@/hooks/queries/use-saves';
import { useUser } from '@/hooks/queries/use-user';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { ReportPostModal } from '@/screens/modal/report-post';
import { PostDocument, UserDocument } from '@/types/firestore';
import { applyFont } from '@/utils/apply-fonts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ProfileTab = 'posts' | 'liked' | 'commented' | 'saved';

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
  
  if (diffSeconds < 60) return `${diffSeconds}${t('time.seconds')}`;
  if (diffMinutes < 60) return `${diffMinutes}${t('time.minutes')}`;
  if (diffHours < 24) return `${diffHours}${t('time.hours')}`;
  if (diffDays < 7) return `${diffDays}${t('time.days')}`;
  
  return postDate.toLocaleDateString();
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

const USER_ID_KEY = 'userId';

export function ProfileScreen() {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostDocument | null>(null);
  const [selectedPostAuthor, setSelectedPostAuthor] = useState<UserDocument | null>(null);

  // Get userId from AsyncStorage or auth context
  useEffect(() => {
    const loadUserId = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem(USER_ID_KEY);
        console.log('ProfileScreen: Loaded userId from AsyncStorage:', storedUserId);
        if (storedUserId) {
          setUserId(storedUserId);
        } else if (user?.uid) {
          console.log('ProfileScreen: Using userId from auth context:', user.uid);
          setUserId(user.uid);
        }
      } catch (error) {
        console.error('Error loading userId from AsyncStorage:', error);
        if (user?.uid) {
          setUserId(user.uid);
        }
      }
    };

    loadUserId();
  }, [user?.uid]);

  // Fetch user profile
  const { data: userProfile } = useUser(userId || undefined);

  // Fetch user's posts
  const {
    data: postsData,
    isLoading: isLoadingPosts,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchPosts,
    isRefetching: isRefetchingPosts,
  } = useUserPosts(userId || '');

  // Fetch liked post IDs
  const { 
    data: likedPostIds, 
    isLoading: isLoadingLikedIds,
    refetch: refetchLikedIds,
    isRefetching: isRefetchingLikedIds,
  } = useUserLikedPosts(userId || '');

  // Fetch commented post IDs
  const { 
    data: commentedPostIds, 
    isLoading: isLoadingCommentedIds,
    refetch: refetchCommentedIds,
    isRefetching: isRefetchingCommentedIds,
  } = useUserCommentedPostIds(userId || '');

  // Fetch user's comments count
  const { data: commentsCount } = useUserCommentsCount(userId || undefined);

  // Fetch saved posts
  const { 
    data: savedPosts, 
    isLoading: isLoadingSaved,
    refetch: refetchSaved,
    isRefetching: isRefetchingSaved,
  } = useUserSavedPosts(userId || '');

  // Fetch actual posts for liked IDs
  const { 
    data: likedPosts, 
    isLoading: isLoadingLikedPosts 
  } = usePostsByIds(likedPostIds || []);

  // Fetch actual posts for commented IDs
  const { 
    data: commentedPosts, 
    isLoading: isLoadingCommentedPosts 
  } = usePostsByIds(commentedPostIds || []);

  // Fetch actual posts for saved IDs
  const savedPostIdsArray = useMemo(() => 
    savedPosts?.map((s: any) => s.postId) || [], 
    [savedPosts]
  );
  const { 
    data: savedPostsFull, 
    isLoading: isLoadingSavedPosts 
  } = usePostsByIds(savedPostIdsArray);

  // Flatten pages into single array of posts
  const posts = useMemo((): PostDocument[] => {
    return postsData?.pages.flatMap((page: { posts: PostDocument[] }) => page.posts) ?? [];
  }, [postsData]);

  // Get current tab's data
  const getCurrentTabData = useCallback((): PostDocument[] => {
    switch (activeTab) {
      case 'posts':
        return posts;
      case 'liked':
        return likedPosts || [];
      case 'commented':
        return commentedPosts || [];
      case 'saved':
        return savedPostsFull || [];
      default:
        return [];
    }
  }, [activeTab, posts, likedPosts, commentedPosts, savedPostsFull]);

  // Get current tab's data
  const currentTabData = useMemo(() => getCurrentTabData(), [getCurrentTabData]);
  
  // Get post IDs for batch checks
  const postIds = useMemo(() => currentTabData.map((p: PostDocument) => p.id), [currentTabData]);
  
  // Batch check which posts user has liked
  const { data: likedPostIdsSet } = useBatchLikeCheck(postIds, user?.uid);
  
  // Batch check which posts user has saved
  const { data: savedPostIdsSet } = useBatchSaveCheck(postIds, user?.uid);
  
  // Batch check which posts user has reported
  const { data: reportedPostIdsSet } = useBatchReportCheck(postIds, user?.uid);
  
  // Fetch current logged-in user's profile for mutations
  const { data: currentUserProfile } = useUser(user?.uid);
  
  // Toggle like mutation
  const toggleLikeMutation = useToggleLike();
  
  // Toggle save mutation
  const toggleSaveMutation = useToggleSave();
  
  // Delete post mutation
  const deletePostMutation = useDeletePost();

  // Check if current tab is loading
  const isCurrentTabLoading = useCallback((): boolean => {
    switch (activeTab) {
      case 'posts':
        return isLoadingPosts;
      case 'liked':
        return isLoadingLikedIds || isLoadingLikedPosts;
      case 'commented':
        return isLoadingCommentedIds || isLoadingCommentedPosts;
      case 'saved':
        return isLoadingSaved || isLoadingSavedPosts;
      default:
        return false;
    }
  }, [activeTab, isLoadingPosts, isLoadingLikedIds, isLoadingLikedPosts, 
      isLoadingCommentedIds, isLoadingCommentedPosts, isLoadingSaved, isLoadingSavedPosts]);

  // Check if current tab is refreshing
  const isCurrentTabRefreshing = useCallback((): boolean => {
    switch (activeTab) {
      case 'posts':
        return isRefetchingPosts;
      case 'liked':
        return isRefetchingLikedIds;
      case 'commented':
        return isRefetchingCommentedIds;
      case 'saved':
        return isRefetchingSaved;
      default:
        return false;
    }
  }, [activeTab, isRefetchingPosts, isRefetchingLikedIds, isRefetchingCommentedIds, isRefetchingSaved]);

  // Handle refresh for current tab
  const handleRefresh = useCallback(() => {
    switch (activeTab) {
      case 'posts':
        refetchPosts();
        break;
      case 'liked':
        refetchLikedIds();
        break;
      case 'commented':
        refetchCommentedIds();
        break;
      case 'saved':
        refetchSaved();
        break;
    }
  }, [activeTab, refetchPosts, refetchLikedIds, refetchCommentedIds, refetchSaved]);

  // Load more posts when reaching end (only for 'posts' tab)
  const handleLoadMore = useCallback(() => {
    if (activeTab === 'posts' && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [activeTab, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Handle post press
  const handlePostPress = useCallback(
    (postId: string) => {
      router.push(`/post/${postId}`);
    },
    [router]
  );

  // Handle like action
  const handleLike = useCallback(
    (postId: string) => {
      if (!currentUserProfile) return;
      
      toggleLikeMutation.mutate({
        postId,
        user: currentUserProfile as UserDocument,
      });
    },
    [currentUserProfile, toggleLikeMutation]
  );

  // Handle save action
  const handleSave = useCallback(
    (post: PostDocument) => {
      if (!currentUserProfile) return;
      
      toggleSaveMutation.mutate({
        post,
        user: currentUserProfile as UserDocument,
      });
    },
    [currentUserProfile, toggleSaveMutation]
  );

  // Handle delete action
  const handleDelete = useCallback(async (post: PostDocument) => {
    if (!currentUserProfile || !user?.uid || post.authorId !== user.uid) return;
    
    try {
      await deletePostMutation.mutateAsync({
        postId: post.id,
        authorId: user.uid,
      });
    } catch (error: any) {
      console.error('Error deleting post:', error);
      Alert.alert(t('common.error'), error?.message || t('postOptions.deleteError'));
    }
  }, [currentUserProfile, user?.uid, deletePostMutation, t]);

  // Handle report action
  const handleReport = useCallback((post: PostDocument) => {
    if (!currentUserProfile) return;
    
    const author: UserDocument = {
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
    
    setSelectedPost(post);
    setSelectedPostAuthor(author);
    setReportModalVisible(true);
  }, [currentUserProfile]);

  // Close report modal
  const handleCloseReportModal = useCallback(() => {
    setReportModalVisible(false);
    setSelectedPost(null);
    setSelectedPostAuthor(null);
  }, []);

  // Render each post item
  const renderItem = useCallback(
    ({ item }: { item: PostDocument }) => {
      const isLiked = likedPostIdsSet?.has(item.id) ?? false;
      const isSaved = savedPostIdsSet?.has(item.id) ?? false;
      const isReported = reportedPostIdsSet?.has(item.id) ?? false;
      const isOwnPost = !!(user?.uid && item.authorId === user.uid);
      
      const tweet = postToTweet(item, isLiked, isSaved, isReported, t);
      return (
        <Tweet
          tweet={tweet}
          onPress={() => handlePostPress(item.id)}
          onLike={() => handleLike(item.id)}
          onReply={() => handlePostPress(item.id)}
          onSave={() => handleSave(item)}
          onReport={() => handleReport(item)}
          onDelete={() => handleDelete(item)}
          isOwnPost={isOwnPost}
        />
      );
    },
    [handlePostPress, handleLike, handleSave, handleReport, handleDelete, user?.uid, likedPostIdsSet, savedPostIdsSet, reportedPostIdsSet, t]
  );

  // Render footer (loading indicator for pagination)
  const renderFooter = useCallback(() => {
    if (activeTab !== 'posts' || !isFetchingNextPage) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.orange[9]} />
      </View>
    );
  }, [activeTab, isFetchingNextPage, colors.orange]);

  // Get empty message for current tab
  const getEmptyMessage = useCallback((): string => {
    switch (activeTab) {
      case 'posts':
        return t('tabs.profile.noPosts');
      case 'liked':
        return t('tabs.profile.noLikedPosts');
      case 'commented':
        return t('tabs.profile.noCommentedPosts');
      case 'saved':
        return t('tabs.profile.noSavedPosts');
      default:
        return t('tabs.profile.noPosts');
    }
  }, [activeTab, t]);

  // Render loading state (inside scroll view)
  const renderLoading = useCallback(() => {
    if (!isCurrentTabLoading()) return null;
    
    return (
      <View style={styles.loadingInScroll}>
        <ActivityIndicator size="large" color={colors.orange[9]} />
      </View>
    );
  }, [isCurrentTabLoading, colors.orange]);

  // Render empty state
  const renderEmpty = useCallback(() => {
    if (isCurrentTabLoading()) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <IconSymbol name="doc.text" size={48} color={colors.neutral[8]} />
        <Text style={[styles.emptyText, { color: colors.neutral[9] }]}>
          {getEmptyMessage()}
        </Text>
      </View>
    );
  }, [isCurrentTabLoading, colors, getEmptyMessage]);

  // Render tab button
  const renderTabButton = useCallback((tab: ProfileTab, label: string, icon: string) => {
    const isActive = activeTab === tab;
    return (
      <TouchableOpacity
        style={[
          styles.tabButton,
          isActive && { borderBottomColor: colors.orange[9], borderBottomWidth: 2 },
        ]}
        onPress={() => setActiveTab(tab)}
      >
        <IconSymbol 
          name={icon as any} 
          size={18} 
          color={isActive ? colors.orange[9] : colors.neutral[9]} 
        />
        <Text
          style={[
            styles.tabLabel,
            { color: isActive ? colors.orange[9] : colors.neutral[9] },
            isActive && styles.tabLabelActive,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  }, [activeTab, colors]);

  // Render profile header
  const renderHeader = useCallback(() => {
    return (
      <View style={styles.profileSection}>
        <View style={styles.profileDetails}>
          <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.neutral[12] }]}>
                @{userProfile?.username || 'user'}
              </Text>
            <View style={styles.statsInline}>
              <TouchableOpacity style={styles.statItemInline}>
                <Text style={[styles.statNumberInline, { color: colors.neutral[12] }]}>
                  {userProfile?.postsCount || 0}
                </Text>
                <Text style={[styles.statLabelInline, { color: colors.neutral[9] }]}>
                  {t('tabs.profile.tweets')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statItemInline}>
                <Text style={[styles.statNumberInline, { color: colors.neutral[12] }]}>
                  {commentsCount || 0}
                </Text>
                <Text style={[styles.statLabelInline, { color: colors.neutral[9] }]}>
                  {t('tabs.profile.comments')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          {userProfile?.bio && (
            <Text style={[styles.bio, { color: colors.neutral[12] }]}>
              {userProfile.bio}
            </Text>
          )}
        </View>
        
        {/* Tab Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.tabBarContainer, { borderBottomColor: colors.neutral[6] }]}
          contentContainerStyle={styles.tabBarContent}
        >
          {renderTabButton('posts', t('tabs.profile.myPosts'), 'doc.text')}
          {renderTabButton('liked', t('tabs.profile.liked'), 'heart')}
          {renderTabButton('commented', t('tabs.profile.commented'), 'message')}
          {renderTabButton('saved', t('tabs.profile.saved'), 'bookmark')}
        </ScrollView>
      </View>
    );
  }, [userProfile, colors, t, renderTabButton]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.neutral[6],
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.neutral[12] }]}>
          {t('tabs.profile.title')}
        </Text>
        <TouchableOpacity onPress={() => router.push('/settings')}>
          <IconSymbol name="gearshape.fill" size={24} color={colors.neutral[12]} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={currentTabData}
        renderItem={renderItem}
        keyExtractor={(item) => `${activeTab}-${item.id}`}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={isCurrentTabLoading() ? renderLoading : renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isCurrentTabRefreshing()}
            onRefresh={handleRefresh}
            tintColor={colors.orange[9]}
            colors={[colors.orange[9]]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
      
      {/* Report Modal */}
      <ReportPostModal
        visible={reportModalVisible}
        post={selectedPost}
        author={selectedPostAuthor}
        reporter={currentUserProfile as UserDocument | null}
        onClose={handleCloseReportModal}
      />
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    ...applyFont({
      fontSize: 20,
      fontWeight: '700',
    }),
  },
  profileSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  profileDetails: {
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  name: {
    ...applyFont({
      fontSize: 22,
      fontWeight: '700',
    }),
  },
  statsInline: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  statItemInline: {
    alignItems: 'center',
  },
  statNumberInline: {
    ...applyFont({
      fontSize: 14,
      fontWeight: '700',
    }),
  },
  statLabelInline: {
    ...applyFont({
      fontSize: 11,
    }),
    marginTop: 2,
  },
  username: {
    ...applyFont({
      fontSize: 16,
    }),
  },
  bio: {
    ...applyFont({
      fontSize: 15,
    }),
    lineHeight: 20,
  },
  stats: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    gap: 4,
  },
  statNumber: {
    ...applyFont({
      fontSize: 15,
      fontWeight: '700',
    }),
  },
  statLabel: {
    ...applyFont({
      fontSize: 15,
    }),
  },
  tabBarContainer: {
    borderBottomWidth: 1,
    marginHorizontal: -16,
  },
  tabBarContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
    minWidth: 100,
  },
  tabLabel: {
    ...applyFont({
      fontSize: 13,
    }),
  },
  tabLabelActive: {
    ...applyFont({
      fontWeight: '600',
    }),
  },
  loadingInScroll: {
    paddingVertical: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: 64,
    alignItems: 'center',
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
});
