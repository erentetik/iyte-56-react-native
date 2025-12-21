import React, { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

// Default admin gradient color - fallback if not provided from user document
const DEFAULT_BORDER_COLOR = '#ff8c42'; // Blend of orange and gold

interface GradientBorderProps {
  children: ReactNode;
  borderWidth?: number;
  borderRadius?: number;
  borderColor?: string; // Border color from Firebase user document
}

export function GradientBorder({ 
  children, 
  borderWidth = 2, 
  borderRadius = 16,
  borderColor 
}: GradientBorderProps) {
  // Use border color from Firebase user document, or fallback to default
  const color = borderColor || DEFAULT_BORDER_COLOR;
  
  return (
    <View style={[styles.container, { borderRadius, borderWidth, borderColor: color }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
