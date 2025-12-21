import { AdCard } from '@/components/ad-card';
import { WarningModal } from '@/components/warning-modal';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWarning } from '@/contexts/WarningContext';
import { useBatchLikeCheck } from '@/hooks/queries/use-likes';
import { useBatchReportCheck } from '@/hooks/queries/use-reports';
import { useBatchSaveCheck } from '@/hooks/queries/use-saves';
import { useUser } from '@/hooks/queries/use-user';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { ReportPostModal } from '@/screens/modal/report-post';
import type { PostDocument, UserDocument } from '@/types/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from './components/EmptyState';
import { ErrorState } from './components/ErrorState';
import { FeedList } from './components/FeedList';
import { FloatingActionButton } from './components/FloatingActionButton';
import { Header } from './components/Header';
import { LoadingState } from './components/LoadingState';
import { SearchBar } from './components/SearchBar';
import { TabBar } from './components/TabBar';
import { useHomeActions } from './hooks/useHomeActions';
import { useHomeFeed } from './hooks/useHomeFeed';
import { useHomeNotifications } from './hooks/useHomeNotifications';
import { useHomeWarnings } from './hooks/useHomeWarnings';
import type { HomeTab } from './types';

export function HomeScreen() {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { pendingWarning, clearPendingWarning, setPendingWarning } = useWarning();
  
  // Persist active tab state
  const [activeTab, setActiveTab] = useState<HomeTab>('featured');
  const [isTabLoaded, setIsTabLoaded] = useState(false);
  
  // Load saved tab from AsyncStorage on mount
  useEffect(() => {
    const loadSavedTab = async () => {
      try {
        const savedTab = await AsyncStorage.getItem('home_active_tab');
        if (savedTab && (savedTab === 'featured' || savedTab === 'latest')) {
          setActiveTab(savedTab as HomeTab);
        }
      } catch (error) {
        console.error('Error loading saved tab:', error);
      } finally {
        setIsTabLoaded(true);
      }
    };
    
    loadSavedTab();
  }, []);
  
  // Save tab to AsyncStorage whenever it changes
  useEffect(() => {
    if (isTabLoaded) {
      AsyncStorage.setItem('home_active_tab', activeTab).catch((error: unknown) => {
        console.error('Error saving tab:', error);
      });
    }
  }, [activeTab, isTabLoaded]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostDocument | null>(null);
  const [selectedPostAuthor, setSelectedPostAuthor] = useState<UserDocument | null>(null);
  
  // Fetch current user's profile
  const { data: userProfile } = useUser(user?.uid);
  
  // Get blocked users list
  const blockedUsers = userProfile?.blockedUsers || [];
  
  // Use custom hooks
  useHomeNotifications(user?.uid, userProfile);
  const {
    warningModalVisible,
    setWarningModalVisible,
    warningJustClosed,
    setWarningJustClosed,
  } = useHomeWarnings(user?.uid, userProfile);
  
  // Get feed data
  const {
    feedItems,
    postIds,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
    pinnedAd,
  } = useHomeFeed({
    activeTab,
    searchQuery,
    blockedUsers,
  });
  
  // Batch check which posts user has liked/saved/reported
  const { data: likedPostIds } = useBatchLikeCheck(postIds, user?.uid);
  const { data: savedPostIds } = useBatchSaveCheck(postIds, user?.uid);
  const { data: reportedPostIds } = useBatchReportCheck(postIds, user?.uid);
  
  // Get action handlers
  const {
    handlePostPress,
    handleLike,
    handleReply,
    handleSave,
    handleDelete,
    handleReport,
    handleBlock,
    handleWarningClose,
  } = useHomeActions({
    userProfile,
    userId: user?.uid,
    t,
    queryClient,
    setSelectedPost,
    setSelectedPostAuthor,
    setReportModalVisible,
    setWarningJustClosed,
    clearPendingWarning,
    setWarningModalVisible,
    pendingWarning,
  });
  
  // Handle search toggle
  const handleSearchToggle = useCallback(() => {
    setShowSearch(!showSearch);
    if (showSearch) {
      setSearchQuery('');
    }
  }, [showSearch]);
  
  // Load more posts when reaching end
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  
  // Close report modal
  const handleCloseReportModal = useCallback(() => {
    setReportModalVisible(false);
    setSelectedPost(null);
    setSelectedPostAuthor(null);
  }, []);
  
  // Render header with pinned ad
  const renderHeader = useCallback(() => {
    if (!pinnedAd) return null;
    return <AdCard ad={pinnedAd} userId={user?.uid} />;
  }, [pinnedAd, user?.uid]);
  
  // Render footer (loading indicator for pagination)
  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <LoadingState />
      </View>
    );
  }, [isFetchingNextPage]);
  
  // Render empty state
  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    const message = searchQuery ? t('tabs.home.noPostsFound') : t('tabs.home.empty');
    return <EmptyState message={message} />;
  }, [isLoading, searchQuery, t]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <Header showSearch={showSearch} onSearchToggle={handleSearchToggle} />
      
      {showSearch && (
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClear={() => setSearchQuery('')}
          placeholder={t('search.placeholder')}
        />
      )}
      
      <TabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        featuredLabel={t('tabs.home.featured')}
        latestLabel={t('tabs.home.latest')}
      />

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState
          error={error}
          onRetry={() => refetch()}
          errorMessage={t('common.error')}
          retryLabel={t('common.retry')}
        />
      ) : (
        <FeedList
          feedItems={feedItems}
          activeTab={activeTab}
          likedPostIds={likedPostIds}
          savedPostIds={savedPostIds}
          reportedPostIds={reportedPostIds}
          userId={user?.uid}
          onPostPress={handlePostPress}
          onLike={handleLike}
          onReply={handleReply}
          onSave={handleSave}
          onReport={handleReport}
          onDelete={handleDelete}
          onBlock={handleBlock}
          onLoadMore={handleLoadMore}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onRefresh={refetch}
          isRefetching={isRefetching}
          renderHeader={renderHeader}
          renderFooter={renderFooter}
          renderEmpty={renderEmpty}
          t={t}
        />
      )}
      
      <FloatingActionButton onPress={() => router.push('/add-post')} />
      
      {reportModalVisible && (
        <ReportPostModal
          visible={reportModalVisible}
          post={selectedPost}
          author={selectedPostAuthor}
          reporter={userProfile ?? null}
          onClose={handleCloseReportModal}
        />
      )}
      
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
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
