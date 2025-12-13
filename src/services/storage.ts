/**
 * Firebase Storage Service
 * 
 * Handles file uploads to Firebase Storage.
 */

import { storage } from '@/config/firebase';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

/**
 * Upload an image to Firebase Storage
 * 
 * @param uri - Local URI of the image
 * @param path - Storage path (e.g., 'posts/userId/filename.jpg')
 * @returns Download URL of the uploaded image
 */
export async function uploadImage(uri: string, path: string): Promise<string> {
  // Convert URI to blob
  const response = await fetch(uri);
  const blob = await response.blob();
  
  // Create storage reference
  const storageRef = ref(storage, path);
  
  // Upload the file
  await uploadBytes(storageRef, blob);
  
  // Get download URL
  const downloadURL = await getDownloadURL(storageRef);
  
  return downloadURL;
}

/**
 * Upload a post image
 * 
 * @param uri - Local URI of the image
 * @param userId - User ID for organizing storage
 * @param postId - Post ID (optional, for updating existing post)
 * @returns Download URL of the uploaded image
 */
export async function uploadPostImage(
  uri: string,
  userId: string,
  postId?: string
): Promise<string> {
  const timestamp = Date.now();
  const filename = `${postId || 'new'}_${timestamp}.jpg`;
  const path = `posts/${userId}/${filename}`;
  
  return uploadImage(uri, path);
}

/**
 * Upload a profile avatar
 * 
 * @param uri - Local URI of the image
 * @param userId - User ID
 * @returns Download URL of the uploaded image
 */
export async function uploadAvatar(uri: string, userId: string): Promise<string> {
  const timestamp = Date.now();
  const path = `avatars/${userId}/${timestamp}.jpg`;
  
  return uploadImage(uri, path);
}
