import { Text } from '@/components/ui/text';
import { fonts } from '@/config/fonts';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { WarningProvider, useWarning } from '@/contexts/WarningContext';
import { queryClient } from '@/hooks/queries/query-client';
import { useUser } from '@/hooks/queries/use-user';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { getPendingWarningId, getWarningText } from '@/services/warnings';
import { applyFont } from '@/utils/apply-fonts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

// Prevent the native splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

const ONBOARDING_KEY = 'isOnboardingViewed';

function SplashOverlay() {
  const colors = useThemeColors();
  
  return (
    <View style={[styles.splashOverlay, { backgroundColor: colors.background }]}>
      <Text style={[styles.logo, { color: colors.orange[9] }]}>ORTALIK 56</Text>
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
  }, [user, userProfile, loading, segments, showSplash, onboardingChecked, router]);

  return (
    <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          fullScreenGestureEnabled: Platform.OS === 'ios',
          animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(auth)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen 
          name="edit-profile" 
          options={{ 
            gestureEnabled: true,
            fullScreenGestureEnabled: Platform.OS === 'ios',
          }} 
        />
        <Stack.Screen 
          name="settings" 
          options={{ 
            gestureEnabled: true,
            fullScreenGestureEnabled: Platform.OS === 'ios',
          }} 
        />
        <Stack.Screen 
          name="add-post" 
          options={{ 
            gestureEnabled: true,
            fullScreenGestureEnabled: Platform.OS === 'ios',
          }} 
        />
        <Stack.Screen 
          name="post/[postId]" 
          options={{ 
            gestureEnabled: true,
            fullScreenGestureEnabled: Platform.OS === 'ios',
          }} 
        />
      </Stack>
      {showSplash && <SplashOverlay />}
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fonts);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Fonts are loaded (or failed), we can hide splash screen
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
    </GestureHandlerRootView>
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
    ...applyFont({
      fontSize: 48,
      fontWeight: '800',
    }),
  },
  loader: {
    marginTop: 24,
  },
});
