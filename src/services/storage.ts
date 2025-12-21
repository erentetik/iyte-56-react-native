/**
 * Firebase Storage Service
 * 
 * Handles file uploads to Firebase Storage.
 */

import { storage } from '@/config/firebase';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';

// Import ImageManipulator with fallback
let ImageManipulator: typeof import('expo-image-manipulator') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ImageManipulator = require('expo-image-manipulator');
} catch {
  console.warn('expo-image-manipulator not available, images will not be resized');
}

/**
 * Resize and compress image before upload
 * Reduces file size while maintaining reasonable quality
 */
async function resizeImage(uri: string, maxWidth: number = 1920, maxHeight: number = 1920, quality: number = 0.8): Promise<string> {
  // Check if ImageManipulator is available
  if (!ImageManipulator) {
    console.log('ImageManipulator not available, skipping resize');
    return uri;
  }
  
  try {
    console.log('Resizing image...', { uri, maxWidth, maxHeight, quality });
    
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: maxWidth,
            height: maxHeight,
          },
        },
      ],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    
    console.log('Image resized successfully:', {
      originalUri: uri,
      resizedUri: manipResult.uri,
      width: manipResult.width,
      height: manipResult.height,
    });
    
    return manipResult.uri;
  } catch (error) {
    console.error('Error resizing image:', error);
    // If resize fails, return original URI
    console.log('Using original image without resizing');
    return uri;
  }
}

/**
 * Convert a URI to a Blob in React Native
 * Uses fetch() which works with file://, content://, and remote URLs
 * Fixed Blob upload for React Native compatibility
 */
async function uriToBlob(uri: string): Promise<Blob> {
  try {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`Failed to load file: ${response.statusText}`);
    }
    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      throw new Error('File is empty');
    }
    return blob;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to load file. Please try selecting the image again.');
  }
}

/**
 * Upload with timeout wrapper
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string = 'Operation'): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => {
        const timeoutSeconds = Math.floor(timeoutMs / 1000);
        reject(new Error(`${operation} timed out after ${timeoutSeconds} seconds. Please check your internet connection and try again.`));
      }, timeoutMs)
    ),
  ]);
}

/**
 * Convert Firebase Storage error to user-friendly message
 */
function getStorageErrorMessage(error: any): string {
  // Log the full error for debugging (but don't show to user)
  console.error('Firebase Storage error:', {
    code: error.code,
    message: error.message,
    serverResponse: error.serverResponse,
    name: error.name,
    stack: error.stack,
    // Try to get more details from the error object
    ...(error.customData && { customData: error.customData }),
  });

  // Map Firebase error codes to user-friendly messages
  const errorCode = error.code || '';
  
  if (errorCode.includes('storage/unauthorized')) {
    return 'You do not have permission to upload files. Please check your account settings.';
  }
  
  if (errorCode.includes('storage/canceled')) {
    return 'Upload was canceled. Please try again.';
  }
  
  if (errorCode.includes('storage/unknown')) {
    // Check if there's a server response that might give us more info
    if (error.serverResponse) {
      console.error('Storage server response:', error.serverResponse);
    }
    // Provide a more helpful message
    return 'Failed to upload image. This might be due to network issues or storage permissions. Please check your internet connection and try again.';
  }
  
  if (errorCode.includes('storage/invalid-argument')) {
    return 'Invalid image file. Please select a different image.';
  }
  
  if (errorCode.includes('storage/not-found')) {
    return 'Upload location not found. Please try again.';
  }
  
  if (errorCode.includes('storage/quota-exceeded')) {
    return 'Storage quota exceeded. Please contact support.';
  }
  
  if (errorCode.includes('storage/unauthenticated')) {
    return 'Please sign in to upload images.';
  }
  
  if (error.message && error.message.includes('timeout')) {
    return 'Upload timed out. Please check your internet connection and try again.';
  }
  
  if (error.message && error.message.includes('network')) {
    return 'Network error. Please check your internet connection and try again.';
  }
  
  // Default user-friendly message
  return 'Failed to upload image. Please try again.';
}

/**
 * Upload an image to Firebase Storage
 * 
 * @param uri - Local URI of the image
 * @param path - Storage path (e.g., 'posts/userId/filename.jpg')
 * @returns Download URL of the uploaded image
 */
export async function uploadImage(uri: string, path: string): Promise<string> {
  try {
    console.log('Starting image upload:', { uri, path });
    
    // Check if it's a local file URI
    const isLocalFile = uri.startsWith('file://') || 
                       uri.startsWith('content://') || 
                       uri.startsWith('ph://') ||
                       uri.startsWith('/');
    
    let blob: Blob;
    let contentType = 'image/jpeg';
    
    // Resize image before upload to reduce file size
    // Fixed Blob upload for React Native compatibility
    let processedUri = uri;
    if (isLocalFile) {
      console.log('Resizing local image before upload...');
      try {
        // Resize to max 1920x1920 with 80% quality
        processedUri = await resizeImage(uri, 1920, 1920, 0.8);
        console.log('Image resized, reading file...');
      } catch (error) {
        console.warn('Resize failed, using original image:', error);
        // Continue with original URI if resize fails
      }
    }
    
    // Use fetch() to get Blob - works for both local and remote files
    if (isLocalFile) {
      console.log('Reading local file...');
      try {
        blob = await uriToBlob(processedUri);
        console.log('File read successfully, size:', blob.size, 'bytes');
        if (processedUri !== uri) {
          console.log('File size reduced by resizing');
        }
      } catch (error) {
        throw new Error('Failed to read image file. Please select a different image.');
      }
      
      // Content type is JPEG after resize (we always convert to JPEG)
      contentType = 'image/jpeg';
    } else {
      // For remote URLs, use fetch (no resizing for remote URLs)
      console.log('Fetching remote URL...');
      try {
        const response = await fetch(uri);
        if (!response.ok) {
          throw new Error('Failed to load image. Please check your internet connection.');
        }
        blob = await response.blob();
        console.log('Remote file fetched successfully, size:', blob.size);
        contentType = blob.type || 'image/jpeg';
      } catch (error) {
        if (error instanceof Error && error.message.includes('Failed to load image')) {
          throw error;
        }
        throw new Error('Failed to load image. Please check your internet connection.');
      }
    }
    
    if (!blob || blob.size === 0) {
      throw new Error('Invalid image file: file is empty');
    }
    
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (blob.size > maxSize) {
      throw new Error('Image file is too large. Maximum size is 10MB.');
    }
    
    // Create storage reference
    const storageRef = ref(storage, path);
    console.log('Uploading to storage path:', path);
    console.log('File size:', blob.size, 'bytes, Content type:', contentType);
    
    // Use uploadBytesResumable with Blob - React Native compatible
    // Fixed Blob upload for React Native compatibility
    const uploadTask = uploadBytesResumable(storageRef, blob, {
      contentType,
    });
    
    // Wait for upload to complete with timeout
    console.log('Starting upload task...');
    await withTimeout(
      new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot: { bytesTransferred: number; totalBytes: number }) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`Upload progress: ${progress.toFixed(1)}%`);
          },
          (error: unknown) => {
            // Convert to user-friendly error message
            const userMessage = getStorageErrorMessage(error);
            reject(new Error(userMessage));
          },
          () => {
            console.log('Upload completed successfully');
            resolve();
          }
        );
      }),
      120000, // 2 minute timeout
      'Image upload'
    );
    
    console.log('Getting download URL...');
    // Get download URL with timeout
    const downloadURL = await withTimeout<string>(
      getDownloadURL(storageRef),
      10000, // 10 second timeout
      'Getting download URL'
    );
    console.log('Got download URL:', downloadURL);
    
    return downloadURL as string;
  } catch (error) {
    // If it's already a user-friendly error message, re-throw it
    if (error instanceof Error && !error.message.includes('Firebase Storage:')) {
      throw error;
    }
    
    // Otherwise, convert Firebase error to user-friendly message
    const userMessage = getStorageErrorMessage(error);
    throw new Error(userMessage);
  }
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
