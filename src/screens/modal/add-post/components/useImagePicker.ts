/**
 * Hook for handling image picker logic
 */

import { useLanguage } from '@/contexts/LanguageContext';
import { Alert } from 'react-native';
import { useState } from 'react';
import { ImagePicker } from './utils';
import { MAX_IMAGES } from './constants';

export function useImagePicker(maxImages: number = MAX_IMAGES) {
  const { t } = useLanguage();
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const canAddMoreImages = selectedImages.length < maxImages;

  const handlePickImage = async () => {
    // Check if ImagePicker is available
    if (!ImagePicker) {
      Alert.alert(
        t('addPost.permissionDenied'),
        t('errors.imagePickerUnavailable')
      );
      return;
    }
    
    if (!canAddMoreImages) {
      Alert.alert(
        t('common.error'),
        `You can add up to ${maxImages} images`
      );
      return;
    }
    
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          t('addPost.permissionDenied'),
          t('addPost.permissionMessage')
        );
        return;
      }
      
      // Calculate how many images can still be added
      const remainingSlots = maxImages - selectedImages.length;
      
      // Try to launch image picker with multiple selection
      // Note: allowsMultipleSelection may not be available in all expo-image-picker versions
      const pickerOptions: any = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      };
      
      // Add multiple selection options if supported
      if (remainingSlots > 1) {
        // Try to enable multiple selection (may not be supported in all versions)
        try {
          pickerOptions.allowsMultipleSelection = true;
          pickerOptions.selectionLimit = remainingSlots;
        } catch (e) {
          // If not supported, will fall back to single selection
        }
      }
      
      const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Handle both single and multiple selection
        const newImageUris = result.assets.map(asset => asset.uri);
        const updatedImages = [...selectedImages, ...newImageUris].slice(0, maxImages);
        setSelectedImages(updatedImages);
        
        // If we hit the limit, show a message
        if (updatedImages.length >= maxImages) {
          Alert.alert(
            'Image Limit Reached',
            `You can add up to ${maxImages} images.`
          );
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert(
        t('common.error'),
        t('errors.imagePickerError')
      );
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  return {
    selectedImages,
    setSelectedImages,
    canAddMoreImages,
    handlePickImage,
    handleRemoveImage,
  };
}

