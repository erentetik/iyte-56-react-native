/**
 * Setup Screen
 * 
 * First-time setup for new users to set their username.
 */

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { queryClient, queryKeys } from '@/hooks/queries/query-client';
import { useUser } from '@/hooks/queries/use-user';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { updateUser } from '@/services/users';
import { applyFont } from '@/utils/apply-fonts';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function SetupScreen() {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const { refetch } = useUser(user?.uid);
  
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  // Validate username format
  const validateUsername = (text: string): boolean => {
    const usernameRegex = /^[a-zA-Z0-9._]+$/;
    if (!usernameRegex.test(text)) {
      setUsernameError(t('auth.setup.invalidUsername'));
      return false;
    }
    if (text.length < 3) {
      setUsernameError(t('auth.setup.usernameTooShort'));
      return false;
    }
    if (text.length > 30) {
      setUsernameError(t('auth.setup.usernameTooLong'));
      return false;
    }
    setUsernameError('');
    return true;
  };

  const handleUsernameChange = (text: string) => {
    // Remove @ if user types it
    const cleaned = text.replace('@', '').toLowerCase();
    setUsername(cleaned);
    if (cleaned.length > 0) {
      validateUsername(cleaned);
    } else {
      setUsernameError('');
    }
  };

  const handleSubmit = async () => {
    if (!user?.uid) {
      Alert.alert(t('common.error'), t('auth.setup.notSignedIn'));
      return;
    }

    // Validate inputs
    if (!username.trim()) {
      Alert.alert(t('auth.setup.error'), t('auth.setup.usernameRequired'));
      return;
    }

    if (!validateUsername(username) || usernameError) {
      return;
    }

    try {
      setLoading(true);
      
      // Update user profile
      await updateUser(user.uid, {
        username: username.trim(),
      });

      // Invalidate and refetch user profile to get updated data
      await queryClient.invalidateQueries({
        queryKey: queryKeys.users.detail(user.uid),
      });
      await refetch();

      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert(
        t('auth.setup.error'),
        error.message === 'Username is already taken'
          ? t('auth.setup.usernameTaken')
          : error.message || t('auth.setup.updateError')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.logo, { color: colors.orange[9] }]}>IYTE56</Text>
            <Text style={[styles.title, { color: colors.neutral[12] }]}>
              {t('auth.setup.title')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.neutral[9] }]}>
              {t('auth.setup.subtitle')}
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.neutral[12] }]}>
                {t('auth.setup.username')}
              </Text>
              <View style={[styles.usernameContainer, { borderColor: colors.neutral[6], backgroundColor: colors.neutral[3] }]}>
                <Text style={[styles.atSymbol, { color: colors.neutral[9] }]}>@</Text>
                <TextInput
                  placeholder={t('auth.setup.usernamePlaceholder')}
                  placeholderTextColor={colors.neutral[9]}
                  value={username}
                  onChangeText={handleUsernameChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={30}
                  editable={!loading}
                  style={[styles.usernameInput, { color: colors.neutral[12] }]}
                />
              </View>
              {usernameError ? (
                <Text style={[styles.errorText, { color: colors.orange[9] }]}>
                  {usernameError}
                </Text>
              ) : (
                <Text style={[styles.hint, { color: colors.neutral[8] }]}>
                  {t('auth.setup.usernameHint')}
                </Text>
              )}
            </View>

            <Button
              variant="default"
              size="lg"
              onPress={handleSubmit}
              disabled={loading || !username.trim() || !!usernameError}
              style={styles.button}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                t('auth.setup.continue')
              )}
            </Button>
          </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    ...applyFont({
      fontSize: 36,
      fontWeight: '800',
    }),
    marginBottom: 24,
  },
  title: {
    ...applyFont({
      fontSize: 28,
      fontWeight: '700',
    }),
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    ...applyFont({
      fontSize: 15,
    }),
    lineHeight: 22,
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  atSymbol: {
    ...applyFont({
      fontSize: 16,
      fontWeight: '500',
    }),
    marginRight: 8,
  },
  usernameInput: {
    flex: 1,
    ...applyFont({
      fontSize: 16,
    }),
    height: '100%',
  },
  errorText: {
    ...applyFont({
      fontSize: 12,
    }),
    marginTop: 8,
    lineHeight: 16,
  },
  hint: {
    ...applyFont({
      fontSize: 12,
    }),
    marginTop: 8,
    lineHeight: 16,
  },
  button: {
    marginTop: 8,
  },
});

