import { Button } from '@/components/ui/button';
import { IS_DEV } from '@/config/dev';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Email domain based on dev mode
const EMAIL_DOMAIN = IS_DEV ? '@gmail.com' : '@std.iyte.edu.tr';

export function LoginScreen() {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const { sendSignInLink } = useAuth();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  // Construct full email from username + domain
  const getFullEmail = () => `${username.trim().toLowerCase()}${EMAIL_DOMAIN}`;

  const handleSendLink = async () => {
    if (!username.trim()) {
      Alert.alert(t('auth.login.error'), t('auth.login.enterUsername'));
      return;
    }

    // Validate username (no special characters except . and _)
    const usernameRegex = /^[a-zA-Z0-9._]+$/;
    if (!usernameRegex.test(username.trim())) {
      Alert.alert(t('auth.login.error'), t('auth.login.invalidUsername'));
      return;
    }

    const fullEmail = getFullEmail();

    try {
      setLoading(true);
      await sendSignInLink(fullEmail);
      Alert.alert(
        t('auth.login.linkSent'),
        `${t('auth.login.linkSentMessage')}\n\n${fullEmail}`,
        [{ text: t('auth.login.ok') }]
      );
    } catch (error: any) {
      Alert.alert(t('auth.login.error'), error.message || t('auth.login.sendError'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEmail = async () => {
    const url = 'https://std.iyte.edu.tr';
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert(t('common.error'), `Cannot open ${url}`);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Text style={[styles.logo, { color: colors.orange[9] }]}>IYTE56</Text>
          </View>
          <Text style={[styles.title, { color: colors.neutral[12] }]}>{t('auth.login.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.neutral[9] }]}>
            {t('auth.login.subtitle')}
          </Text>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.neutral[12] }]}>{t('auth.login.email')}</Text>
              <View style={[styles.emailInputContainer, { borderColor: colors.neutral[6], backgroundColor: colors.neutral[3] }]}>
                <TextInput
                  style={[styles.usernameInput, { color: colors.neutral[12] }]}
                  placeholder={IS_DEV ? 'example' : 'johndoe'}
                  placeholderTextColor={colors.neutral[9]}
                  value={username}
                  onChangeText={(text) => setUsername(text.replace('@', ''))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={[styles.domainText, { color: colors.neutral[12] }]}>
                  {EMAIL_DOMAIN}
                </Text>
              </View>
              <Text style={[styles.hint, { color: colors.neutral[8] }]}>
                {IS_DEV 
                  ? t('auth.login.devModeHint')
                  : t('auth.login.studentEmailHint')
                }
              </Text>
            </View>

            <Button
              variant="default"
              size="lg"
              onPress={handleSendLink}
              disabled={loading || !username.trim()}
              style={styles.button}
            >
              {loading ? t('auth.login.sending') : t('auth.login.sendLink')}
            </Button>

            <TouchableOpacity
              onPress={handleOpenEmail}
              style={[styles.emailButton, { borderColor: colors.neutral[6] }]}
            >
              <Text style={[styles.emailButtonText, { color: colors.neutral[12] }]}>
                {t('settings.checkEmail')}
              </Text>
            </TouchableOpacity>
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
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    fontSize: 36,
    fontWeight: '800',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 32,
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
  emailInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  usernameInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  domainText: {
    fontSize: 16,
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    marginTop: 8,
    lineHeight: 16,
  },
  button: {
    marginTop: 8,
  },
  emailButton: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

