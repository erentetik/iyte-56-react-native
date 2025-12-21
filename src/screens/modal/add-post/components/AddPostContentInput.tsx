/**
 * Add Post Content Input Component
 * 
 * Text input with image picker button and character count
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useLanguage } from '@/contexts/LanguageContext';
import { useThemeColors } from '@/hooks/use-theme-colors';
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { applyFont } from '@/utils/apply-fonts';
import { MAX_CONTENT_LENGTH } from './constants';

interface AddPostContentInputProps {
  content: string;
  onContentChange: (text: string) => void;
  onPickImage: () => void;
  hasImages: boolean;
  canAddMoreImages: boolean;
  isSubmitting: boolean;
}

export function AddPostContentInput({
  content,
  onContentChange,
  onPickImage,
  hasImages,
  canAddMoreImages,
  isSubmitting,
}: AddPostContentInputProps) {
  const colors = useThemeColors();
  const { t } = useLanguage();

  const remainingChars = MAX_CONTENT_LENGTH - content.length;
  const isOverLimit = remainingChars < 0;

  return (
    <View style={styles.inputWrapper}>
      <TextInput
        style={[
          styles.contentInput,
          { color: colors.neutral[12] },
        ]}
        placeholder={t('addPost.placeholder')}
        placeholderTextColor={colors.neutral[8]}
        multiline
        maxLength={MAX_CONTENT_LENGTH + 50} // Allow some overflow for visual feedback
        value={content}
        onChangeText={onContentChange}
        autoFocus
      />
      <View style={styles.inputFooter}>
        <TouchableOpacity
          onPress={onPickImage}
          style={styles.imageButton}
          disabled={isSubmitting || !canAddMoreImages}
        >
          <IconSymbol
            name="photo"
            size={24}
            color={hasImages ? colors.orange[9] : colors.neutral[9]}
          />
        </TouchableOpacity>
        <Text
          style={[
            styles.charCount,
            {
              color: isOverLimit
                ? '#ef4444'
                : remainingChars <= 20
                ? colors.orange[9]
                : colors.neutral[9],
            },
          ]}
        >
          {content.length} / {MAX_CONTENT_LENGTH}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inputWrapper: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  contentInput: {
    ...applyFont({
      fontSize: 18,
    }),
    lineHeight: 24,
    paddingBottom: 8,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  imageButton: {
    padding: 4,
  },
  charCount: {
    ...applyFont({
      fontSize: 14,
      fontWeight: '500',
    }),
  },
});

