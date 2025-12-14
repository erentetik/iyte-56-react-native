/**
 * Notifications Service
 * 
 * Handle push notifications and FCM token management.
 */

import { db } from '@/config/firebase';
import { COLLECTIONS, NotificationDocument } from '@/types/firestore';
import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, Timestamp, updateDoc, where } from 'firebase/firestore';
import { Platform } from 'react-native';

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
 * Get FCM token using Firebase Messaging
 * Returns the FCM token on both Android and iOS
 * 
 * IMPORTANT: For proper FCM token support on iOS, you need to:
 * 1. Install @react-native-firebase/messaging: npm install @react-native-firebase/messaging
 * 2. Run: npx expo prebuild --clean
 * 3. Configure Firebase in your app
 * 
 * Without @react-native-firebase/messaging, iOS will get APNs token instead of FCM token,
 * which will cause "invalid FCM registration token" errors in Cloud Functions.
 */
export async function getFCMToken(): Promise<string | null> {
  try {
    // Request notification permissions first
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.warn('Notification permission not granted');
      return null;
    }

    // Try to use @react-native-firebase/messaging if available
    // This is the proper way to get FCM tokens on native platforms
    let firebaseMessaging: any = null;
    try {
      // Try to import @react-native-firebase/messaging
      // Use require to avoid build errors if package is not installed
      const rnfbMessaging = require('@react-native-firebase/messaging');
      firebaseMessaging = rnfbMessaging.default || rnfbMessaging;
    } catch (error) {
      // Package not installed, will use fallback
      console.log('@react-native-firebase/messaging not installed, using expo-notifications fallback');
    }

    // If @react-native-firebase/messaging is available, use it
    if (firebaseMessaging && typeof firebaseMessaging === 'function') {
      try {
        const messagingInstance = firebaseMessaging();
        if (messagingInstance && messagingInstance.getToken) {
          const token = await messagingInstance.getToken();
          if (token) {
            console.log('Got FCM token from @react-native-firebase/messaging');
            return token;
          }
        }
      } catch (error) {
        console.error('Error getting FCM token from @react-native-firebase/messaging:', error);
        // Fall through to expo-notifications fallback
      }
    }

    // Fallback: Use expo-notifications
    // WARNING: On iOS, this returns APNs token, not FCM token!
    // This will cause "invalid FCM registration token" errors
    const NotificationsModule = await getNotificationsModule();
    if (!NotificationsModule) {
      console.error('expo-notifications not available');
      return null;
    }

    // Get device push token
    const tokenData = await NotificationsModule.getDevicePushTokenAsync();
    const deviceToken = tokenData.data as string;

    if (!deviceToken) {
      console.error('No device token received');
      return null;
    }

    // On Android, the device token from expo-notifications IS the FCM token
    if (Platform.OS === 'android') {
      console.log('Got FCM token from expo-notifications (Android)');
      return deviceToken;
    }

    // On iOS, expo-notifications returns APNs token, not FCM token
    // This is the root cause of the error!
    console.error(
      'ERROR: On iOS, expo-notifications returns APNs token, not FCM token. ' +
      'This token will NOT work with Firebase Cloud Functions. ' +
      'Please install @react-native-firebase/messaging for proper FCM token support.'
    );
    
    // Don't return APNs token - it will cause errors
    // Return null so the app doesn't save an invalid token
    return null;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

/**
 * Get FCM token (legacy function name for compatibility)
 * @deprecated Use getFCMToken() instead
 */
export async function getExpoPushToken(): Promise<string | null> {
  return getFCMToken();
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
