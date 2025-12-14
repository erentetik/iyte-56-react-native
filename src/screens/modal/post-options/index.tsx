/**
 * Post Options Modal
 * 
 * Modal for showing post/comment options (Delete, Report, etc.)
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useLanguage } from '@/contexts/LanguageContext';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { applyFont } from '@/utils/apply-fonts';
import React from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PostOptionsModalProps {
  visible: boolean;
  isOwnPost: boolean;
  onClose: () => void;
  onDelete?: () => void;
  onReport?: () => void;
  onBlock?: () => void;
  canBlock?: boolean;
}

export function PostOptionsModal({
  visible,
  isOwnPost,
  onClose,
  onDelete,
  onReport,
  onBlock,
  canBlock = false,
}: PostOptionsModalProps) {
  const colors = useThemeColors();
  const { t } = useLanguage();

  const handleDelete = () => {
    onClose();
    onDelete?.();
  };

  const handleReport = () => {
    onClose();
    onReport?.();
  };

  const handleBlock = () => {
    onClose();
    onBlock?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <SafeAreaView style={styles.modalContainer} edges={['bottom']}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[styles.modalContent, { backgroundColor: colors.neutral[2] }]}
          >
            {isOwnPost ? (
              <TouchableOpacity
                style={[styles.option, { borderBottomColor: colors.neutral[6] }]}
                onPress={handleDelete}
              >
                <IconSymbol name="trash.fill" size={20} color="#ef4444" />
                <Text style={[styles.optionText, { color: '#ef4444' }]}>
                  {t('postOptions.delete')}
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                {canBlock && (
                  <TouchableOpacity
                    style={[styles.option, { borderBottomColor: colors.neutral[6] }]}
                    onPress={handleBlock}
                  >
                    <IconSymbol name="person.fill.xmark" size={20} color={colors.orange[9]} />
                    <Text style={[styles.optionText, { color: colors.neutral[12] }]}>
                      {t('postOptions.blockUser')}
                    </Text>
                  </TouchableOpacity>
                )}
              <TouchableOpacity
                style={[styles.option, { borderBottomColor: colors.neutral[6] }]}
                onPress={handleReport}
              >
                <IconSymbol name="exclamationmark.triangle.fill" size={20} color={colors.orange[9]} />
                <Text style={[styles.optionText, { color: colors.neutral[12] }]}>
                  {t('postOptions.report')}
                </Text>
              </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              style={styles.option}
              onPress={onClose}
            >
              <Text style={[styles.cancelText, { color: colors.neutral[12] }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </SafeAreaView>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    paddingTop: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  cancelText: {
    ...applyFont({
      fontSize: 16,
      fontWeight: '600',
    }),
    textAlign: 'center',
  },
});

