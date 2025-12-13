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

// Admin gradient colors - vibrant orange/gold/red palette (same as text)
const GRADIENT_COLORS = [
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
}

export function AnimatedGradientBorder({
  children,
  borderWidth = 2,
  borderRadius = 16,
  style,
}: AnimatedGradientBorderProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: 2000,
        easing: Easing.linear,
      }),
      -1, // Infinite repeat
      false // Don't reverse
    );
  }, []);

  // Create animated border color
  const animatedBorderStyle = useAnimatedStyle(() => {
    // Calculate which segment of the gradient we're in
    const segmentCount = GRADIENT_COLORS.length - 1;
    const segment = Math.floor(progress.value * segmentCount);
    const segmentProgress = (progress.value * segmentCount) % 1;

    // Interpolate between current and next color
    const borderColor = interpolateColor(
      segmentProgress,
      [0, 1],
      [GRADIENT_COLORS[segment], GRADIENT_COLORS[segment + 1]]
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
