/**
 * Notifications Service
 * 
 * Handle push notifications and FCM token management.
 */

import { db } from '@/config/firebase';
import { COLLECTIONS, NotificationDocument } from '@/types/firestore';
import Constants from 'expo-constants';
import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, Timestamp, updateDoc, where } from 'firebase/firestore';

// Lazy load expo-notifications to avoid errors when native module isn't available
let Notifications: typeof import('expo-notifications') | null = null;

async function getNotificationsModule() {
  if (Notifications) {
    return Notifications;
  }
  
  try {
    Notifications = await import('expo-notifications');
    
    // Configure notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    
    return Notifications;
  } catch (error) {
    console.warn('expo-notifications native module not available:', error);
    return null;
  }
}

// ============================================================================
// NOTIFICATION PERMISSIONS
// ============================================================================

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const NotificationsModule = await getNotificationsModule();
  if (!NotificationsModule) {
    return false;
  }
  
  try {
    const { status: existingStatus } = await NotificationsModule.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await NotificationsModule.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Get FCM token (Expo push token)
 */
export async function getExpoPushToken(): Promise<string | null> {
  const NotificationsModule = await getNotificationsModule();
  if (!NotificationsModule) {
    return null;
  }
  
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return null;
    }
    
    // Get Expo project ID from Constants (EAS project ID)
    // If not available, Expo will use the default project
    const expoProjectId = Constants.expoConfig?.extra?.eas?.projectId;
    
    const options: { projectId?: string } = {};
    if (expoProjectId) {
      options.projectId = expoProjectId;
    }
    
    const tokenData = await NotificationsModule.getExpoPushTokenAsync(options);
    
    return tokenData.data;
  } catch (error) {
    console.error('Error getting Expo push token:', error);
    return null;
  }
}

/**
 * Save FCM token to user document
 */
export async function saveFCMToken(userId: string, token: string): Promise<void> {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  await updateDoc(userRef, {
    fcmToken: token,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Remove FCM token from user document
 */
export async function removeFCMToken(userId: string): Promise<void> {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  await updateDoc(userRef, {
    fcmToken: null,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Mark that we've asked for notification permission
 */
export async function markNotificationPermissionAsked(userId: string): Promise<void> {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  await updateDoc(userRef, {
    notificationPermissionAsked: true,
    updatedAt: serverTimestamp(),
  });
}

// ============================================================================
// NOTIFICATION QUERIES
// ============================================================================

/**
 * Get user notifications
 */
export async function getUserNotifications(
  userId: string,
  limitCount: number = 50
): Promise<NotificationDocument[]> {
  const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS);
  
  const q = query(
    notificationsRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
  );
  
  const snapshot = await getDocs(q);
  const notifications = snapshot.docs
    .slice(0, limitCount)
    .map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as NotificationDocument[];
  
  return notifications;
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const notificationRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId);
  await updateDoc(notificationRef, {
    isRead: true,
  });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS);
  const q = query(
    notificationsRef,
    where('userId', '==', userId),
    where('isRead', '==', false)
  );
  
  const snapshot = await getDocs(q);
  const batch = snapshot.docs.map(doc => 
    updateDoc(doc.ref, { isRead: true })
  );
  
  await Promise.all(batch);
}

// ============================================================================
// NOTIFICATION CREATION
// ============================================================================

/**
 * Create a notification document
 * This creates the notification in Firestore.
 * 
 * NOTE: To send actual push notifications, you need a Cloud Function that:
 * 1. Listens to this collection (onCreate trigger)
 * 2. Fetches the recipient's fcmToken from their user document
 * 3. Sends push notification via FCM API
 * 
 * See: functions/src/index.ts for Cloud Function example
 */
export async function createNotification(
  notification: Omit<NotificationDocument, 'id' | 'createdAt' | 'isRead'>
): Promise<string> {
  const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS);
  
  const notificationData: Omit<NotificationDocument, 'id'> = {
    ...notification,
    isRead: false,
    createdAt: serverTimestamp() as Timestamp,
  };
  
  const docRef = await addDoc(notificationsRef, notificationData);
  return docRef.id;
}

// ============================================================================
// PUSH NOTIFICATION HELPERS (For Cloud Functions)
// ============================================================================

/**
 * Get user's FCM token from their user document
 * This is used by Cloud Functions to send push notifications
 */
export async function getUserFCMToken(userId: string): Promise<string | null> {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    return null;
  }
  
  const userData = userSnap.data();
  return userData?.fcmToken || null;
}

/**
 * Generate notification message text based on notification type
 * This is used by Cloud Functions to format push notification messages
 */
export function getNotificationMessage(notification: NotificationDocument): string {
  const actorName = notification.actorDisplayName || notification.actorUsername;
  
  switch (notification.type) {
    case 'like':
      return `${actorName} liked your post`;
    case 'comment':
      return `${actorName} commented on your post`;
    case 'reply':
      return `${actorName} replied to your comment`;
    case 'follow':
      return `${actorName} started following you`;
    default:
      return 'You have a new notification';
  }
}
