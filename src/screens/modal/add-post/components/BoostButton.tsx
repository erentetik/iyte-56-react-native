/**
 * Boost Button Component
 * 
 * Simple button with solid background for boosting posts
 */

import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { applyFont } from '@/utils/apply-fonts';
import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
    cancelAnimation,
    Easing,
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

// Admin gradient colors - vibrant orange/gold/red palette
const GRADIENT_COLORS = [
  '#ff6b35', // Bright orange
  '#f7931e', // Golden orange
  '#ffcc00', // Gold
  '#ff9500', // Amber
  '#ff6b35', // Back to start for seamless loop
];

interface BoostButtonProps {
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function BoostButton({ onPress, isLoading = false, disabled = false }: BoostButtonProps) {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const progress = useSharedValue(0);

  // Dark background for better contrast with animated gradient text
  const buttonColor = isDark ? '#1a1a1a' : '#2a2a2a';
  const shadowColor = isDark ? '#000000' : '#1a1a1a';

  // Animate text color
  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: 2000,
        easing: Easing.linear,
      }),
      -1, // Infinite repeat
      false // Don't reverse
    );

    return () => {
      cancelAnimation(progress);
    };
  }, [progress]);

  // Create animated text color style
  const animatedTextStyle = useAnimatedStyle(() => {
    // Calculate which segment of the gradient we're in
    const colors = GRADIENT_COLORS;
    const segmentCount = colors.length - 1;
    const adjustedProgress = progress.value % 1;
    const segment = Math.min(Math.floor(adjustedProgress * segmentCount), segmentCount - 1);
    const segmentProgress = (adjustedProgress * segmentCount) % 1;

    // Ensure we don't go out of bounds
    const currentColor = colors[segment] || colors[0];
    const nextColor = colors[segment + 1] || colors[0];

    // Interpolate between current and next color
    const color = interpolateColor(
      segmentProgress,
      [0, 1],
      [currentColor, nextColor]
    );

    return {
      color,
    };
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={styles.container}
    >
      <View
        style={[
          styles.shadowContainer,
          Platform.OS === 'ios' && { shadowColor },
        ]}
      >
        <View
          style={[
            styles.button,
            {
              backgroundColor: buttonColor,
              opacity: disabled ? 0.6 : 1,
              borderColor: isDark ? 'rgba(255, 149, 0, 0.4)' : 'rgba(255, 149, 0, 0.5)',
            },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ff9500" />
          ) : (
            <Animated.Text style={[styles.text, animatedTextStyle]} numberOfLines={1}>
              🚀 {t('addPost.boost')}
            </Animated.Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
  },
  shadowContainer: {
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 2,
    minWidth: 100,
  },
  text: {
    // Color is now animated via animatedTextStyle
    ...applyFont({
      fontSize: 15,
      fontWeight: '700',
    }),
    // Add text shadow for better readability against gradient background
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    textAlign: 'center',
  },
});

