/**
 * Add Post Header Component
 * 
 * Header with close button, boost button, and submit button
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useLanguage } from '@/contexts/LanguageContext';
import { useThemeColors } from '@/hooks/use-theme-colors';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { applyFont } from '@/utils/apply-fonts';
import { BoostButton } from './BoostButton';

interface AddPostHeaderProps {
  onClose: () => void;
  onBoost: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
  isSubmitting: boolean;
  isLoadingPaywall: boolean;
}

export function AddPostHeader({
  onClose,
  onBoost,
  onSubmit,
  canSubmit,
  isSubmitting,
  isLoadingPaywall,
}: AddPostHeaderProps) {
  const colors = useThemeColors();
  const { t } = useLanguage();

  return (
    <View
      style={[
        styles.header,
        { borderBottomColor: colors.neutral[6] },
      ]}
    >
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <IconSymbol name="xmark" size={24} color={colors.neutral[12]} />
      </TouchableOpacity>
      
      <View style={styles.headerRight}>
        <BoostButton
          onPress={onBoost}
          isLoading={isLoadingPaywall}
          disabled={isSubmitting || isLoadingPaywall}
        />
        
        <TouchableOpacity
          onPress={onSubmit}
          disabled={!canSubmit}
          style={[
            styles.submitButton,
            { backgroundColor: canSubmit ? colors.orange[9] : colors.neutral[6] },
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>{t('addPost.post')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  submitButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    ...applyFont({
      fontWeight: '600',
      fontSize: 15,
    }),
  },
});

