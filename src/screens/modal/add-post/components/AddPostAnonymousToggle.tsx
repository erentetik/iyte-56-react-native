/**
 * Add Post Anonymous Toggle Component
 * 
 * Toggle switch for anonymous posting with note
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useLanguage } from '@/contexts/LanguageContext';
import { useThemeColors } from '@/hooks/use-theme-colors';
import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { applyFont } from '@/utils/apply-fonts';

interface AddPostAnonymousToggleProps {
  isAnonymous: boolean;
  onToggle: (value: boolean) => void;
}

export function AddPostAnonymousToggle({ isAnonymous, onToggle }: AddPostAnonymousToggleProps) {
  const colors = useThemeColors();
  const { t } = useLanguage();

  return (
    <>
      <View
        style={[
          styles.optionRow,
          { borderTopColor: colors.neutral[6] },
        ]}
      >
        <View style={styles.optionInfo}>
          <IconSymbol name="person.fill.questionmark" size={20} color={colors.neutral[9]} />
          <Text style={[styles.optionLabel, { color: colors.neutral[12] }]}>
            {t('addPost.postAnonymously')}
          </Text>
        </View>
        <Switch
          value={isAnonymous}
          onValueChange={onToggle}
          trackColor={{ false: colors.neutral[6], true: colors.orange[9] }}
          thumbColor="#fff"
        />
      </View>
      
      {isAnonymous && (
        <Text style={[styles.anonymousNote, { color: colors.neutral[9] }]}>
          {t('addPost.anonymousNote')}
        </Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    marginTop: 8,
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionLabel: {
    ...applyFont({
      fontSize: 16,
    }),
  },
  anonymousNote: {
    ...applyFont({
      fontSize: 13,
    }),
    paddingHorizontal: 16,
    paddingBottom: 16,
    marginTop: -8,
  },
});

