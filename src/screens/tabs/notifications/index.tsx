import { IconSymbol } from '@/components/ui/icon-symbol';
import { useLanguage } from '@/contexts/LanguageContext';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { applyFont } from '@/utils/apply-fonts';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function NotificationsScreen() {
  const colors = useThemeColors();
  const { t } = useLanguage();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.neutral[6],
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.neutral[12] }]}>{t('tabs.notifications.title')}</Text>
      </View>
      <View style={styles.emptyContainer}>
        <IconSymbol name="bell" size={48} color={colors.neutral[8]} />
        <Text style={[styles.emptyText, { color: colors.neutral[9] }]}>
          {t('tabs.notifications.empty')}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
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

