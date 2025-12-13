/**
 * Reports Query Hooks
 * 
 * TanStack Query hooks for reporting content.
 */

import {
  checkUserReportsForPosts,
  hasUserReportedPost,
  reportPost,
} from '@/screens/tabs/home/queries/reports';
import { ReportReason, UserDocument } from '@/types/firestore';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-client';

// ============================================================================
// REPORT QUERIES
// ============================================================================

/**
 * Hook to check if user has reported a post
 */
export function useHasReportedPost(postId: string, userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.reports.hasReported('post', postId, userId || ''),
    queryFn: () => hasUserReportedPost(postId, userId!),
    enabled: !!postId && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to batch check reports for multiple posts (for feed)
 */
export function useBatchReportCheck(postIds: string[], userId: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.reports.all, 'batch', userId || '', postIds.sort().join(',')],
    queryFn: () => checkUserReportsForPosts(postIds, userId!),
    enabled: postIds.length > 0 && !!userId,
    staleTime: 5 * 60 * 1000,
    // Return empty Set while loading
    placeholderData: new Set<string>(),
  });
}

// ============================================================================
// REPORT MUTATIONS
// ============================================================================

/**
 * Hook for reporting a post
 */
export function useReportPost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      postId,
      author,
      reporter,
      reason,
      description,
    }: {
      postId: string;
      author: UserDocument;
      reporter: UserDocument;
      reason: ReportReason;
      description?: string;
    }) => {
      return reportPost(postId, author, reporter, reason, description);
    },
    onSuccess: (_, { postId, reporter }) => {
      // Invalidate report check for this post
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.reports.hasReported('post', postId, reporter.id) 
      });
      
      // Invalidate post detail to update report count
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.posts.detail(postId) 
      });
    },
  });
}
