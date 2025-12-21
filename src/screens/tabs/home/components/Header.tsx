import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { applyFont } from '@/utils/apply-fonts';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface HeaderProps {
  showSearch: boolean;
  onSearchToggle: () => void;
}

export function Header({ showSearch, onSearchToggle }: HeaderProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.neutral[6],
        },
      ]}
    >
      <View style={styles.headerLeft}>
        <Text style={[styles.headerTitle, { color: colors.neutral[12] }]}>
          IYTE56
        </Text>
      </View>
      <TouchableOpacity style={styles.headerIcon} onPress={onSearchToggle}>
        <IconSymbol 
          name={showSearch ? "xmark" : "magnifyingglass"} 
          size={20} 
          color={colors.neutral[12]} 
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    ...applyFont({
      fontSize: 24,
      fontWeight: '700',
    }),
  },
  headerIcon: {
    padding: 4,
  },
});

