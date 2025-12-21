/**
 * Posts Query Hooks
 * 
 * TanStack Query hooks for posts with caching and optimistic updates.
 */

import {
    createPost,
    CreatePostInput,
    deletePost,
    getFeaturedFeed,
    getFollowingFeed,
    getLatestFeed,
    getPostById,
    getPostsByIds,
    getPublicFeed,
    getUserPosts,
    updatePost,
} from '@/screens/tabs/home/queries/posts';
import { PostDocument, UserDocument } from '@/types/firestore';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-client';

// ============================================================================
// FEED QUERIES
// ============================================================================

/**
 * Hook for public feed with infinite scrolling
 */
export function usePublicFeed(blockedUsers: string[] = []) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.posts.publicFeed(), blockedUsers.sort().join(',')],
    queryFn: async ({ pageParam }) => {
      return getPublicFeed(pageParam, blockedUsers);
    },
    initialPageParam: undefined as any,
    getNextPageParam: (lastPage) => lastPage.lastDoc ?? undefined,
    staleTime: 60 * 1000, // 1 minute for feed
  });
}

/**
 * Hook for featured feed with infinite scrolling (sorted by popularity/likes)
 */
export function useFeaturedFeed(blockedUsers: string[] = []) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.posts.featuredFeed(), blockedUsers.sort().join(',')],
    queryFn: async ({ pageParam }) => {
      return getFeaturedFeed(pageParam, blockedUsers);
    },
    initialPageParam: undefined as any,
    getNextPageParam: (lastPage) => lastPage.lastDoc ?? undefined,
    staleTime: 60 * 1000, // 1 minute for feed
  });
}

/**
 * Hook for latest feed with infinite scrolling (sorted by createdAt)
 */
export function useLatestFeed(blockedUsers: string[] = []) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.posts.latestFeed(), blockedUsers.sort().join(',')],
    queryFn: async ({ pageParam }) => {
      return getLatestFeed(pageParam, blockedUsers);
    },
    initialPageParam: undefined as any,
    getNextPageParam: (lastPage) => lastPage.lastDoc ?? undefined,
    staleTime: 60 * 1000, // 1 minute for feed
  });
}

/**
 * Hook for following feed with infinite scrolling
 */
export function useFollowingFeed(userId: string, followingIds: string[], blockedUsers: string[] = []) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.posts.followingFeed(userId), blockedUsers.sort().join(',')],
    queryFn: async ({ pageParam }) => {
      return getFollowingFeed(userId, followingIds, pageParam, blockedUsers);
    },
    initialPageParam: undefined as any,
    getNextPageParam: (lastPage) => lastPage.lastDoc ?? undefined,
    enabled: followingIds.length > 0,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook for user's posts with infinite scrolling
 */
export function useUserPosts(userId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.posts.userPosts(userId),
    queryFn: async ({ pageParam }) => {
      return getUserPosts(userId, pageParam);
    },
    initialPageParam: undefined as any,
    getNextPageParam: (lastPage) => lastPage.lastDoc ?? undefined,
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes for profile posts
  });
}

/**
 * Hook for single post detail
 */
export function usePost(postId: string) {
  return useQuery({
    queryKey: queryKeys.posts.detail(postId),
    queryFn: () => getPostById(postId),
    enabled: !!postId,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to get multiple posts by their IDs
 */
export function usePostsByIds(postIds: string[]) {
  return useQuery({
    queryKey: [...queryKeys.posts.all, 'byIds', postIds.sort().join(',')],
    queryFn: () => getPostsByIds(postIds),
    enabled: postIds.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// ============================================================================
// POST MUTATIONS
// ============================================================================

/**
 * Hook for creating a new post
 */
export function useCreatePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ author, input }: { author: UserDocument; input: CreatePostInput }) => {
      return createPost(author, input);
    },
    onSuccess: () => {
      // Invalidate feed queries to show new post
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
    },
  });
}

/**
 * Hook for deleting a post
 */
export function useDeletePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ postId, authorId }: { postId: string; authorId: string }) => {
      return deletePost(postId, authorId);
    },
    onMutate: async ({ postId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.all });
      
      // Snapshot previous value
      const previousPost = queryClient.getQueryData(queryKeys.posts.detail(postId));
      
      // Optimistically remove from cache
      queryClient.setQueryData(queryKeys.posts.detail(postId), null);
      
      return { previousPost };
    },
    onError: (err, { postId }, context) => {
      // Rollback on error
      if (context?.previousPost) {
        queryClient.setQueryData(queryKeys.posts.detail(postId), context.previousPost);
      }
    },
    onSettled: (_, __, { authorId }) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
      
      // Invalidate user profile to update postsCount
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(authorId) });
      
      // Invalidate user posts list to remove deleted post
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.userPosts(authorId) });
    },
  });
}

/**
 * Hook for updating a post
 */
export function useUpdatePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      return updatePost(postId, content);
    },
    onMutate: async ({ postId, content }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.detail(postId) });
      
      const previousPost = queryClient.getQueryData<PostDocument>(queryKeys.posts.detail(postId));
      
      // Optimistically update
      if (previousPost) {
        queryClient.setQueryData(queryKeys.posts.detail(postId), {
          ...previousPost,
          content,
        });
      }
      
      return { previousPost };
    },
    onError: (err, { postId }, context) => {
      if (context?.previousPost) {
        queryClient.setQueryData(queryKeys.posts.detail(postId), context.previousPost);
      }
    },
    onSettled: (_, __, { postId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(postId) });
    },
  });
}
