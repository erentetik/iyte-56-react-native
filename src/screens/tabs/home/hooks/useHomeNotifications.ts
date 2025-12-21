import { queryKeys } from '@/hooks/queries/query-client';
import { configureNotificationHandler, hasNotificationPermissionBeenAsked, registerFCMToken } from '@/services/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

export function useHomeNotifications(userId: string | undefined, userProfile: any) {
  const queryClient = useQueryClient();

  // Configure Firebase Messaging notification handlers on mount
  useEffect(() => {
    configureNotificationHandler();
  }, []);

  // Request notification permissions and register FCM token
  useEffect(() => {
    const requestNotificationPermission = async () => {
      if (!userId || !userProfile) {
        return;
      }
      
      try {
        // Check if we've already asked for permission
        const hasAsked = await hasNotificationPermissionBeenAsked(userId);
        
        if (!hasAsked) {
          // Register FCM token (this will request permission if not granted)
          await registerFCMToken(userId);
          
          // Invalidate user query to refetch updated profile
          queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
        } else if (!userProfile.fcmToken) {
          // If permission was asked but token is missing, try to register again
          await registerFCMToken(userId);
          queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    };
    
    requestNotificationPermission();
  }, [userId, userProfile, queryClient]);
}

