import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useThemeColors } from '@/hooks/use-theme-colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const EMAIL_LINK_KEY = 'emailForSignIn';
const PENDING_EMAIL_LINK_KEY = 'pendingEmailLink';

export function VerifyScreen() {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const { signInWithLink } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleEmailLink = async () => {
      try {
        // Get the email from storage
        const email = await AsyncStorage.getItem(EMAIL_LINK_KEY);
        
        if (!email) {
          setStatus('error');
          setErrorMessage(t('auth.verify.emailNotFound'));
          return;
        }

        let emailLink = '';
        
        // Priority 1: Check for pending email link stored by AuthContext
        // This is the most reliable source as it's extracted before Expo Router parsing
        const pendingEmailLink = await AsyncStorage.getItem(PENDING_EMAIL_LINK_KEY);
        if (pendingEmailLink && pendingEmailLink.includes('oobCode')) {
          emailLink = pendingEmailLink;
          console.log('Verify screen: Using pending email link from storage');
          console.log('Verify screen: Contains oobCode:', emailLink.includes('oobCode'));
        }
        
        // Priority 2: Get the initial URL (raw, before Expo Router parsing)
        if (!emailLink) {
          const initialUrl = await Linking.getInitialURL();
          console.log('Verify screen: initialUrl:', initialUrl);
          
          if (initialUrl) {
            // Find the link= parameter in the raw URL
            const linkMatch = initialUrl.match(/[?&]link=(.+)/);
            if (linkMatch && linkMatch[1]) {
              try {
                emailLink = decodeURIComponent(linkMatch[1]);
                console.log('Verify screen: Extracted link from raw URL');
                console.log('Verify screen: Contains oobCode:', emailLink.includes('oobCode'));
              } catch (e) {
                try {
                  emailLink = decodeURIComponent(decodeURIComponent(linkMatch[1]));
                } catch (e2) {
                  emailLink = linkMatch[1];
                }
              }
            }
            
            // If no link param found, check if the URL itself is a Firebase action URL
            if (!emailLink && initialUrl.includes('__/auth/action')) {
              emailLink = initialUrl;
              console.log('Verify screen: Using initialUrl as emailLink');
            }
          }
        }
        
        // Priority 3: Fallback to params.link (may be truncated)
        if (!emailLink && params.link) {
          emailLink = params.link as string;
          console.log('Verify screen: Fallback to params.link:', emailLink.substring(0, 100));
        }
        
        if (!emailLink) {
          console.error('Verify screen: No email link found');
          setStatus('error');
          setErrorMessage(t('auth.verify.invalidLink'));
          return;
        }

        console.log('Verify screen: Final emailLink length:', emailLink.length);
        console.log('Verify screen: emailLink contains oobCode:', emailLink.includes('oobCode'));

        // Sign in with the email link
        await signInWithLink(email, emailLink);
        
        // Clear the pending email link
        await AsyncStorage.removeItem(PENDING_EMAIL_LINK_KEY);
        
        setStatus('success');
        
        // Redirect to tabs after a short delay
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 1500);
      } catch (error: any) {
        setStatus('error');
        setErrorMessage(error.message || t('auth.verify.signInError'));
      }
    };

    handleEmailLink();
  }, [params.link, t]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {status === 'verifying' && (
          <>
            <ActivityIndicator size="large" color={colors.orange[9]} />
            <Text style={[styles.text, { color: colors.neutral[12] }]}>{t('auth.verify.verifying')}</Text>
          </>
        )}
        
        {status === 'success' && (
          <>
            <Text style={[styles.successIcon, { color: colors.orange[9] }]}>✓</Text>
            <Text style={[styles.text, { color: colors.neutral[12] }]}>{t('auth.verify.success')}</Text>
            <Text style={[styles.subtext, { color: colors.neutral[9] }]}>{t('auth.verify.redirecting')}</Text>
          </>
        )}
        
        {status === 'error' && (
          <>
            <Text style={[styles.errorIcon, { color: '#f91880' }]}>✕</Text>
            <Text style={[styles.text, { color: colors.neutral[12] }]}>{t('auth.verify.error')}</Text>
            <Text style={[styles.errorText, { color: colors.neutral[9] }]}>{errorMessage}</Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  text: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  successIcon: {
    fontSize: 64,
    fontWeight: 'bold',
  },
  errorIcon: {
    fontSize: 64,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});

