/**
 * TanStack Query Client Configuration
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 30 seconds
      staleTime: 30 * 1000,
      // Cache data for 5 minutes
      gcTime: 5 * 60 * 1000,
      // Retry failed requests 2 times
      retry: 2,
      // Refetch on window focus for real-time feel
      refetchOnWindowFocus: true,
      // Don't refetch on mount if data is fresh
      refetchOnMount: true,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
    },
  },
});

// Query Keys - centralized for consistency
export const queryKeys = {
  // Posts
  posts: {
    all: ['posts'] as const,
    publicFeed: () => [...queryKeys.posts.all, 'public'] as const,
    featuredFeed: () => [...queryKeys.posts.all, 'featured'] as const,
    latestFeed: () => [...queryKeys.posts.all, 'latest'] as const,
    followingFeed: (userId: string) => [...queryKeys.posts.all, 'following', userId] as const,
    userPosts: (userId: string) => [...queryKeys.posts.all, 'user', userId] as const,
    detail: (postId: string) => [...queryKeys.posts.all, 'detail', postId] as const,
  },
  
  // Comments
  comments: {
    all: ['comments'] as const,
    byPost: (postId: string) => [...queryKeys.comments.all, 'post', postId] as const,
    replies: (postId: string, commentId: string) => 
      [...queryKeys.comments.all, 'replies', postId, commentId] as const,
    detail: (commentId: string) => [...queryKeys.comments.all, 'detail', commentId] as const,
  },
  
  // Likes
  likes: {
    all: ['likes'] as const,
    byPost: (postId: string) => [...queryKeys.likes.all, 'post', postId] as const,
    userLiked: (userId: string) => [...queryKeys.likes.all, 'user', userId] as const,
    checkLike: (postId: string, userId: string) => 
      [...queryKeys.likes.all, 'check', postId, userId] as const,
    batchCheck: (userId: string, postIds: string[]) =>
      [...queryKeys.likes.all, 'batch', userId, postIds.sort().join(',')] as const,
  },
  
  // Users
  users: {
    all: ['users'] as const,
    detail: (userId: string) => [...queryKeys.users.all, 'detail', userId] as const,
    byUsername: (username: string) => [...queryKeys.users.all, 'username', username] as const,
    search: (term: string) => [...queryKeys.users.all, 'search', term] as const,
  },
  
  // Follows
  follows: {
    all: ['follows'] as const,
    followers: (userId: string) => [...queryKeys.follows.all, 'followers', userId] as const,
    following: (userId: string) => [...queryKeys.follows.all, 'following', userId] as const,
    followingIds: (userId: string) => [...queryKeys.follows.all, 'followingIds', userId] as const,
    isFollowing: (followerId: string, followingId: string) => 
      [...queryKeys.follows.all, 'check', followerId, followingId] as const,
  },
  
  // Saves
  saves: {
    all: ['saves'] as const,
    userSaved: (userId: string) => [...queryKeys.saves.all, 'user', userId] as const,
    checkSave: (postId: string, userId: string) => 
      [...queryKeys.saves.all, 'check', postId, userId] as const,
    batchCheck: (userId: string, postIds: string[]) =>
      [...queryKeys.saves.all, 'batch', userId, postIds.sort().join(',')] as const,
  },
  
  // Reports
  reports: {
    all: ['reports'] as const,
    pending: () => [...queryKeys.reports.all, 'pending'] as const,
    byUser: (userId: string) => [...queryKeys.reports.all, 'user', userId] as const,
    hasReported: (contentType: string, contentId: string, reporterId: string) =>
      [...queryKeys.reports.all, 'check', contentType, contentId, reporterId] as const,
  },
  
  // Notifications
  notifications: {
    all: ['notifications'] as const,
    userNotifications: (userId: string) => [...queryKeys.notifications.all, 'user', userId] as const,
  },
};
