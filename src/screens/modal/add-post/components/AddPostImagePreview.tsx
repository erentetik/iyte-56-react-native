/**
 * Add Post Image Preview Component
 * 
 * Displays selected images with remove buttons
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColors } from '@/hooks/use-theme-colors';
import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';

interface AddPostImagePreviewProps {
  images: string[];
  onRemoveImage: (index: number) => void;
}

export function AddPostImagePreview({ images, onRemoveImage }: AddPostImagePreviewProps) {
  const colors = useThemeColors();

  if (images.length === 0) {
    return null;
  }

  return (
    <View style={styles.imagesPreviewContainer}>
      {images.map((imageUri, index) => (
        <View 
          key={index} 
          style={[
            styles.imagePreviewWrapper,
            images.length === 1 && styles.singleImageWrapper,
            images.length === 2 && styles.twoImagesWrapper,
            images.length >= 3 && styles.multipleImagesWrapper,
          ]}
        >
          <Image
            source={{ uri: imageUri }}
            style={styles.imagePreview}
            resizeMode="cover"
          />
          <TouchableOpacity
            style={[styles.removeImageButton, { backgroundColor: colors.neutral[1] }]}
            onPress={() => onRemoveImage(index)}
          >
            <IconSymbol name="xmark.circle.fill" size={24} color={colors.neutral[12]} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  imagesPreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  imagePreviewWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  singleImageWrapper: {
    width: '100%',
    height: 200,
  },
  twoImagesWrapper: {
    width: '48%',
    aspectRatio: 1,
  },
  multipleImagesWrapper: {
    width: '48%',
    aspectRatio: 1,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 12,
    padding: 4,
  },
});

