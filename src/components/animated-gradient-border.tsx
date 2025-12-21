import React, { useEffect } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
    Easing,
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

// Default admin gradient colors - fallback if not provided from user document
const DEFAULT_GRADIENT_COLORS = [
  '#ff6b35', // Bright orange
  '#f7931e', // Golden orange
  '#ffcc00', // Gold
  '#ff9500', // Amber
  '#ff6b35', // Back to start for seamless loop
];

interface AnimatedGradientBorderProps {
  children: React.ReactNode;
  borderWidth?: number;
  borderRadius?: number;
  style?: ViewStyle;
  borderColors?: string[]; // Border colors array from Firebase user document
}

export function AnimatedGradientBorder({
  children,
  borderWidth = 2,
  borderRadius = 16,
  style,
  borderColors,
}: AnimatedGradientBorderProps) {
  const progress = useSharedValue(0);
  
  // Use border colors from Firebase user document, or fallback to default
  const gradientColors = borderColors && borderColors.length > 0 
    ? [...borderColors, borderColors[0]] // Add first color at end for seamless loop
    : DEFAULT_GRADIENT_COLORS;

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: 2000,
        easing: Easing.linear,
      }),
      -1, // Infinite repeat
      false // Don't reverse
    );
  }, [progress]);

  // Create animated border color
  const animatedBorderStyle = useAnimatedStyle(() => {
    // Calculate which segment of the gradient we're in
    const segmentCount = gradientColors.length - 1;
    const segment = Math.floor(progress.value * segmentCount);
    const segmentProgress = (progress.value * segmentCount) % 1;

    // Interpolate between current and next color
    const borderColor = interpolateColor(
      segmentProgress,
      [0, 1],
      [gradientColors[segment], gradientColors[segment + 1]]
    );

    return {
      borderColor,
      borderWidth,
      borderRadius,
    };
  });

  return (
    <Animated.View style={[animatedBorderStyle, style]}>
      {children}
    </Animated.View>
  );
}
