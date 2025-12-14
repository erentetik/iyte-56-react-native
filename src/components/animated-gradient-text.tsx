import { applyFont } from '@/utils/apply-fonts';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
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

interface AnimatedGradientTextProps {
  text: string;
  style?: any;
}

export function AnimatedGradientText({ text, style }: AnimatedGradientTextProps) {
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
  }, [progress]);

  // Create animated styles for each character
  const characters = text.split('');

  return (
    <View style={styles.container}>
      {characters.map((char, index) => (
        <AnimatedCharacter
          key={`${char}-${index}`}
          char={char}
          index={index}
          total={characters.length}
          progress={progress}
          style={style}
        />
      ))}
    </View>
  );
}

interface AnimatedCharacterProps {
  char: string;
  index: number;
  total: number;
  progress: SharedValue<number>;
  style?: any;
}

function AnimatedCharacter({ char, index, total, progress, style }: AnimatedCharacterProps) {
  const animatedStyle = useAnimatedStyle(() => {
    // Offset each character's animation based on its position
    const offset = index / total;
    const adjustedProgress = (progress.value + offset) % 1;

    // Calculate which segment of the gradient we're in
    const segmentCount = GRADIENT_COLORS.length - 1;
    const segment = Math.floor(adjustedProgress * segmentCount);
    const segmentProgress = (adjustedProgress * segmentCount) % 1;

    // Interpolate between current and next color
    const color = interpolateColor(
      segmentProgress,
      [0, 1],
      [GRADIENT_COLORS[segment], GRADIENT_COLORS[segment + 1]]
    );

    return {
      color,
    };
  });

  return (
    <Animated.Text style={[styles.character, style, animatedStyle]}>
      {char}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  character: {
    ...applyFont({
      fontWeight: '700',
      fontSize: 15,
    }),
  },
});
