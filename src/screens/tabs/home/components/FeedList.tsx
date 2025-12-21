import { AdCard } from '@/components/ad-card';
import { Tweet } from '@/components/tweet';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { AdDocument, PostDocument } from '@/types/firestore';
import type { ReactElement } from 'react';
import React, { useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import type { HomeTab } from '../types';
import { postToTweet } from '../utils/postToTweet';

interface FeedItem {
  type: 'post' | 'ad';
  data: PostDocument | AdDocument;
  index: number;
}

interface FeedListProps {
  feedItems: FeedItem[];
  activeTab: HomeTab;
  likedPostIds?: Set<string>;
  savedPostIds?: Set<string>;
  reportedPostIds?: Set<string>;
  userId?: string;
  onPostPress: (postId: string) => void;
  onLike: (postId: string) => void;
  onReply: (postId: string) => void;
  onSave: (post: PostDocument) => void;
  onReport: (post: PostDocument) => void;
  onDelete: (post: PostDocument) => void;
  onBlock: (post: PostDocument) => void;
  onLoadMore: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onRefresh: () => void;
  isRefetching: boolean;
  renderHeader?: () => ReactElement | null;
  renderFooter?: () => ReactElement | null;
  renderEmpty?: () => ReactElement | null;
  t: (key: string) => string;
}

export function FeedList({
  feedItems,
  activeTab,
  likedPostIds,
  savedPostIds,
  reportedPostIds,
  userId,
  onPostPress,
  onLike,
  onReply,
  onSave,
  onReport,
  onDelete,
  onBlock,
  onLoadMore,
  hasNextPage,
  isFetchingNextPage,
  onRefresh,
  isRefetching,
  renderHeader,
  renderFooter,
  renderEmpty,
  t,
}: FeedListProps) {
  const colors = useThemeColors();

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => {
      if (item.type === 'ad') {
        // Render ad
        return <AdCard ad={item.data as AdDocument} userId={userId} />;
      }
      
      // Render post
      const post = item.data as PostDocument;
      const isLiked = likedPostIds?.has(post.id) ?? false;
      const isSaved = savedPostIds?.has(post.id) ?? false;
      const isReported = reportedPostIds?.has(post.id) ?? false;
      const isOwnPost = !!(userId && post.authorId === userId);
      
      const tweet = postToTweet(post, isLiked, isSaved, isReported, t);
      
      return (
        <Tweet
          tweet={tweet}
          onPress={() => onPostPress(post.id)}
          onLike={() => onLike(post.id)}
          onReply={() => onReply(post.id)}
          onSave={() => onSave(post)}
          onReport={() => onReport(post)}
          onDelete={() => onDelete(post)}
          onBlock={() => onBlock(post)}
          isOwnPost={isOwnPost}
        />
      );
    },
    [likedPostIds, savedPostIds, reportedPostIds, userId, onPostPress, onLike, onReply, onSave, onReport, onDelete, onBlock, t]
  );

  return (
    <FlatList
      data={feedItems}
      renderItem={renderItem}
      keyExtractor={(item: FeedItem, index: number) => 
        item.type === 'ad' 
          ? `ad-${item.data.id}-${index}` 
          : `${activeTab}-${item.data.id}`
      }
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={renderHeader}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={onRefresh}
          tintColor={colors.orange[9]}
          colors={[colors.orange[9]]}
        />
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 16,
  },
});

