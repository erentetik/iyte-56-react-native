/**
 * Report Comment Modal
 * 
 * Modal for reporting a comment with reason selection.
 */

import { useLanguage } from '@/contexts/LanguageContext';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { reportComment } from '@/services/moderation';
import { CommentDocument, ReportReason, UserDocument } from '@/types/firestore';
import { applyFont } from '@/utils/apply-fonts';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ReportCommentModalProps {
  visible: boolean;
  comment: CommentDocument | null;
  reporter: UserDocument | null;
  onClose: () => void;
}

const REPORT_REASONS: { value: ReportReason; label: { en: string; tr: string } }[] = [
  { value: 'spam', label: { en: 'Spam', tr: 'Spam' } },
  { value: 'harassment', label: { en: 'Harassment', tr: 'Taciz' } },
  { value: 'hate_speech', label: { en: 'Hate Speech', tr: 'Nefret Söylemi' } },
  { value: 'violence', label: { en: 'Violence', tr: 'Şiddet' } },
  { value: 'nudity', label: { en: 'Nudity', tr: 'Çıplaklık' } },
  { value: 'misinformation', label: { en: 'Misinformation', tr: 'Yanlış Bilgi' } },
  { value: 'impersonation', label: { en: 'Impersonation', tr: 'Kimlik Taklidi' } },
  { value: 'other', label: { en: 'Other', tr: 'Diğer' } },
];

export function ReportCommentModal({ visible, comment, reporter, onClose }: ReportCommentModalProps) {
  const colors = useThemeColors();
  const { t, language } = useLanguage();
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    if (!selectedReason || !comment || !reporter) {
      Alert.alert(t('common.error'), t('reportPost.selectReason'));
      return;
    }
    
    setIsSubmitting(true);
    try {
      await reportComment(comment, reporter, {
        reason: selectedReason,
        description: description.trim() || undefined,
      });
      
      Alert.alert(
        t('reportPost.success'),
        t('reportPost.successMessage'),
        [
          {
            text: t('common.ok'),
            onPress: () => {
              setSelectedReason(null);
              setDescription('');
              onClose();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || t('reportPost.error'));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedReason(null);
      setDescription('');
      onClose();
    }
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.modalOverlay} edges={['top', 'bottom']}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.neutral[6] }]}>
            <Text style={[styles.title, { color: colors.neutral[12] }]}>
              {t('reportPost.title')}
            </Text>
            <TouchableOpacity onPress={handleClose} disabled={isSubmitting}>
              <Text style={[styles.closeButton, { color: colors.orange[9] }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Content - Scrollable */}
          <ScrollView 
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.subtitle, { color: colors.neutral[11] }]}>
              {t('reportPost.subtitle')}
            </Text>
            
            {/* Reason Selection */}
            <View style={styles.reasonsContainer}>
              {REPORT_REASONS.map((reason) => {
                const isSelected = selectedReason === reason.value;
                const label = language === 'tr' ? reason.label.tr : reason.label.en;
                
                return (
                  <TouchableOpacity
                    key={reason.value}
                    style={[
                      styles.reasonButton,
                      {
                        backgroundColor: isSelected ? colors.orange[3] : colors.neutral[3],
                        borderColor: isSelected ? colors.orange[9] : colors.neutral[6],
                      },
                    ]}
                    onPress={() => setSelectedReason(reason.value)}
                    disabled={isSubmitting}
                  >
                    <Text
                      style={[
                        styles.reasonText,
                        {
                          color: isSelected ? colors.orange[9] : colors.neutral[12],
                          ...applyFont({
                            fontWeight: isSelected ? '600' : '400',
                          }),
                        },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            
            {/* Optional Description */}
            <View style={styles.descriptionContainer}>
              <Text style={[styles.descriptionLabel, { color: colors.neutral[11] }]}>
                {t('reportPost.descriptionLabel')} ({t('common.optional')})
              </Text>
              <TextInput
                style={[
                  styles.descriptionInput,
                  {
                    backgroundColor: colors.neutral[3],
                    color: colors.neutral[12],
                    borderColor: colors.neutral[6],
                  },
                ]}
                placeholder={t('reportPost.descriptionPlaceholder')}
                placeholderTextColor={colors.neutral[9]}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                maxLength={500}
                editable={!isSubmitting}
              />
            </View>
          </ScrollView>
          
          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.neutral[6] }]}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  backgroundColor: selectedReason ? colors.orange[9] : colors.neutral[6],
                  opacity: isSubmitting ? 0.6 : 1,
                },
              ]}
              onPress={handleSubmit}
              disabled={!selectedReason || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>{t('reportPost.submit')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    ...applyFont({
      fontSize: 20,
      fontWeight: '700',
    }),
  },
  closeButton: {
    ...applyFont({
      fontSize: 16,
      fontWeight: '600',
    }),
  },
  subtitle: {
    ...applyFont({
      fontSize: 15,
    }),
    marginBottom: 20,
  },
  reasonsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  reasonButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  reasonText: {
    ...applyFont({
      fontSize: 15,
    }),
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  descriptionLabel: {
    ...applyFont({
      fontSize: 14,
    }),
    marginBottom: 8,
  },
  descriptionInput: {
    borderRadius: 12,
    padding: 12,
    ...applyFont({
      fontSize: 15,
    }),
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    ...applyFont({
      fontSize: 16,
      fontWeight: '600',
    }),
  },
});

