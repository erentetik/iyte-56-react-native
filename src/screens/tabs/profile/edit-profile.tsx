/**
 * Edit Profile Screen
 * 
 * Allow users to edit their profile information.
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/hooks/queries/use-user';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { updateUser } from '@/services/users';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function EditProfileScreen() {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  
  const { data: userProfile, isLoading } = useUser(user?.uid);
  
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setUsername(userProfile.username || '');
      setBio(userProfile.bio || '');
    }
  }, [userProfile]);

  const handleSave = async () => {
    if (!user?.uid) return;
    
    setIsSaving(true);
    try {
      await updateUser(user.uid, {
        displayName: displayName.trim(),
        username: username.trim().toLowerCase(),
        bio: bio.trim(),
      });
      router.back();
    } catch (error) {
      Alert.alert(t('common.error'), t('editProfile.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = displayName.trim().length > 0 && username.trim().length > 0;

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.orange[9]} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="xmark" size={24} color={colors.neutral[12]} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.neutral[12] }]}>
            {t('editProfile.title')}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!canSave || isSaving}
            style={[
              styles.saveButton,
              { backgroundColor: canSave ? colors.orange[9] : colors.neutral[6] },
            ]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>{t('editProfile.save')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView}>
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.neutral[9] }]}>
                {t('editProfile.displayName')}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.neutral[2],
                    color: colors.neutral[12],
                    borderColor: colors.neutral[6],
                  },
                ]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder={t('editProfile.displayNamePlaceholder')}
                placeholderTextColor={colors.neutral[8]}
                maxLength={50}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.neutral[9] }]}>
                {t('editProfile.username')}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.neutral[2],
                    color: colors.neutral[12],
                    borderColor: colors.neutral[6],
                  },
                ]}
                value={username}
                onChangeText={setUsername}
                placeholder={t('editProfile.usernamePlaceholder')}
                placeholderTextColor={colors.neutral[8]}
                autoCapitalize="none"
                maxLength={30}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.neutral[9] }]}>
                {t('editProfile.bio')}
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.neutral[2],
                    color: colors.neutral[12],
                    borderColor: colors.neutral[6],
                  },
                ]}
                value={bio}
                onChangeText={setBio}
                placeholder={t('editProfile.bioPlaceholder')}
                placeholderTextColor={colors.neutral[8]}
                multiline
                maxLength={160}
                numberOfLines={4}
              />
              <Text style={[styles.charCount, { color: colors.neutral[8] }]}>
                {bio.length}/160
              </Text>
            </View>
          </View>
        </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 16,
    gap: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
});

