import React, { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

// Admin gradient colors - same as animated gradient text
// Using a blend of the gradient colors for a vibrant border
const GRADIENT_BORDER_COLOR = '#ff8c42'; // Blend of orange and gold

interface GradientBorderProps {
  children: ReactNode;
  borderWidth?: number;
  borderRadius?: number;
}

export function GradientBorder({ children, borderWidth = 2, borderRadius = 16 }: GradientBorderProps) {
  // Use a vibrant blend color that represents the gradient
  // This creates a distinctive border for admin posts
  return (
    <View style={[styles.container, { borderRadius, borderWidth, borderColor: GRADIENT_BORDER_COLOR }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
