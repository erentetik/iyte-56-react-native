/**
 * Ad Query Hooks
 * 
 * TanStack Query hooks for ads with caching
 */

import { getFeedAds, getPinnedAd } from '@/services/ads';
import { AdDocument } from '@/types/firestore';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-client';

/**
 * Hook to fetch the current pinned ad
 */
export function usePinnedAd() {
  return useQuery({
    queryKey: queryKeys.ads.pinned(),
    queryFn: () => getPinnedAd(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

/**
 * Hook to fetch all active feed ads (sorted by priority)
 */
export function useFeedAds() {
  return useQuery<AdDocument[]>({
    queryKey: queryKeys.ads.feed(),
    queryFn: () => getFeedAds(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: true,
  });
}

