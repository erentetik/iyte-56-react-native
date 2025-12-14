/**
 * Notifications Service
 * 
 * Handle notification queries and creation in Firestore.
 * Also handles push notification permissions and FCM token registration.
 */

import { db } from '@/config/firebase';
import { COLLECTIONS, NotificationDocument } from '@/types/firestore';
import firebaseApp from '@react-native-firebase/app';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, Timestamp, updateDoc, where } from 'firebase/firestore';
import { Platform } from 'react-native';

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
// PUSH NOTIFICATION PERMISSIONS & TOKEN REGISTRATION
// ============================================================================

/**
 * Configure Firebase Messaging notification handlers
 * Call this once at app startup to handle foreground notifications
 * This function is safe to call even if Firebase isn't initialized yet
 */
export function configureNotificationHandler() {
  try {
    verifyFirebaseApp();
    
    // Handle foreground notifications (when app is open)
    messaging().onMessage(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
      console.log('[FCM] Foreground notification received:', {
        notification: remoteMessage.notification,
        data: remoteMessage.data,
        messageId: remoteMessage.messageId,
      });
      
      // You can display a local notification here if needed
      // For now, we just log it - the notification will be handled by the system
      // when the app is in background
    });
    
    // Handle notification taps (when user taps notification)
    messaging().onNotificationOpenedApp((remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
      console.log('[FCM] Notification opened app:', {
        notification: remoteMessage.notification,
        data: remoteMessage.data,
        messageId: remoteMessage.messageId,
      });
      
      // Navigate to relevant screen based on notification data
      // This will be handled by your navigation logic
    });
    
    // Check if app was opened from a notification (cold start)
    messaging()
      .getInitialNotification()
      .then((remoteMessage: FirebaseMessagingTypes.RemoteMessage | null) => {
        if (remoteMessage) {
          console.log('[FCM] App opened from notification (cold start):', {
            notification: remoteMessage.notification,
            data: remoteMessage.data,
            messageId: remoteMessage.messageId,
          });
        }
      });
    
    console.log('[FCM] Notification handlers configured');
  } catch (error: any) {
    // Don't crash the app if Firebase isn't ready yet
    // It will be initialized when getPushToken() is called
    console.warn('[FCM] Could not configure notification handlers yet:', {
      message: error.message,
      note: 'Firebase will initialize when getPushToken() is called. This is normal on first app launch.',
    });
  }
}

/**
 * Verify Firebase default app is initialized
 * React Native Firebase auto-initializes from GoogleService-Info.plist
 * 
 * If initialization fails, this function will attempt to wait and retry
 * as React Native Firebase may need time to read the plist file.
 */
function verifyFirebaseApp(): void {
  const apps = firebaseApp.apps;
  
  if (apps.length === 0) {
    // Try to get the default app - this might trigger initialization
    try {
      const app = firebaseApp.app();
      if (app) {
        console.log('[FCM] Firebase app accessed successfully');
        return;
      }
    } catch (error: any) {
      // App doesn't exist, continue with error
    }
    
    // Provide detailed diagnostics
    console.error('[FCM] Firebase default app not initialized. Diagnostics:');
    console.error('  - Check if GoogleService-Info.plist exists in ios/ directory');
    console.error('  - Verify it is added to Xcode project (Target → Build Phases → Copy Bundle Resources)');
    console.error('  - Ensure app.config.js has: ios.googleServicesFile: "./ios/GoogleService-Info.plist"');
    console.error('  - IMPORTANT: Rebuild the app in Xcode (Product → Clean Build Folder, then build)');
    console.error('  - React Native Firebase should auto-initialize from the plist file');
    console.error('  - If using Expo: Run "npx expo prebuild --clean" then rebuild');
    
    const error = new Error(
      '[FCM] Firebase default app not initialized. ' +
      'Ensure GoogleService-Info.plist exists in ios/ directory and is added to Xcode project. ' +
      'Check Build Phases → Copy Bundle Resources. Rebuild the app after adding the plist file. ' +
      'React Native Firebase auto-initializes from the plist - if this fails, the plist may not be in the app bundle.'
    );
    throw error;
  }
  
  const defaultApp = firebaseApp.app();
  console.log('[FCM] Firebase default app verified:', {
    name: defaultApp.name,
    options: {
      appId: defaultApp.options.appId,
      projectId: defaultApp.options.projectId,
      messagingSenderId: defaultApp.options.messagingSenderId,
    },
  });
}

/**
 * Request notification permissions using Firebase Messaging
 * Returns the authorization status
 */
export async function requestNotificationPermissions(): Promise<{
  granted: boolean;
  status: FirebaseMessagingTypes.AuthorizationStatus;
}> {
  try {
    verifyFirebaseApp();
    
    const authStatus = await messaging().requestPermission();
    
    // Map authorization status to granted boolean
    // AuthorizationStatus: 0=NOT_DETERMINED, 1=AUTHORIZED, 2=DENIED, 3=PROVISIONAL
    const granted = authStatus === 1; // Only AUTHORIZED (1) is granted
    
    console.log('[FCM] Permission request result:', {
      status: authStatus,
      granted,
      statusName: ['NOT_DETERMINED', 'AUTHORIZED', 'DENIED', 'PROVISIONAL'][authStatus],
    });
    
    return {
      granted,
      status: authStatus,
    };
  } catch (error: any) {
    console.error('[FCM] Error requesting notification permissions:', {
      message: error.message,
      code: error.code,
      nativeError: error.nativeErrorCode || error.nativeErrorMessage,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Get the FCM token using Firebase Messaging
 * 
 * iOS Flow (correct order):
 * 1. requestPermission() - Request user authorization
 * 2. registerDeviceForRemoteMessages() - Register with APNs (iOS only)
 * 3. getToken() - Get FCM registration token
 * 
 * Android Flow:
 * 1. requestPermission() - Request user authorization
 * 2. getToken() - Get FCM registration token (auto-registers with FCM)
 * 
 * This returns the actual FCM registration token that Firebase Cloud Messaging uses.
 * This token can be used directly with admin.messaging().send({ token }) in Firebase Functions.
 */
export async function getPushToken(): Promise<string | null> {
  try {
    // Step 1: Verify Firebase app is initialized (with retry logic)
    // React Native Firebase may need a moment to initialize from GoogleService-Info.plist
    // On first launch, it can take several seconds for the plist to be read
    let initRetries = 10; // Increased retries
    let firebaseReady = false;
    let waitTime = 500; // Start with 500ms, increase on each retry
    
    while (initRetries > 0 && !firebaseReady) {
      try {
        verifyFirebaseApp();
        firebaseReady = true;
        console.log('[FCM] Firebase app initialized successfully');
      } catch (error: any) {
        if (initRetries > 1) {
          console.log(`[FCM] Waiting for Firebase initialization... (${initRetries} retries remaining, waiting ${waitTime}ms)`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          waitTime = Math.min(waitTime * 1.5, 2000); // Exponential backoff, max 2s
          initRetries--;
        } else {
          // Last retry failed, provide final error with actionable steps
          console.error('[FCM] Firebase initialization failed after all retries.');
          console.error('[FCM] ACTION REQUIRED:');
          console.error('  1. Open Xcode project: ios/IYTE56.xcworkspace');
          console.error('  2. Select IYTE56 target → Build Phases tab');
          console.error('  3. Expand "Copy Bundle Resources"');
          console.error('  4. Verify GoogleService-Info.plist is listed');
          console.error('  5. If missing, click + and add ios/GoogleService-Info.plist');
          console.error('  6. Clean build: Product → Clean Build Folder (Shift+Cmd+K)');
          console.error('  7. Rebuild and run on device');
          throw error;
        }
      }
    }
    
    // Step 2: Request permissions (if not already granted)
    const { granted, status } = await requestNotificationPermissions();
    
    if (!granted) {
      const error = new Error(
        `[FCM] Notification permissions not granted. Status: ${status} ` +
        `(${['NOT_DETERMINED', 'AUTHORIZED', 'DENIED', 'PROVISIONAL'][status]})`
      );
      console.error(error.message);
      return null;
    }
    
    // Step 3: iOS-specific - Register device for remote messages
    // This must be called before getToken() on iOS
    if (Platform.OS === 'ios') {
      try {
        await messaging().registerDeviceForRemoteMessages();
        console.log('[FCM] iOS device registered for remote messages');
      } catch (iosError: any) {
        // If already registered, this will throw - that's okay
        if (iosError.message?.includes('already registered') || iosError.code === 'messaging/already-registered') {
          console.log('[FCM] iOS device already registered for remote messages');
        } else {
          console.warn('[FCM] iOS registration warning (may be already registered):', {
            message: iosError.message,
            code: iosError.code,
            nativeError: iosError.nativeErrorCode || iosError.nativeErrorMessage,
          });
        }
      }
    }
    
    // Step 4: Get FCM token
    // On iOS: This requires APNs token to be available (may take a moment)
    // On Android: This returns FCM token directly
    let tokenRetries = 5;
    let lastError: Error | null = null;
    
    while (tokenRetries > 0) {
      try {
        const fcmToken = await messaging().getToken();
        
        if (fcmToken && fcmToken.length > 0) {
          console.log('[FCM] Successfully retrieved FCM token:', {
            tokenLength: fcmToken.length,
            tokenPrefix: fcmToken.substring(0, 20) + '...',
            platform: Platform.OS,
          });
          return fcmToken;
        }
        
        throw new Error('[FCM] Token is empty or invalid');
      } catch (error: any) {
        lastError = error;
        
        // Check for specific error types
        const errorMessage = error.message || '';
        const errorCode = error.code || '';
        
        // iOS: APNs token might not be ready yet
        if (Platform.OS === 'ios' && (
          errorMessage.includes('APNS') ||
          errorMessage.includes('APNs') ||
          errorMessage.includes('not available') ||
          errorCode === 'messaging/apns-token-not-set'
        )) {
          console.log(`[FCM] Waiting for APNs token... (${tokenRetries} retries remaining)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          tokenRetries--;
          continue;
        }
        
        // Firebase app not initialized
        if (errorMessage.includes('No Firebase App') || errorMessage.includes('not been created')) {
          console.error('[FCM] Firebase app not initialized:', {
            message: error.message,
            code: error.code,
            nativeError: error.nativeErrorCode || error.nativeErrorMessage,
          });
          throw error;
        }
        
        // Other errors - log and throw
        console.error('[FCM] Error getting FCM token:', {
          message: error.message,
          code: error.code,
          nativeError: error.nativeErrorCode || error.nativeErrorMessage,
          stack: error.stack,
        });
        throw error;
      }
    }
    
    // Exhausted retries
    const finalError = lastError || new Error('[FCM] Failed to get FCM token after retries');
    console.error('[FCM] Final error after retries:', {
      message: finalError.message,
      platform: Platform.OS,
    });
    throw finalError;
    
  } catch (error: any) {
    console.error('[FCM] Fatal error in getPushToken:', {
      message: error.message,
      code: error.code,
      nativeError: error.nativeErrorCode || error.nativeErrorMessage,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Register FCM token for a user
 * Saves the push token to Firestore at users/{userId}/fcmToken
 */
export async function registerFCMToken(userId: string): Promise<boolean> {
  try {
    // Request permissions first
    const { granted } = await requestNotificationPermissions();
    
    if (!granted) {
      console.log('Notification permissions not granted, cannot register token');
      return false;
    }

    // Get the FCM token from Firebase Messaging
    const token = await getPushToken();
    
    if (!token) {
      console.log('Failed to get FCM token');
      return false;
    }

    // Save token to Firestore
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
      fcmToken: token,
      notificationPermissionAsked: true,
      updatedAt: serverTimestamp(),
    });

    console.log('FCM token registered successfully for user:', userId);
    return true;
  } catch (error) {
    console.error('Error registering FCM token:', error);
    return false;
  }
}

/**
 * Check if notification permissions have been asked before
 */
export async function hasNotificationPermissionBeenAsked(userId: string): Promise<boolean> {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const docSnap = await getDoc(userRef);
    
    if (docSnap.exists()) {
      const userData = docSnap.data();
      return userData.notificationPermissionAsked === true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking notification permission status:', error);
    return false;
  }
}
