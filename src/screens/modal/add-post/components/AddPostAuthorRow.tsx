/**
 * Add Post Author Row Component
 * 
 * Displays the author username or anonymous indicator
 */

import { useThemeColors } from '@/hooks/use-theme-colors';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { applyFont } from '@/utils/apply-fonts';

interface AddPostAuthorRowProps {
  username?: string;
  isAnonymous: boolean;
}

export function AddPostAuthorRow({ username, isAnonymous }: AddPostAuthorRowProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.authorRow}>
      <Text style={[styles.authorUsername, { color: colors.orange[9] }]}>
        @{isAnonymous ? 'anonymous' : (username || 'user')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  authorUsername: {
    ...applyFont({
      fontSize: 14,
    }),
  },
});

