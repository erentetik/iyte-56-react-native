import React, { useState } from 'react';
import { View, Image, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { AvatarViewerModal } from '../avatar-viewer-modal';
import { IconSymbol } from './icon-symbol';

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: number;
  className?: string;
  style?: ViewStyle;
  onPress?: () => void; // Optional custom onPress handler
}

export function Avatar({ src, alt, size = 40, style, onPress, ...props }: AvatarProps) {
  const [showViewer, setShowViewer] = useState(false);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (src) {
      setShowViewer(true);
    }
  };

  const AvatarContent = (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }, style]}>
      {src ? (
        <Image source={{ uri: src }} style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]} />
      ) : (
        <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
          <IconSymbol name="person.fill" size={size * 0.6} color="#666" />
        </View>
      )}
    </View>
  );

  // Only make clickable if there's a source image or custom onPress
  if (src || onPress) {
    return (
      <>
        <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
          {AvatarContent}
        </TouchableOpacity>
        {src && (
          <AvatarViewerModal
            visible={showViewer}
            avatarUri={src}
            onClose={() => setShowViewer(false)}
          />
        )}
      </>
    );
  }

  return AvatarContent;
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
  },
  image: {
    resizeMode: 'cover',
  },
  placeholder: {
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

