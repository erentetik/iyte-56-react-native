import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

// Prevent the native splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { WarningProvider, useWarning } from '@/contexts/WarningContext';
import { queryClient } from '@/hooks/queries/query-client';
import { useUser } from '@/hooks/queries/use-user';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { getExpoPushToken, markNotificationPermissionAsked, saveFCMToken } from '@/services/notifications';
import { getPendingWarningId, getWarningText } from '@/services/warnings';

const ONBOARDING_KEY = 'isOnboardingViewed';

function SplashOverlay() {
  const colors = useThemeColors();
  
  return (
    <View style={[styles.splashOverlay, { backgroundColor: colors.background }]}>
      <Image
        source={require('@/assets/app_logo.png')}
        style={styles.logo}
        contentFit="contain"
      />
      <ActivityIndicator
        size="large"
        color={colors.orange[9]}
        style={styles.loader}
      />
    </View>
  );
}

function RootLayoutNav() {
  const { isDark } = useTheme();
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const hasNavigated = useRef(false);
  
  // Fetch user document during splash if user is authenticated
  const { data: userProfile } = useUser(user?.uid);
  const { setPendingWarning } = useWarning();
  
  // Check for pending warnings during splash
  useEffect(() => {
    const checkWarnings = async () => {
      if (!userProfile || !user?.uid) return;
      
      try {
        const pendingWarningId = getPendingWarningId(
          userProfile.warningCount,
          userProfile.warningShowed
        );
        
        if (pendingWarningId) {
          const warningText = await getWarningText(user?.uid, pendingWarningId);
          if (warningText) {
            setPendingWarning(warningText);
          }
        }
      } catch (error) {
        console.error('Error checking warnings:', error);
      }
    };
    
    if (userProfile) {
      checkWarnings();
    }
  }, [userProfile, user?.uid, setPendingWarning]);
  
  // Request notification permission and save FCM token
  useEffect(() => {
    const setupNotifications = async () => {
      if (!userProfile || !user?.uid) return;
      
      // Check if we've already asked for permission
      if (userProfile.notificationPermissionAsked) {
        // If permission was already asked, just try to get/update token
        const token = await getExpoPushToken();
        if (token && token !== userProfile.fcmToken) {
          await saveFCMToken(user?.uid, token);
        }
        return;
      }
      
      // Ask for permission
      const token = await getExpoPushToken();
      if (token) {
        // User granted permission - save token and mark as asked
        await Promise.all([
          saveFCMToken(user?.uid, token),
          markNotificationPermissionAsked(user?.uid),
        ]);
      } else {
        // User denied permission - just mark as asked so we don't ask again
        await markNotificationPermissionAsked(user?.uid);
      }
    };
    
    if (userProfile) {
      setupNotifications();
    }
  }, [userProfile, user?.uid]);

  // Check onboarding status
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const viewed = await AsyncStorage.getItem(ONBOARDING_KEY);
        setHasSeenOnboarding(viewed === 'true');
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setHasSeenOnboarding(false);
      } finally {
        setOnboardingChecked(true);
      }
    };

    checkOnboarding();
  }, []);

  // Handle initial navigation after auth determined + onboarding checked
  useEffect(() => {
    if (loading || !onboardingChecked || hasNavigated.current) return;
    
    // Wait for userProfile to load if user is authenticated
    if (user && !userProfile) return;

    // Hide native splash screen immediately
    SplashScreen.hideAsync();

    // Navigate immediately (no delay)
    hasNavigated.current = true;
    
    if (!hasSeenOnboarding) {
      // First time user - show onboarding
      router.replace('/onboarding');
    } else if (user) {
      // Check if user has completed profile setup
      const needsSetup = !userProfile?.username || !userProfile?.displayName;
      if (needsSetup) {
        router.replace('/(auth)/setup');
      } else {
        router.replace('/(tabs)');
      }
    } else {
      router.replace('/(auth)/login');
    }
    
    // Hide custom splash overlay after navigation
    setTimeout(() => {
      setShowSplash(false);
    }, 100);
  }, [loading, user, userProfile, router, onboardingChecked, hasSeenOnboarding]);

  // Protect routes after initial navigation (for subsequent auth changes)
  useEffect(() => {
    if (showSplash || loading || !onboardingChecked) return;

    const currentSegment = segments[0];
    const inAuthGroup = currentSegment === '(auth)';
    const inTabs = currentSegment === '(tabs)';
    const inOnboarding = currentSegment === 'onboarding';
    const inSetup = (segments as readonly string[]).includes('setup');

    // Don't redirect if in onboarding or setup
    if (inOnboarding || inSetup) return;

    if (user) {
      // Check if user needs to complete setup
      const needsSetup = !userProfile?.username || !userProfile?.displayName;
      if (needsSetup && !inAuthGroup) {
        router.replace('/(auth)/setup');
      } else if (!needsSetup && inAuthGroup && !inSetup) {
        router.replace('/(tabs)');
      }
    } else if (!user && inTabs) {
      router.replace('/(auth)/login');
    }
  }, [user, userProfile, loading, segments, showSplash, onboardingChecked]);

  return (
    <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <View style={styles.container}>
        <Slot />
        {showSplash && <SplashOverlay />}
      </View>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <WarningProvider>
            <AuthProvider>
              <RootLayoutNav />
            </AuthProvider>
          </WarningProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 32,
  },
  loader: {
    marginTop: 24,
  },
});
