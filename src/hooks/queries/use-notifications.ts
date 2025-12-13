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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-client';

// ============================================================================
// NOTIFICATION QUERIES
// ============================================================================

/**
 * Hook to get user notifications
 */
export function useNotifications(userId: string | undefined) {
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
 * Hook to mark notification as read
 */
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      return markNotificationAsRead(notificationId);
    },
    onSuccess: () => {
      // Invalidate notifications query
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

/**
 * Hook to mark all notifications as read
 */
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      return markAllNotificationsAsRead(userId);
    },
    onSuccess: () => {
      // Invalidate notifications query
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
