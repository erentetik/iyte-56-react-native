import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
}

export function Card({ children, style, ...props }: CardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#1a1a1a' : '#fff',
          borderColor: isDark ? '#333' : '#e0e0e0',
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
});

