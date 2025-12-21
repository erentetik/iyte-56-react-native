/**
 * Avatar Viewer Modal
 * 
 * Displays an enlarged avatar image in a full-screen modal.
 */

import { useThemeColors } from '@/hooks/use-theme-colors';
import { Image } from 'expo-image';
import React from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from './ui/icon-symbol';

interface AvatarViewerModalProps {
  visible: boolean;
  avatarUri?: string;
  onClose: () => void;
}

export function AvatarViewerModal({ visible, avatarUri, onClose }: AvatarViewerModalProps) {
  const colors = useThemeColors();

  if (!avatarUri) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <View style={styles.content}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <IconSymbol name="xmark" size={24} color={colors.neutral[12]} />
            </TouchableOpacity>
            
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: avatarUri }}
                style={styles.image}
                contentFit="contain"
                transition={200}
              />
            </View>
          </View>
        </TouchableOpacity>
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
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  imageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '90%',
    height: '90%',
    maxWidth: 500,
    maxHeight: 500,
    borderRadius: 0,
  },
});

