/**
 * Likes Query Hooks
 * 
 * TanStack Query hooks for likes with optimistic updates.
 */

import {
    checkUserLikesForComments,
    checkUserLikesForPosts,
    getPostLikes,
    getUserLikedPosts,
    hasUserLikedComment,
    hasUserLikedPost,
    toggleCommentLike,
    toggleLike,
} from '@/screens/tabs/home/queries/likes';
import { CommentDocument, PostDocument, UserDocument } from '@/types/firestore';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-client';

// ============================================================================
// LIKE QUERIES
// ============================================================================

/**
 * Hook to check if user has liked a specific post
 */
export function useHasLikedPost(postId: string, userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.likes.checkLike(postId, userId || ''),
    queryFn: () => hasUserLikedPost(postId, userId!),
    enabled: !!postId && !!userId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to get users who liked a post
 */
export function usePostLikes(postId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.likes.byPost(postId),
    queryFn: () => getPostLikes(postId),
    enabled: enabled && !!postId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to get posts liked by a user
 */
export function useUserLikedPosts(userId: string) {
  return useQuery({
    queryKey: queryKeys.likes.userLiked(userId),
    queryFn: () => getUserLikedPosts(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to batch check likes for multiple posts (for feed)
 */
export function useBatchLikeCheck(postIds: string[], userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.likes.batchCheck(userId || '', postIds),
    queryFn: () => checkUserLikesForPosts(postIds, userId!),
    enabled: postIds.length > 0 && !!userId,
    staleTime: 60 * 1000,
    // Return empty Set while loading
    placeholderData: new Set<string>(),
  });
}

// ============================================================================
// LIKE MUTATIONS
// ============================================================================

/**
 * Hook for toggling like on a post with optimistic updates
 */
export function useToggleLike() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ postId, user }: { postId: string; user: UserDocument }) => {
      return toggleLike(postId, user);
    },
    onMutate: async ({ postId, user }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.likes.checkLike(postId, user.id) 
      });
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.posts.detail(postId) 
      });
      
      // Snapshot previous values
      const previousLikeStatus = queryClient.getQueryData<boolean>(
        queryKeys.likes.checkLike(postId, user.id)
      );
      const previousPost = queryClient.getQueryData<PostDocument>(
        queryKeys.posts.detail(postId)
      );
      
      // Get all batch check queries to snapshot them
      const batchQueries = queryClient.getQueriesData({
        queryKey: queryKeys.likes.all,
        predicate: (query) => {
          const key = query.queryKey as readonly unknown[];
          return Array.isArray(key) && key.includes('batch') && key.includes(user.id);
        },
      });
      const previousBatchQueries: [readonly unknown[], unknown][] = batchQueries.map(([key, data]) => [key, data]);
      
      // Get feed queries to snapshot them
      const feedQueries = queryClient.getQueriesData({
        queryKey: queryKeys.posts.all,
        predicate: (query) => {
          const key = query.queryKey as readonly unknown[];
          return Array.isArray(key) && (key.includes('public') || key.includes('featured') || key.includes('latest') || key.includes('following'));
        },
      });
      const previousFeedQueries: [readonly unknown[], unknown][] = feedQueries.map(([key, data]) => [key, data]);
      
      // Optimistically update like status
      const newLikeStatus = !previousLikeStatus;
      queryClient.setQueryData(
        queryKeys.likes.checkLike(postId, user.id),
        newLikeStatus
      );
      
      // Optimistically update batch check queries for this user
      queryClient.setQueriesData(
        {
          queryKey: queryKeys.likes.all,
          predicate: (query) => {
            const key = query.queryKey as readonly unknown[];
            return Array.isArray(key) && key.includes('batch') && key.includes(user.id);
          },
        },
        (old: Set<string> | undefined) => {
          if (!old) return old;
          const newSet = new Set(old);
          if (newLikeStatus) {
            newSet.add(postId);
          } else {
            newSet.delete(postId);
          }
          return newSet;
        }
      );
      
      // Optimistically update post like count in detail query
      if (previousPost) {
        queryClient.setQueryData(queryKeys.posts.detail(postId), {
          ...previousPost,
          likesCount: previousPost.likesCount + (newLikeStatus ? 1 : -1),
        });
      }
      
      // Helper function to update post in query data
      const updatePostInQueryData = (old: any): any => {
        if (!old) return old;
        
        // Handle infinite query structure (feeds)
        if (old.pages && Array.isArray(old.pages)) {
          let hasChanges = false;
          const updatedPages = old.pages.map((page: any) => {
            if (!page.posts || !Array.isArray(page.posts)) return page;
            
            const postIndex = page.posts.findIndex((p: PostDocument) => p.id === postId);
            if (postIndex === -1) return page;
            
            hasChanges = true;
            const updatedPosts = [...page.posts];
            const currentPost = updatedPosts[postIndex];
            updatedPosts[postIndex] = {
              ...currentPost,
              likesCount: Math.max(0, currentPost.likesCount + (newLikeStatus ? 1 : -1)),
            };
            
            return {
              ...page,
              posts: updatedPosts,
            };
          });
          
          if (!hasChanges) return old;
          
          return {
            ...old,
            pages: updatedPages,
          };
        }
        
        // Handle array of posts (user posts, etc.)
        if (Array.isArray(old)) {
          const postIndex = old.findIndex((p: PostDocument) => p.id === postId);
          if (postIndex === -1) return old;
          
          const updatedPosts = [...old];
          const currentPost = updatedPosts[postIndex];
          updatedPosts[postIndex] = {
            ...currentPost,
            likesCount: Math.max(0, currentPost.likesCount + (newLikeStatus ? 1 : -1)),
          };
          
          return updatedPosts;
        }
        
        // Handle single post
        if (old.id === postId) {
          return {
            ...old,
            likesCount: Math.max(0, old.likesCount + (newLikeStatus ? 1 : -1)),
          };
        }
        
        return old;
      };
      
      // Optimistically update post like count in ALL post queries (feeds, user posts, etc.)
      queryClient.setQueriesData(
        {
          queryKey: queryKeys.posts.all,
        },
        updatePostInQueryData
      );
      
      return { previousLikeStatus, previousPost, previousBatchQueries, previousFeedQueries };
    },
    onError: (err, { postId, user }, context) => {
      // Rollback on error
      if (context?.previousLikeStatus !== undefined) {
        queryClient.setQueryData(
          queryKeys.likes.checkLike(postId, user.id),
          context.previousLikeStatus
        );
      }
      if (context?.previousPost) {
        queryClient.setQueryData(queryKeys.posts.detail(postId), context.previousPost);
      }
      // Rollback batch queries
      if (context?.previousBatchQueries) {
        context.previousBatchQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
      // Rollback feed queries
      if (context?.previousFeedQueries) {
        context.previousFeedQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSettled: (_, __, { postId, user }) => {
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.likes.checkLike(postId, user.id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.posts.detail(postId) 
      });
      // Invalidate batch checks that might include this post
      queryClient.invalidateQueries({
        queryKey: queryKeys.likes.all,
        predicate: (query) => {
          const key = query.queryKey as readonly unknown[];
          return Array.isArray(key) && key.includes('batch') && key.includes(user.id);
        },
      });
    },
  });
}

// ============================================================================
// COMMENT LIKES
// ============================================================================

/**
 * Hook to check if user has liked a specific comment
 */
export function useHasLikedComment(commentId: string, userId: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.likes.all, 'comment', commentId, userId || ''],
    queryFn: () => hasUserLikedComment(commentId, userId!),
    enabled: !!commentId && !!userId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to batch check likes for multiple comments
 */
export function useBatchCommentLikeCheck(commentIds: string[], userId: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.likes.all, 'comment', 'batch', userId || '', commentIds.sort().join(',')],
    queryFn: () => checkUserLikesForComments(commentIds, userId!),
    enabled: commentIds.length > 0 && !!userId,
    staleTime: 60 * 1000,
    placeholderData: new Set<string>(),
  });
}

/**
 * Hook for toggling like on a comment with optimistic updates
 */
export function useToggleCommentLike() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ commentId, user }: { commentId: string; user: UserDocument }) => {
      return toggleCommentLike(commentId, user);
    },
    onMutate: async ({ commentId, user }) => {
      await queryClient.cancelQueries({ 
        queryKey: [...queryKeys.likes.all, 'comment', commentId, user.id] 
      });
      
      const previousLikeStatus = queryClient.getQueryData<boolean>(
        [...queryKeys.likes.all, 'comment', commentId, user.id]
      );
      
      const newLikeStatus = !previousLikeStatus;
      queryClient.setQueryData(
        [...queryKeys.likes.all, 'comment', commentId, user.id],
        newLikeStatus
      );
      
      // Update comment like count in all comment queries
      queryClient.setQueriesData(
        { queryKey: queryKeys.comments.all },
        (old: any) => {
          if (!old) return old;
          
          const updateCommentInData = (data: any): any => {
            if (!data) return data;
            
            // Handle infinite query structure
            if (data.pages && Array.isArray(data.pages)) {
              const updatedPages = data.pages.map((page: any) => {
                if (!page.comments || !Array.isArray(page.comments)) return page;
                
                const commentIndex = page.comments.findIndex((c: CommentDocument) => c.id === commentId);
                if (commentIndex === -1) return page;
                
                const updatedComments = [...page.comments];
                const currentComment = updatedComments[commentIndex];
                updatedComments[commentIndex] = {
                  ...currentComment,
                  likesCount: Math.max(0, currentComment.likesCount + (newLikeStatus ? 1 : -1)),
                };
                
                return {
                  ...page,
                  comments: updatedComments,
                };
              });
              
              return {
                ...data,
                pages: updatedPages,
              };
            }
            
            // Handle array of comments
            if (Array.isArray(data)) {
              const commentIndex = data.findIndex((c: CommentDocument) => c.id === commentId);
              if (commentIndex === -1) return data;
              
              const updatedComments = [...data];
              const currentComment = updatedComments[commentIndex];
              updatedComments[commentIndex] = {
                ...currentComment,
                likesCount: Math.max(0, currentComment.likesCount + (newLikeStatus ? 1 : -1)),
              };
              
              return updatedComments;
            }
            
            // Handle single comment
            if (data.id === commentId) {
              return {
                ...data,
                likesCount: Math.max(0, data.likesCount + (newLikeStatus ? 1 : -1)),
              };
            }
            
            return data;
          };
          
          return updateCommentInData(old);
        }
      );
      
      return { previousLikeStatus };
    },
    onError: (err, { commentId, user }, context) => {
      if (context?.previousLikeStatus !== undefined) {
        queryClient.setQueryData(
          [...queryKeys.likes.all, 'comment', commentId, user.id],
          context.previousLikeStatus
        );
      }
    },
    onSettled: (_, __, { commentId, user }) => {
      queryClient.invalidateQueries({ 
        queryKey: [...queryKeys.likes.all, 'comment', commentId, user.id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.comments.all 
      });
    },
  });
}
