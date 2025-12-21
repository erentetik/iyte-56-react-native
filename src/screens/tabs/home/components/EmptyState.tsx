import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { applyFont } from '@/utils/apply-fonts';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.emptyContainer}>
      <IconSymbol name="doc.text" size={48} color={colors.neutral[8]} />
      <Text style={[styles.emptyText, { color: colors.neutral[9] }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    ...applyFont({
      fontSize: 16,
    }),
    marginTop: 16,
    textAlign: 'center',
  },
});

