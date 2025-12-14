/**
 * Add Post Modal Screen
 * 
 * Allows users to create new posts with optional image and anonymous posting.
 */

import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../../../components/ui/avatar';
import { IconSymbol } from '../../../components/ui/icon-symbol';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useCreatePost, useUser } from '../../../hooks/queries';
import { useThemeColors } from '../../../hooks/use-theme-colors';
import { uploadPostImage } from '../../../services/storage';
import { UserDocument } from '../../../types/firestore';
import { applyFont } from '../../../utils/apply-fonts';

const MAX_CONTENT_LENGTH = 280;

export function AddPostScreen() {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  
  // Fetch user profile
  const { data: userProfile } = useUser(user?.uid);
  
  // Create post mutation
  const createPostMutation = useCreatePost();
  
  // Form state
  const [content, setContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Character count
  const remainingChars = MAX_CONTENT_LENGTH - content.length;
  const isOverLimit = remainingChars < 0;
  
  // Can submit check
  const canSubmit = content.trim().length > 0 && !isOverLimit && !isSubmitting;
  
  /**
   * Pick an image from the library
   */
  const handlePickImage = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        t('addPost.permissionDenied'),
        t('addPost.permissionMessage')
      );
      return;
    }
    
    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };
  
  /**
   * Remove selected image
   */
  const handleRemoveImage = () => {
    setSelectedImage(null);
  };
  
  /**
   * Submit the post
   */
  const handleSubmit = async () => {
    if (!canSubmit || !userProfile) return;
    
    setIsSubmitting(true);
    
    try {
      let imageUrl: string | undefined;
      
      // Upload image if selected
      if (selectedImage) {
        imageUrl = await uploadPostImage(selectedImage, userProfile.id);
      }
      
      // Create post
      await createPostMutation.mutateAsync({
        author: userProfile as UserDocument,
        input: {
          content: content.trim(),
          mediaUrls: imageUrl ? [imageUrl] : undefined,
          mediaType: imageUrl ? 'image' : undefined,
          isAnonymous,
          visibility: 'public',
        },
      });
      
      // Close modal on success
      router.back();
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert(
        t('common.error'),
        t('addPost.submitError')
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  
  /**
   * Handle close/cancel
   */
  const handleClose = () => {
    if (content.trim() || selectedImage) {
      Alert.alert(
        t('addPost.discardTitle'),
        t('addPost.discardMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('addPost.discard'), style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };
  
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            { borderBottomColor: colors.neutral[6] },
          ]}
        >
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <IconSymbol name="xmark" size={24} color={colors.neutral[12]} />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleSubmit}
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
        
        <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
          {/* Author Info */}
          <View style={styles.authorRow}>
            <Avatar
              src={isAnonymous ? undefined : userProfile?.avatar}
              size={48}
            />
            <View style={styles.authorInfo}>
              <Text style={[styles.authorUsername, { color: colors.neutral[9] }]}>
                @{isAnonymous ? t('common.anonymousUsername') : (userProfile?.username || t('common.user'))}
              </Text>
            </View>
          </View>
          
          {/* Content Input */}
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
            onChangeText={setContent}
            autoFocus
          />
          
          {/* Selected Image Preview */}
          {selectedImage && (
            <View style={styles.imagePreviewContainer}>
              <Image
                source={{ uri: selectedImage }}
                style={styles.imagePreview}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={[styles.removeImageButton, { backgroundColor: colors.neutral[1] }]}
                onPress={handleRemoveImage}
              >
                <IconSymbol name="xmark.circle.fill" size={24} color={colors.neutral[12]} />
              </TouchableOpacity>
            </View>
          )}
          
          {/* Anonymous Toggle */}
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
              onValueChange={setIsAnonymous}
              trackColor={{ false: colors.neutral[6], true: colors.orange[9] }}
              thumbColor="#fff"
            />
          </View>
          
          {isAnonymous && (
            <Text style={[styles.anonymousNote, { color: colors.neutral[9] }]}>
              {t('addPost.anonymousNote')}
            </Text>
          )}
        </ScrollView>
        
        {/* Bottom Toolbar */}
        <View
          style={[
            styles.toolbar,
            { borderTopColor: colors.neutral[6], backgroundColor: colors.background },
          ]}
        >
          <View style={styles.toolbarActions}>
            <TouchableOpacity
              onPress={handlePickImage}
              style={styles.toolbarButton}
              disabled={isSubmitting}
            >
              <IconSymbol
                name="photo"
                size={24}
                color={selectedImage ? colors.orange[9] : colors.neutral[9]}
              />
            </TouchableOpacity>
          </View>
          
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
            {remainingChars}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
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
  closeButton: {
    padding: 4,
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
  scrollView: {
    flex: 1,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  authorInfo: {
    marginLeft: 12,
  },
  authorName: {
    ...applyFont({
      fontSize: 16,
      fontWeight: '600',
    }),
  },
  authorUsername: {
    ...applyFont({
      fontSize: 14,
    }),
  },
  contentInput: {
    ...applyFont({
      fontSize: 18,
    }),
    lineHeight: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  imagePreviewContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 12,
    padding: 4,
  },
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
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  toolbarActions: {
    flexDirection: 'row',
    gap: 16,
  },
  toolbarButton: {
    padding: 4,
  },
  charCount: {
    ...applyFont({
      fontSize: 14,
      fontWeight: '500',
    }),
  },
});
