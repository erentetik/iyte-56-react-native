import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { applyFont } from '@/utils/apply-fonts';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ErrorStateProps {
  error?: Error | null;
  onRetry: () => void;
  errorMessage: string;
  retryLabel: string;
}

export function ErrorState({ error, onRetry, errorMessage, retryLabel }: ErrorStateProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.errorContainer}>
      <IconSymbol name="exclamationmark.triangle" size={48} color={colors.orange[9]} />
      <Text style={[styles.errorText, { color: colors.neutral[11] }]}>
        {error?.message || errorMessage}
      </Text>
      <TouchableOpacity
        style={[styles.retryButton, { backgroundColor: colors.orange[9] }]}
        onPress={onRetry}
      >
        <Text style={styles.retryButtonText}>{retryLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    ...applyFont({
      fontSize: 16,
    }),
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    ...applyFont({
      fontWeight: '600',
      fontSize: 16,
    }),
  },
});

