import { useThemeColors } from '@/hooks/use-theme-colors';
import { applyFont } from '@/utils/apply-fonts';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { HomeTab } from '../types';

interface TabBarProps {
  activeTab: HomeTab;
  onTabChange: (tab: HomeTab) => void;
  featuredLabel: string;
  latestLabel: string;
}

export function TabBar({ activeTab, onTabChange, featuredLabel, latestLabel }: TabBarProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.tabBar, { backgroundColor: colors.background, borderBottomColor: colors.neutral[6] }]}>
      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === 'featured' && [styles.tabButtonActive, { borderBottomColor: colors.orange[9] }],
        ]}
        onPress={() => onTabChange('featured')}
      >
        <Text
          style={[
            styles.tabText,
            { color: activeTab === 'featured' ? colors.orange[9] : colors.neutral[9] },
            activeTab === 'featured' && styles.tabTextActive,
          ]}
        >
          {featuredLabel}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === 'latest' && [styles.tabButtonActive, { borderBottomColor: colors.orange[9] }],
        ]}
        onPress={() => onTabChange('latest')}
      >
        <Text
          style={[
            styles.tabText,
            { color: activeTab === 'latest' ? colors.orange[9] : colors.neutral[9] },
            activeTab === 'latest' && styles.tabTextActive,
          ]}
        >
          {latestLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    // Handled inline
  },
  tabText: {
    ...applyFont({
      fontSize: 15,
    }),
  },
  tabTextActive: {
    ...applyFont({
      fontWeight: '600',
    }),
  },
});

