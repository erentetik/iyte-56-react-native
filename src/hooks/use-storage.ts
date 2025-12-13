import {
  uploadAvatar,
  uploadImage,
  uploadPostImage,
} from '@/services/storage';
import { useCallback, useState } from 'react';

/**
 * Hook for file upload operations
 */
export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const upload = useCallback(
    async (path: string, uri: string): Promise<string | null> => {
      setUploading(true);
      setProgress(0);
      setError(null);
      
      try {
        const url = await uploadImage(uri, path);
        setProgress(100);
        return url;
      } catch (err) {
        setError(err as Error);
        return null;
      } finally {
        setUploading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setUploading(false);
    setProgress(0);
    setError(null);
  }, []);

  return {
    upload,
    uploading,
    progress,
    error,
    reset,
  };
}

/**
 * Hook for avatar upload
 */
export function useAvatarUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const uploadUserAvatar = useCallback(
    async (userId: string, uri: string): Promise<string | null> => {
      setUploading(true);
      setError(null);
      
      try {
        const url = await uploadAvatar(uri, userId);
        return url;
      } catch (err) {
        setError(err as Error);
        return null;
      } finally {
        setUploading(false);
      }
    },
    []
  );

  return { uploadUserAvatar, uploading, error };
}

/**
 * Hook for post image upload
 */
export function usePostImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const uploadImage = useCallback(
    async (userId: string, uri: string, postId?: string): Promise<string | null> => {
      setUploading(true);
      setProgress(0);
      setError(null);
      
      try {
        const url = await uploadPostImage(uri, userId, postId);
        setProgress(100);
        return url;
      } catch (err) {
        setError(err as Error);
        return null;
      } finally {
        setUploading(false);
      }
    },
    []
  );

  return { uploadImage, uploading, progress, error };
}

/**
 * Hook for file deletion
 * Note: File deletion functionality needs to be implemented in storage service
 */
export function useFileDelete() {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const remove = useCallback(async (path: string): Promise<boolean> => {
    setDeleting(true);
    setError(null);
    
    try {
      // TODO: Implement deleteFile in storage service
      // await deleteFile(path);
      console.warn('File deletion not yet implemented');
      return false;
    } catch (err) {
      setError(err as Error);
      return false;
    } finally {
      setDeleting(false);
    }
  }, []);

  const removeByUrl = useCallback(async (url: string): Promise<boolean> => {
    setDeleting(true);
    setError(null);
    
    try {
      // TODO: Implement deleteFileByUrl in storage service
      // Extract path from URL and delete
      // await deleteFileByUrl(url);
      console.warn('File deletion by URL not yet implemented');
      return false;
    } catch (err) {
      setError(err as Error);
      return false;
    } finally {
      setDeleting(false);
    }
  }, []);

  return { remove, removeByUrl, deleting, error };
}

