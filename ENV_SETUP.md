# Environment Variables Setup Guide

## Overview

This app uses environment variables for Firebase configuration. For **local builds and archives**, environment variables from `.env` files work automatically.

## How It Works

- ✅ **Local development & builds**: `.env` file works automatically with `EXPO_PUBLIC_*` prefix
- ✅ **iOS Archive (Xcode)**: Environment variables from `.env` are embedded during build
- ✅ **Android Build (Gradle)**: Environment variables from `.env` are embedded during build

## Setup Steps

1. **Create a `.env` file** in the project root (if you don't have one):
   ```env
   EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=iyte-2b16f.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=iyte-2b16f
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=iyte-2b16f.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
   ```

2. **The `.env` file is already gitignored** (safe - won't be committed)

3. **Build your app:**
   ```bash
   # iOS
   npx expo prebuild --clean
   npx expo run:ios --configuration Release
   # Then archive in Xcode
   
   # Android
   npx expo prebuild --clean
   npx expo run:android --variant release
   ```

## How Environment Variables Are Loaded

1. **During development**: Expo automatically loads `.env` files
2. **During build**: `app.config.js` reads `process.env.EXPO_PUBLIC_*` variables
3. **In your code**: Access via `process.env.EXPO_PUBLIC_*` (already set up in `firebase.ts`)

## Verification

After setting up environment variables, verify they work:

1. **Check if variables are loaded:**
   ```javascript
   // In your code (temporarily for testing)
   console.log('API Key:', process.env.EXPO_PUBLIC_FIREBASE_API_KEY);
   ```

2. **Test the built app:**
   - Build and run the app
   - Ensure Firebase connects correctly
   - Check that authentication and Firestore work

## Important Notes

- ✅ Variables prefixed with `EXPO_PUBLIC_` are embedded in the JavaScript bundle at build time
- ✅ They are available in client-side code (but visible in the bundle - this is normal for Firebase config)
- ⚠️ Never commit `.env` files with real values to git (already in `.gitignore`)
- ✅ The `app.config.js` file automatically uses environment variables from `.env`

## Current Fallback Values

The `firebase.ts` config file has fallback values (like `'iyte-2b16f.firebaseapp.com'`), but you should set proper environment variables in your `.env` file for production builds to ensure everything works correctly.

