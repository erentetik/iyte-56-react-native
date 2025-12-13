import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import { IconSymbol } from './icon-symbol';

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: number;
  className?: string;
  style?: ViewStyle;
}

export function Avatar({ src, alt, size = 40, style, ...props }: AvatarProps) {
  return (
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

