/**
 * Notifications Service
 * 
 * Handle notification queries and creation in Firestore.
 */

import { db } from '@/config/firebase';
import { COLLECTIONS, NotificationDocument } from '@/types/firestore';
import { addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, Timestamp, updateDoc, where } from 'firebase/firestore';

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
