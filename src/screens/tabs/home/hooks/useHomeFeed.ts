/**
 * Home Feed Hook
 * 
 * Combines posts and ads into a unified feed with search filtering
 */

import { useFeedAds, usePinnedAd } from '@/hooks/queries/use-ads';
import { useFeaturedFeed, useLatestFeed } from '@/hooks/queries/use-posts';
import type { AdDocument, PostDocument } from '@/types/firestore';
import { useMemo } from 'react';
import type { HomeTab } from '../types';

interface FeedItem {
  type: 'post' | 'ad';
  data: PostDocument | AdDocument;
  index: number;
}

interface UseHomeFeedParams {
  activeTab: HomeTab;
  searchQuery: string;
  blockedUsers: string[];
}

interface UseHomeFeedReturn {
  feedItems: FeedItem[];
  postIds: string[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  refetch: () => void;
  isRefetching: boolean;
  pinnedAd: AdDocument | null;
}

export function useHomeFeed({
  activeTab,
  searchQuery,
  blockedUsers,
}: UseHomeFeedParams): UseHomeFeedReturn {
  // Get pinned ad (shown in header, not in feed items)
  const { data: pinnedAd } = usePinnedAd();
  
  // Get feed ads (to be inserted in feed)
  const { data: feedAds = [] } = useFeedAds();
  
  // Get posts based on active tab
  const featuredQuery = useFeaturedFeed(blockedUsers);
  const latestQuery = useLatestFeed(blockedUsers);
  
  const activeQuery = activeTab === 'featured' ? featuredQuery : latestQuery;
  
  // Extract all posts from pages
  const allPosts = useMemo(() => {
    if (!activeQuery.data?.pages) return [];
    return activeQuery.data.pages.flatMap((page: { posts: PostDocument[] }) => page.posts);
  }, [activeQuery.data?.pages]);
  
  // Filter posts by search query
  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return allPosts;
    
    const query = searchQuery.toLowerCase();
    return allPosts.filter((post: PostDocument) => {
      const content = post.content?.toLowerCase() || '';
      const authorUsername = post.authorUsername?.toLowerCase() || '';
      const authorDisplayName = post.authorDisplayName?.toLowerCase() || '';
      
      return (
        content.includes(query) ||
        authorUsername.includes(query) ||
        authorDisplayName.includes(query)
      );
    });
  }, [allPosts, searchQuery]);
  
  // Combine posts and feed ads into feedItems
  // Insert 1 ad after every 5 posts
  const feedItems = useMemo(() => {
    const items: FeedItem[] = [];
    let adIndex = 0;
    
    filteredPosts.forEach((post: PostDocument, index: number) => {
      // Add post
      items.push({
        type: 'post',
        data: post,
        index: items.length,
      });
      
      // Add feed ad after every 5 posts (positions 5, 10, 15, etc.)
      if ((index + 1) % 5 === 0 && feedAds.length > 0) {
        const ad = feedAds[adIndex % feedAds.length];
        items.push({
          type: 'ad',
          data: ad,
          index: items.length,
        });
        adIndex++;
      }
    });
    
    return items;
  }, [filteredPosts, feedAds]);
  
  // Extract post IDs for batch queries
  const postIds = useMemo(() => {
    return filteredPosts.map((post: PostDocument) => post.id);
  }, [filteredPosts]);
  
  return {
    feedItems,
    postIds,
    isLoading: activeQuery.isLoading,
    isError: activeQuery.isError,
    error: activeQuery.error as Error | null,
    fetchNextPage: activeQuery.fetchNextPage,
    hasNextPage: activeQuery.hasNextPage ?? false,
    isFetchingNextPage: activeQuery.isFetchingNextPage,
    refetch: activeQuery.refetch,
    isRefetching: activeQuery.isRefetching,
    pinnedAd: pinnedAd ?? null,
  };
}

