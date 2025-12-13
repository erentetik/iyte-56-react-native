/**
 * Follows Query Hooks
 * 
 * TanStack Query hooks for follow relationships.
 */

import {
    followUser,
    getFollowers,
    getFollowing,
    getFollowingIds,
    isFollowing,
    toggleFollow,
    unfollowUser,
} from '@/services/follows';
import { UserDocument } from '@/types/firestore';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-client';

// ============================================================================
// FOLLOW QUERIES
// ============================================================================

/**
 * Hook to check if user A follows user B
 */
export function useIsFollowing(followerId: string | undefined, followingId: string) {
  return useQuery({
    queryKey: queryKeys.follows.isFollowing(followerId || '', followingId),
    queryFn: () => isFollowing(followerId!, followingId),
    enabled: !!followerId && !!followingId && followerId !== followingId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to get users that a user is following
 */
export function useFollowing(userId: string, limit?: number) {
  return useQuery({
    queryKey: queryKeys.follows.following(userId),
    queryFn: () => getFollowing(userId, limit),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to get IDs of users that a user is following
 * Useful for feed filtering
 */
export function useFollowingIds(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.follows.followingIds(userId || ''),
    queryFn: () => getFollowingIds(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes - changes less frequently
  });
}

/**
 * Hook to get followers of a user
 */
export function useFollowers(userId: string, limit?: number) {
  return useQuery({
    queryKey: queryKeys.follows.followers(userId),
    queryFn: () => getFollowers(userId, limit),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

// ============================================================================
// FOLLOW MUTATIONS
// ============================================================================

/**
 * Hook for following a user
 */
export function useFollowUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      follower,
      following,
    }: {
      follower: UserDocument;
      following: UserDocument;
    }) => {
      return followUser(follower, following);
    },
    onMutate: async ({ follower, following }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.follows.isFollowing(follower.id, following.id),
      });
      
      const previousIsFollowing = queryClient.getQueryData<boolean>(
        queryKeys.follows.isFollowing(follower.id, following.id)
      );
      
      // Optimistically update
      queryClient.setQueryData(
        queryKeys.follows.isFollowing(follower.id, following.id),
        true
      );
      
      return { previousIsFollowing };
    },
    onError: (err, { follower, following }, context) => {
      if (context?.previousIsFollowing !== undefined) {
        queryClient.setQueryData(
          queryKeys.follows.isFollowing(follower.id, following.id),
          context.previousIsFollowing
        );
      }
    },
    onSettled: (_, __, { follower, following }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.follows.isFollowing(follower.id, following.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.follows.following(follower.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.follows.followingIds(follower.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.follows.followers(following.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.detail(follower.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.detail(following.id),
      });
    },
  });
}

/**
 * Hook for unfollowing a user
 */
export function useUnfollowUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      followerId,
      followingId,
    }: {
      followerId: string;
      followingId: string;
    }) => {
      return unfollowUser(followerId, followingId);
    },
    onMutate: async ({ followerId, followingId }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.follows.isFollowing(followerId, followingId),
      });
      
      const previousIsFollowing = queryClient.getQueryData<boolean>(
        queryKeys.follows.isFollowing(followerId, followingId)
      );
      
      queryClient.setQueryData(
        queryKeys.follows.isFollowing(followerId, followingId),
        false
      );
      
      return { previousIsFollowing };
    },
    onError: (err, { followerId, followingId }, context) => {
      if (context?.previousIsFollowing !== undefined) {
        queryClient.setQueryData(
          queryKeys.follows.isFollowing(followerId, followingId),
          context.previousIsFollowing
        );
      }
    },
    onSettled: (_, __, { followerId, followingId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.follows.isFollowing(followerId, followingId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.follows.following(followerId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.follows.followingIds(followerId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.follows.followers(followingId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.detail(followerId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.detail(followingId),
      });
    },
  });
}

/**
 * Hook for toggling follow status
 */
export function useToggleFollow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      follower,
      following,
    }: {
      follower: UserDocument;
      following: UserDocument;
    }) => {
      return toggleFollow(follower, following);
    },
    onMutate: async ({ follower, following }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.follows.isFollowing(follower.id, following.id),
      });
      
      const previousIsFollowing = queryClient.getQueryData<boolean>(
        queryKeys.follows.isFollowing(follower.id, following.id)
      );
      
      // Optimistically toggle
      queryClient.setQueryData(
        queryKeys.follows.isFollowing(follower.id, following.id),
        !previousIsFollowing
      );
      
      return { previousIsFollowing };
    },
    onError: (err, { follower, following }, context) => {
      if (context?.previousIsFollowing !== undefined) {
        queryClient.setQueryData(
          queryKeys.follows.isFollowing(follower.id, following.id),
          context.previousIsFollowing
        );
      }
    },
    onSettled: (_, __, { follower, following }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.follows.isFollowing(follower.id, following.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.follows.following(follower.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.follows.followingIds(follower.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.follows.followers(following.id),
      });
    },
  });
}
