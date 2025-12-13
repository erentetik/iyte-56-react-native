/**
 * Comments Query Hooks
 * 
 * TanStack Query hooks for comments with optimistic updates.
 */

import {
    createComment,
    CreateCommentInput,
    deleteComment,
    getAllPostComments,
    getCommentById,
    getCommentReplies,
    getPostComments,
    getUserCommentedPostIds,
    updateComment,
} from '@/screens/tabs/home/queries/comments';
import { CommentDocument, UserDocument } from '@/types/firestore';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-client';

// ============================================================================
// COMMENT QUERIES
// ============================================================================

/**
 * Hook for top-level comments on a post with infinite scrolling
 */
export function usePostComments(postId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.comments.byPost(postId),
    queryFn: async ({ pageParam }) => {
      return getPostComments(postId, pageParam);
    },
    initialPageParam: undefined as any,
    getNextPageParam: (lastPage) => lastPage.lastDoc ?? undefined,
    enabled: !!postId,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook for replies to a specific comment
 */
export function useCommentReplies(postId: string, commentId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.comments.replies(postId, commentId),
    queryFn: async ({ pageParam }) => {
      return getCommentReplies(postId, commentId, pageParam);
    },
    initialPageParam: undefined as any,
    getNextPageParam: (lastPage) => lastPage.lastDoc ?? undefined,
    enabled: !!postId && !!commentId,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook for all comments (flat list)
 */
export function useAllPostComments(postId: string) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.comments.byPost(postId), 'all'],
    queryFn: async ({ pageParam }) => {
      return getAllPostComments(postId, pageParam);
    },
    initialPageParam: undefined as any,
    getNextPageParam: (lastPage) => lastPage.lastDoc ?? undefined,
    enabled: !!postId,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook for single comment detail
 */
export function useComment(commentId: string) {
  return useQuery({
    queryKey: queryKeys.comments.detail(commentId),
    queryFn: () => getCommentById(commentId),
    enabled: !!commentId,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to get post IDs that a user has commented on
 */
export function useUserCommentedPostIds(userId: string) {
  return useQuery({
    queryKey: [...queryKeys.comments.all, 'userCommented', userId],
    queryFn: () => getUserCommentedPostIds(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// ============================================================================
// COMMENT MUTATIONS
// ============================================================================

/**
 * Hook for creating a comment with optimistic updates
 */
export function useCreateComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      postId,
      author,
      input,
    }: {
      postId: string;
      author: UserDocument;
      input: CreateCommentInput;
    }) => {
      return createComment(postId, author, input);
    },
    onSuccess: (_, { postId }) => {
      // Invalidate comments for this post
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.byPost(postId) });
      
      // Update post's comment count
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(postId) });
    },
  });
}

/**
 * Hook for deleting a comment
 */
export function useDeleteComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      commentId,
      postId,
      parentCommentId,
    }: {
      commentId: string;
      postId: string;
      parentCommentId?: string;
    }) => {
      return deleteComment(commentId, postId, parentCommentId);
    },
    onMutate: async ({ commentId, postId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.comments.byPost(postId) });
      
      const previousComment = queryClient.getQueryData<CommentDocument>(
        queryKeys.comments.detail(commentId)
      );
      
      // Optimistically mark as deleted
      queryClient.setQueryData(queryKeys.comments.detail(commentId), null);
      
      return { previousComment };
    },
    onError: (err, { commentId }, context) => {
      if (context?.previousComment) {
        queryClient.setQueryData(
          queryKeys.comments.detail(commentId),
          context.previousComment
        );
      }
    },
    onSettled: (_, __, { postId, parentCommentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.byPost(postId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(postId) });
      
      if (parentCommentId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.comments.detail(parentCommentId) 
        });
      }
    },
  });
}

/**
 * Hook for updating a comment
 */
export function useUpdateComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      return updateComment(commentId, content);
    },
    onMutate: async ({ commentId, content }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.comments.detail(commentId) });
      
      const previousComment = queryClient.getQueryData<CommentDocument>(
        queryKeys.comments.detail(commentId)
      );
      
      if (previousComment) {
        queryClient.setQueryData(queryKeys.comments.detail(commentId), {
          ...previousComment,
          content,
        });
      }
      
      return { previousComment };
    },
    onError: (err, { commentId }, context) => {
      if (context?.previousComment) {
        queryClient.setQueryData(
          queryKeys.comments.detail(commentId),
          context.previousComment
        );
      }
    },
    onSettled: (_, __, { commentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.detail(commentId) });
    },
  });
}
