/**
 * Notifications Query Hooks
 * 
 * TanStack Query hooks for notifications.
 */

import {
    getUserNotifications,
    markAllNotificationsAsRead,
    markNotificationAsRead,
} from '@/services/notifications';
import { NotificationDocument } from '@/types/firestore';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-client';

// ============================================================================
// NOTIFICATION QUERIES
// ============================================================================

/**
 * Hook to get user notifications
 */
export function useUserNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.notifications.userNotifications(userId || ''),
    queryFn: () => getUserNotifications(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ============================================================================
// NOTIFICATION MUTATIONS
// ============================================================================

/**
 * Hook for marking a notification as read
 */
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ notificationId, userId }: { notificationId: string; userId: string }) => {
      await markNotificationAsRead(notificationId);
    },
    onMutate: async ({ notificationId, userId }) => {
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.notifications.userNotifications(userId) 
      });
      
      // Optimistically update notification
      queryClient.setQueriesData(
        { queryKey: queryKeys.notifications.userNotifications(userId) },
        (old: NotificationDocument[] | undefined) => {
          if (!old) return old;
          return old.map(notif => 
            notif.id === notificationId 
              ? { ...notif, isRead: true }
              : notif
          );
        }
      );
    },
    onSettled: (_, __, { userId }) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.notifications.userNotifications(userId) 
      });
    },
  });
}

/**
 * Hook for marking all notifications as read
 */
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      await markAllNotificationsAsRead(userId);
    },
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.notifications.userNotifications(userId) 
      });
      
      // Optimistically mark all as read
      queryClient.setQueriesData(
        { queryKey: queryKeys.notifications.userNotifications(userId) },
        (old: NotificationDocument[] | undefined) => {
          if (!old) return old;
          return old.map(notif => ({ ...notif, isRead: true }));
        }
      );
    },
    onSettled: (_, __, userId) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.notifications.userNotifications(userId) 
      });
    },
  });
}

