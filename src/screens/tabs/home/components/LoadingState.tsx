import { useThemeColors } from '@/hooks/use-theme-colors';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export function LoadingState() {
  const colors = useThemeColors();

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.orange[9]} />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

