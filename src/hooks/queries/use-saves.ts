/**
 * Saves Query Hooks
 * 
 * TanStack Query hooks for saved posts with optimistic updates.
 */

import {
  checkUserSavesForPosts,
  getUserSavedPosts,
  hasUserSavedPost,
  toggleSave,
} from '@/screens/tabs/home/queries/saves';
import { PostDocument, PostSaveDocument, UserDocument } from '@/types/firestore';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Timestamp } from 'firebase/firestore';
import { queryKeys } from './query-client';

// ============================================================================
// SAVE QUERIES
// ============================================================================

/**
 * Hook to check if user has saved a specific post
 */
export function useHasSavedPost(postId: string, userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.saves.checkSave(postId, userId || ''),
    queryFn: () => hasUserSavedPost(postId, userId!),
    enabled: !!postId && !!userId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to get posts saved by a user
 */
export function useUserSavedPosts(userId: string) {
  return useQuery({
    queryKey: queryKeys.saves.userSaved(userId),
    queryFn: () => getUserSavedPosts(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to batch check saves for multiple posts (for feed)
 */
export function useBatchSaveCheck(postIds: string[], userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.saves.batchCheck(userId || '', postIds),
    queryFn: () => checkUserSavesForPosts(postIds, userId!),
    enabled: postIds.length > 0 && !!userId,
    staleTime: 60 * 1000,
    // Return empty Set while loading
    placeholderData: new Set<string>(),
  });
}

// ============================================================================
// SAVE MUTATIONS
// ============================================================================

/**
 * Hook for toggling save on a post with optimistic updates
 */
export function useToggleSave() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ post, user }: { post: PostDocument; user: UserDocument }) => {
      try {
        const result = await toggleSave(post, user);
        return result;
      } catch (error) {
        console.error('Error toggling save:', error);
        throw error;
      }
    },
    onMutate: async ({ post, user }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.saves.checkSave(post.id, user.id) 
      });
      
      // Snapshot previous values
      const previousSaveStatus = queryClient.getQueryData<boolean>(
        queryKeys.saves.checkSave(post.id, user.id)
      );
      
      // Get all batch check queries to snapshot them
      const batchQueries = queryClient.getQueriesData({
        queryKey: queryKeys.saves.all,
        predicate: (query) => {
          const key = query.queryKey as string[];
          return key.includes('batch') && key.includes(user.id);
        },
      });
      const previousBatchQueries: Array<[unknown, unknown]> = batchQueries.map(([key, data]) => [key, data]);
      
      // Snapshot saved posts list
      const previousSavedPosts = queryClient.getQueryData<PostSaveDocument[]>(
        queryKeys.saves.userSaved(user.id)
      );
      
      // Optimistically update save status
      // If previous status is undefined, check batch queries to determine current state
      let currentSaveStatus = previousSaveStatus;
      if (currentSaveStatus === undefined) {
        // Try to get from batch queries
        for (const [_, data] of batchQueries) {
          if (data instanceof Set && data.has(post.id)) {
            currentSaveStatus = true;
            break;
          }
        }
        // Default to false if still undefined
        if (currentSaveStatus === undefined) {
          currentSaveStatus = false;
        }
      }
      
      const newSaveStatus = !currentSaveStatus;
      
      queryClient.setQueryData(
        queryKeys.saves.checkSave(post.id, user.id),
        newSaveStatus
      );
      
      // Optimistically update batch check queries for this user
      queryClient.setQueriesData(
        {
          queryKey: queryKeys.saves.all,
          predicate: (query) => {
            const key = query.queryKey as string[];
            return key.includes('batch') && key.includes(user.id);
          },
        },
        (old: Set<string> | undefined) => {
          if (!old) return old;
          const newSet = new Set(old);
          if (newSaveStatus) {
            newSet.add(post.id);
          } else {
            newSet.delete(post.id);
          }
          return newSet;
        }
      );
      
      // Optimistically update saved posts list
      if (previousSavedPosts) {
        if (newSaveStatus) {
          // Add to saved posts list
          const newSaveDoc: PostSaveDocument = {
            id: `${post.id}_${user.id}`,
            postId: post.id,
            userId: user.id,
            postContent: (post.content || '').substring(0, 100),
            postAuthorUsername: post.authorUsername || '',
            postAuthorDisplayName: post.authorDisplayName || '',
            postIsAnonymous: post.isAnonymous === true,
            ...(post.mediaUrls && post.mediaUrls.length > 0 && post.mediaUrls[0] 
              ? { postMediaUrl: post.mediaUrls[0] } 
              : {}),
            createdAt: Timestamp.now(),
          };
          queryClient.setQueryData<PostSaveDocument[]>(
            queryKeys.saves.userSaved(user.id),
            [newSaveDoc, ...previousSavedPosts]
          );
        } else {
          // Remove from saved posts list
          queryClient.setQueryData<PostSaveDocument[]>(
            queryKeys.saves.userSaved(user.id),
            previousSavedPosts.filter((s) => s.postId !== post.id)
          );
        }
      }
      
      return { previousSaveStatus: currentSaveStatus, previousBatchQueries, previousSavedPosts };
    },
    onError: (err, { post, user }, context) => {
      // Rollback on error
      if (context?.previousSaveStatus !== undefined) {
        queryClient.setQueryData(
          queryKeys.saves.checkSave(post.id, user.id),
          context.previousSaveStatus
        );
      }
      // Rollback batch queries
      if (context?.previousBatchQueries) {
        for (const [key, data] of context.previousBatchQueries) {
          queryClient.setQueryData(key as any, data);
        }
      }
      // Rollback saved posts list
      if (context?.previousSavedPosts) {
        queryClient.setQueryData(
          queryKeys.saves.userSaved(user.id),
          context.previousSavedPosts
        );
      }
    },
    onSettled: (_, __, { post, user }) => {
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.saves.checkSave(post.id, user.id) 
      });
      // Invalidate user's saved posts list
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.saves.userSaved(user.id) 
      });
      // Invalidate batch checks that might include this post
      queryClient.invalidateQueries({
        queryKey: queryKeys.saves.all,
        predicate: (query) => {
          const key = query.queryKey as string[];
          return key.includes('batch') && key.includes(user.id);
        },
      });
      // Invalidate postsByIds queries that might be using saved post IDs
      // This ensures the profile saved tab refreshes when posts are saved/unsaved
      queryClient.invalidateQueries({
        queryKey: queryKeys.posts.all,
        predicate: (query) => {
          const key = query.queryKey as string[];
          return key.includes('byIds');
        },
      });
    },
  });
}
