/**
 * Warning Modal Component
 * 
 * Displays a warning message to the user.
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useLanguage } from '@/contexts/LanguageContext';
import { useThemeColors } from '@/hooks/use-theme-colors';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface WarningModalProps {
  visible: boolean;
  message: string;
  warningCount: number;
  onClose: () => void;
}

export function WarningModal({ visible, message, warningCount, onClose }: WarningModalProps) {
  const colors = useThemeColors();
  const { t } = useLanguage();
  
  const showBanWarning = warningCount >= 2;
  const warningsRemaining = showBanWarning ? 3 - warningCount : 0;
  const isFinalWarning = warningCount >= 3;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.backgroundEmphasis, borderColor: colors.orange[6] }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: colors.orange[2] }]}>
              <IconSymbol name="exclamationmark.triangle.fill" size={32} color={colors.orange[9]} />
            </View>
            <Text style={[styles.title, { color: colors.neutral[12] }]}>
              {t('warning.title')}
            </Text>
          </View>

          {/* Message */}
          <Text style={[styles.message, { color: colors.neutral[11] }]}>
            {message}
          </Text>

          {/* Ban Warning */}
          {showBanWarning && (
            <View style={[styles.banWarning, { backgroundColor: colors.orange[2], borderColor: colors.orange[6] }]}>
              <IconSymbol name="exclamationmark.triangle.fill" size={20} color={colors.orange[9]} />
              <Text style={[styles.banWarningText, { color: colors.orange[11] }]}>
                {isFinalWarning 
                  ? t('warning.finalWarning')
                  : t('warning.banWarning').replace('{{count}}', warningsRemaining.toString()).replace('{{plural}}', warningsRemaining === 1 ? '' : 's')
                }
              </Text>
            </View>
          )}

          {/* Close Button */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.orange[9] }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>{t('warning.understand')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 2,
    padding: 24,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 16,
  },
  banWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    gap: 8,
    width: '100%',
  },
  banWarningText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
