import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { applyFont } from '@/utils/apply-fonts';
import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClear: () => void;
  placeholder: string;
}

export function SearchBar({ searchQuery, onSearchChange, onClear, placeholder }: SearchBarProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.searchContainer, { backgroundColor: colors.background, borderBottomColor: colors.neutral[6] }]}>
      <View style={[styles.searchInputWrapper, { backgroundColor: colors.neutral[3], borderColor: colors.neutral[6] }]}>
        <IconSymbol name="magnifyingglass" size={18} color={colors.neutral[9]} />
        <TextInput
          style={[styles.searchInput, { color: colors.neutral[12] }]}
          placeholder={placeholder}
          placeholderTextColor={colors.neutral[9]}
          value={searchQuery}
          onChangeText={onSearchChange}
          autoFocus
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={onClear}>
            <IconSymbol name="xmark.circle.fill" size={18} color={colors.neutral[9]} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    ...applyFont({
      fontSize: 15,
    }),
    padding: 0,
  },
});

