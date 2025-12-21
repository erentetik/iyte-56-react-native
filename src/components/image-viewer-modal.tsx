/**
 * Image Viewer Modal
 * 
 * Displays multiple images in a full-screen modal with swipe navigation.
 */

import { useThemeColors } from '@/hooks/use-theme-colors';
import { Image } from 'expo-image';
import React, { useRef, useState } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View, Dimensions, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from './ui/icon-symbol';
import { FlatList } from 'react-native';

interface ImageViewerModalProps {
  visible: boolean;
  imageUris: string[];
  initialIndex?: number;
  onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function ImageViewerModal({
  visible,
  imageUris,
  initialIndex = 0,
  onClose,
}: ImageViewerModalProps) {
  const colors = useThemeColors();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);

  if (!imageUris || imageUris.length === 0) {
    return null;
  }

  // Scroll to initial index when modal opens
  React.useEffect(() => {
    if (visible && initialIndex !== currentIndex) {
      setCurrentIndex(initialIndex);
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: initialIndex,
          animated: false,
        });
      }, 100);
    }
  }, [visible, initialIndex]);

  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    if (index !== currentIndex && index >= 0 && index < imageUris.length) {
      setCurrentIndex(index);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      flatListRef.current?.scrollToIndex({
        index: newIndex,
        animated: true,
      });
    }
  };

  const handleNext = () => {
    if (currentIndex < imageUris.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      flatListRef.current?.scrollToIndex({
        index: newIndex,
        animated: true,
      });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.overlay}>
          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <IconSymbol name="xmark" size={24} color={colors.neutral[12]} />
          </TouchableOpacity>

          {/* Image Counter */}
          {imageUris.length > 1 && (
            <View style={styles.counterContainer}>
              <View style={[styles.counter, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
                <IconSymbol name="photo" size={14} color={colors.neutral[12]} />
                <Text style={[styles.counterText, { color: colors.neutral[12] }]}>
                  {currentIndex + 1} / {imageUris.length}
                </Text>
              </View>
            </View>
          )}

          {/* Image List */}
          <FlatList
            ref={flatListRef}
            data={imageUris}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => `${item}-${index}`}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            onScrollToIndexFailed={(info) => {
              // Fallback if scroll fails
              setTimeout(() => {
                flatListRef.current?.scrollToIndex({
                  index: info.index,
                  animated: false,
                });
              }, 100);
            }}
            renderItem={({ item }) => (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: item }}
                  style={styles.image}
                  contentFit="contain"
                  transition={200}
                />
              </View>
            )}
          />

          {/* Navigation Buttons (only show if multiple images) */}
          {imageUris.length > 1 && (
            <>
              {currentIndex > 0 && (
                <TouchableOpacity
                  style={[styles.navButton, styles.prevButton]}
                  onPress={handlePrevious}
                  activeOpacity={0.7}
                >
                  <IconSymbol name="chevron.left" size={24} color={colors.neutral[12]} />
                </TouchableOpacity>
              )}
              {currentIndex < imageUris.length - 1 && (
                <TouchableOpacity
                  style={[styles.navButton, styles.nextButton]}
                  onPress={handleNext}
                  activeOpacity={0.7}
                >
                  <IconSymbol name="chevron.right" size={24} color={colors.neutral[12]} />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  counterContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  counterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  image: {
    width: '100%',
    height: '100%',
    maxWidth: SCREEN_WIDTH,
    maxHeight: SCREEN_HEIGHT,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  prevButton: {
    left: 20,
  },
  nextButton: {
    right: 20,
  },
});
