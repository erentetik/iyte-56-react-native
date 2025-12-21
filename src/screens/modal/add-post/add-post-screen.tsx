/**
 * Add Post Modal Screen
 * 
 * Allows users to create new posts with optional image and anonymous posting.
 */

import { getPaywall, getPaywallProducts } from '@/config/adapty';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCreatePost } from '@/hooks/queries/use-posts';
import { useUser } from '@/hooks/queries/use-user';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { uploadPostImage } from '@/services/storage';
import { UserDocument } from '@/types/firestore';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AddPostAnonymousToggle,
  AddPostAuthorRow,
  AddPostContentInput,
  AddPostHeader,
  AddPostImagePreview,
  MAX_CONTENT_LENGTH,
  MAX_IMAGES,
  useImagePicker,
} from './components';

export function AddPostScreen() {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  
  // Fetch user profile
  const { data: userProfile } = useUser(user?.uid);
  
  // Create post mutation
  const createPostMutation = useCreatePost();
  
  // Form state
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPaywall, setIsLoadingPaywall] = useState(false);
  
  // Image picker hook
  const {
    selectedImages,
    setSelectedImages,
    canAddMoreImages,
    handlePickImage,
    handleRemoveImage,
  } = useImagePicker(MAX_IMAGES);
  
  // Character count
  const remainingChars = MAX_CONTENT_LENGTH - content.length;
  const isOverLimit = remainingChars < 0;
  
  // Can submit check
  const canSubmit = content.trim().length > 0 && !isOverLimit && !isSubmitting;
  
  /**
   * Submit the post
   */
  const handleSubmit = async () => {
    if (!canSubmit || !userProfile) return;
    
    setIsSubmitting(true);
    
    try {
      let imageUrls: string[] | undefined;
      
      // Upload all images if selected
      if (selectedImages.length > 0) {
        console.log(`Starting upload of ${selectedImages.length} image(s)...`);
        
        // Upload all images in parallel with better error handling
        const uploadPromises = selectedImages.map(async (imageUri: string, index: number) => {
          try {
            console.log(`Uploading image ${index + 1}/${selectedImages.length}...`);
            const url = await uploadPostImage(imageUri, userProfile.id);
            console.log(`Image ${index + 1} uploaded successfully`);
            return url;
          } catch (error) {
            console.error(`Failed to upload image ${index + 1}:`, error);
            // Re-throw with user-friendly message (already formatted by storage service)
            const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
            throw new Error(`Image ${index + 1}: ${errorMessage}`);
          }
        });
        
        // Wait for all uploads, but catch individual failures
        const results = await Promise.allSettled(uploadPromises);
        
        // Check if any uploads failed
        const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
        if (failed.length > 0) {
          const errorMessages = failed.map((r: PromiseRejectedResult) => 
            r.reason?.message || 'Failed to upload image'
          ).filter(Boolean);
          
          // Create user-friendly error message
          if (failed.length === selectedImages.length) {
            // All images failed
            throw new Error(errorMessages[0] || 'Failed to upload images. Please try again.');
          } else {
            // Some images failed
            throw new Error(`${failed.length} of ${selectedImages.length} image(s) failed to upload. ${errorMessages[0] || 'Please try again.'}`);
          }
        }
        
        // Extract successful URLs
        imageUrls = results
          .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
          .map((r: PromiseFulfilledResult<string>) => r.value);
        
        console.log(`Successfully uploaded ${imageUrls.length} image(s)`);
      }
      
      // Create post
      console.log('Creating post...');
      await createPostMutation.mutateAsync({
        author: userProfile as UserDocument,
        input: {
          content: content.trim(),
          mediaUrls: imageUrls || [],
          mediaType: imageUrls && imageUrls.length > 0 ? 'image' : undefined,
          isAnonymous,
          visibility: 'public',
        },
      });
      
      console.log('Post created successfully');
      
      // Close modal on success
      router.back();
    } catch (error) {
      console.error('Error creating post:', error);
      // Error message is already user-friendly from storage service
      const errorMessage = error instanceof Error ? error.message : t('addPost.submitError');
      Alert.alert(
        t('common.error'),
        errorMessage
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  
  /**
   * Handle close/cancel
   */
  const handleClose = () => {
    if (content.trim() || selectedImages.length > 0) {
      Alert.alert(
        t('addPost.discardTitle'),
        t('addPost.discardMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('addPost.discard'), style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  /**
   * Handle boost post button - fetch Adapty paywall
   */
  const handleBoostPost = async () => {
    setIsLoadingPaywall(true);
    try {
      const paywall = await getPaywall('boost_post');
      
      if (!paywall) {
        Alert.alert(
          'Boost Unavailable',
          'Boost paywall is not available at the moment. Please try again later.'
        );
        return;
      }

      // Get products from the paywall
      const products = await getPaywallProducts(paywall);
      
      if (products.length === 0) {
        Alert.alert(
          'No Boost Options',
          'No boost products are available at the moment. Please configure products in Adapty Dashboard and App Store Connect.'
        );
        return;
      }

      // Display paywall information
      const productInfo = products.map((product: { localizedTitle?: string; vendorProductId: string; localizedPrice?: string }, index: number) => {
        return `${index + 1}. ${product.localizedTitle || product.vendorProductId} - ${product.localizedPrice || 'N/A'}`;
      }).join('\n');

      Alert.alert(
        'Boost Your Post',
        `Available boost options:\n\n${productInfo}\n\nPaywall ID: ${paywall.placementId || 'N/A'}`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error fetching paywall:', error);
      
      // Handle specific Adapty errors
      let errorMessage = 'Failed to load boost options. Please try again later.';
      
      if (error?.message) {
        if (error.message.includes('noProductIDsFound') || error.message.includes('No valid In-App Purchase products')) {
          errorMessage = 'Boost products are not configured yet. Please configure products in App Store Connect and Adapty Dashboard.';
        } else if (error.message.includes('network') || error.message.includes('connection')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert(
        'Error',
        errorMessage
      );
    } finally {
      setIsLoadingPaywall(false);
    }
  };
  
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <AddPostHeader
          onClose={handleClose}
          onBoost={handleBoostPost}
          onSubmit={handleSubmit}
          canSubmit={canSubmit}
          isSubmitting={isSubmitting}
          isLoadingPaywall={isLoadingPaywall}
        />
        
        <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
          <AddPostAuthorRow
            username={userProfile?.username}
            isAnonymous={isAnonymous}
          />
          
          <AddPostContentInput
            content={content}
            onContentChange={setContent}
            onPickImage={handlePickImage}
            hasImages={selectedImages.length > 0}
            canAddMoreImages={canAddMoreImages}
            isSubmitting={isSubmitting}
          />
          
          <AddPostImagePreview
            images={selectedImages}
            onRemoveImage={handleRemoveImage}
          />
          
          <AddPostAnonymousToggle
            isAnonymous={isAnonymous}
            onToggle={setIsAnonymous}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
});
