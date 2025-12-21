/**
 * Expo App Configuration
 * 
 * This file loads environment variables from .env files automatically.
 * Environment variables prefixed with EXPO_PUBLIC_* are embedded into
 * the JavaScript bundle at build time.
 * 
 * For local builds and archives:
 * - Create a .env file in the project root with EXPO_PUBLIC_* variables
 * - The .env file is gitignored and won't be committed
 * - Variables are automatically available during build via process.env
 */

module.exports = {
  expo: {
    name: 'IYTE56',
    slug: 'iyte-56',
    version: '1.0.2',
    orientation: 'portrait',
    icon: './assets/app_logo.png',
    scheme: 'iyte56',
    deepLinking: {
      enabled: true,
    },
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.erentetik.iyte56',
      icon: './assets/app_logo.png',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
      // Required for FCM push notifications on iOS
      // The file should be in ios/ directory (or project root for Expo to copy it)
      // Expo will copy it to the correct location during prebuild
      googleServicesFile: './ios/GoogleService-Info.plist',
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/app_logo.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/app_logo.png',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: 'com.erentetik.iyte56',
      // For FCM to work, add google-services.json to project root
      // Then reference it here (Expo will copy it to android/app/ during build)
      // googleServicesFile: './google-services.json',
    },
    web: {
      output: 'static',
      favicon: './assets/app_logo.png',
    },
    plugins: [
      'expo-router',
      'expo-localization',
      [
        'expo-notifications',
        {
          icon: './assets/app_logo.png',
          color: '#ffffff',
          sounds: [],
          mode: 'production',
        },
      ],
    ],
    splash: {
      resizeMode: 'native',
      backgroundColor: '#ffffff',
    },
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      // Firebase config from environment variables
      // These are available via process.env.EXPO_PUBLIC_* in your code
      firebase: {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      },
    },
  },
};

