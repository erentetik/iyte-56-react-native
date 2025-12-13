import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';

// Firebase v10+ exports getReactNativePersistence from firebase/auth
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getReactNativePersistence } = require('firebase/auth');

// Your Firebase config
// Create a .env file with these values from your Firebase Console
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'your-api-key',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'iyte-2b16f.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'iyte-2b16f',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'iyte-2b16f.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 'your-sender-id',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || 'your-app-id',
};

// Initialize Firebase App
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Auth with AsyncStorage persistence for React Native
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} catch (error: any) {
  if (error.code === 'auth/already-initialized') {
    auth = getAuth(app);
  } else {
    throw error;
  }
}

// Initialize Firestore
const db: Firestore = getFirestore(app);

// Initialize Storage
const storage: FirebaseStorage = getStorage(app);

export { auth, db, storage };
export default app;
