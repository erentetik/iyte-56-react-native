import { auth } from '@/config/firebase';
import { createUserProfile, getUserProfile, updateUserProfile } from '@/services/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { User, UserCredential, isSignInWithEmailLink, onAuthStateChanged, sendSignInLinkToEmail, signInWithEmailLink } from 'firebase/auth';
import React, { ReactNode, createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  sendSignInLink: (email: string) => Promise<void>;
  signInWithLink: (email: string, emailLink: string) => Promise<UserCredential>;
  signOut: () => Promise<void>;
  checkEmailLink: (url: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const EMAIL_LINK_KEY = 'emailForSignIn';
const USER_ID_KEY = 'userId';
const PENDING_EMAIL_LINK_KEY = 'pendingEmailLink';

/**
 * Extract the actual Firebase action URL from nested redirect URLs
 * Firebase Hosting wraps the action URL in redirect URLs, so we need to unwrap it
 */
function extractFirebaseActionUrl(url: string): string {
  try {
    console.log('extractFirebaseActionUrl: Input URL:', url.substring(0, 150));
    
    // First, check if this is a deep link URL (iyte56://...)
    // If so, we need to extract the link parameter first
    if (url.startsWith('iyte56://') && url.includes('link=')) {
      // Extract the link parameter using regex to preserve the full URL
      // Use (.+) to capture everything after link= (the value is URL-encoded)
      const linkMatch = url.match(/[?&]link=(.+)/);
      if (linkMatch && linkMatch[1]) {
        try {
          const extractedLink = decodeURIComponent(linkMatch[1]);
          console.log('extractFirebaseActionUrl: Extracted from deep link:', extractedLink.substring(0, 150));
          
          // Check if this is a valid Firebase action URL
          if (extractedLink.includes('__/auth/action') && extractedLink.includes('oobCode')) {
            console.log('extractFirebaseActionUrl: Valid Firebase action URL found');
            return extractedLink;
          }
          
          // Continue processing with extracted link
          return extractFirebaseActionUrl(extractedLink);
        } catch (e) {
          console.log('extractFirebaseActionUrl: Failed to decode deep link param');
        }
      }
    }
    
    let currentUrl = url;
    let maxIterations = 10;
    let iterations = 0;
    
    while (iterations < maxIterations) {
      iterations++;
      
      // Decode the URL
      let decodedUrl = currentUrl;
      try {
        for (let i = 0; i < 3; i++) {
          const prevDecoded = decodedUrl;
          decodedUrl = decodeURIComponent(decodedUrl);
          if (prevDecoded === decodedUrl) break;
        }
      } catch (e) {
        decodedUrl = currentUrl;
      }
      
      console.log(`extractFirebaseActionUrl: Iteration ${iterations}, decoded:`, decodedUrl.substring(0, 100));
      
      // Check if it's a Firebase action URL with oobCode (the key parameter)
      if (decodedUrl.includes('__/auth/action') && decodedUrl.includes('oobCode') && !decodedUrl.includes('__/auth/links')) {
        console.log('extractFirebaseActionUrl: Found valid action URL with oobCode');
        return decodedUrl;
      }
      
      // If URL contains link= parameter, extract it
      if (decodedUrl.includes('link=')) {
        // Use regex to capture the full link parameter value
        const linkMatch = decodedUrl.match(/[?&]link=(.+?)(?:&(?!mode|oobCode|apiKey|continueUrl|lang)|$)/);
        if (linkMatch && linkMatch[1]) {
          try {
            currentUrl = decodeURIComponent(linkMatch[1]);
            console.log('extractFirebaseActionUrl: Extracted link param');
            continue;
          } catch (e) {
            currentUrl = linkMatch[1];
            continue;
          }
        }
        
        // Fallback: try URL parsing
        try {
          const urlObj = new URL(decodedUrl);
          const linkParam = urlObj.searchParams.get('link');
          if (linkParam) {
            currentUrl = linkParam;
            continue;
          }
        } catch (e) {
          // URL parsing failed
        }
      }
      
      // If no more extraction possible
      if (currentUrl === decodedUrl) {
        break;
      }
      
      currentUrl = decodedUrl;
    }
    
    // Final decode and return
    try {
      const finalUrl = decodeURIComponent(currentUrl);
      console.log('extractFirebaseActionUrl: Final URL:', finalUrl.substring(0, 150));
      return finalUrl;
    } catch {
      return currentUrl;
    }
  } catch (error) {
    console.error('Error extracting Firebase action URL:', error);
    return url;
  }
}

/**
 * Ensure user document exists in Firestore
 * Creates a new user document if it doesn't exist
 */
async function ensureUserDocument(user: User): Promise<void> {
  try {
    const userId = user.uid;
    const existingUser = await getUserProfile(userId);
    
    if (!existingUser) {
      // Create new user document with necessary values
      // Only include fields that have values (Firestore doesn't accept undefined)
      const userData: {
        email: string;
        displayName?: string;
        username?: string;
        avatar?: string;
        bio?: string;
      } = {
        email: user.email || '',
      };
      
      if (user.displayName) {
        userData.displayName = user.displayName;
      }
      if (user.email) {
        userData.username = user.email.split('@')[0];
      }
      if (user.photoURL) {
        userData.avatar = user.photoURL;
      }
      
      await createUserProfile(userId, userData);
      console.log('User document created in Firestore:', userId);
    } else {
      // User exists, but update any changed fields (email, displayName, avatar)
      // Only update if values have changed to avoid unnecessary writes
      const updates: Partial<typeof existingUser> = {};
      
      if (user.email && user.email !== existingUser.email) {
        updates.email = user.email;
      }
      if (user.displayName && user.displayName !== existingUser.displayName) {
        updates.displayName = user.displayName;
      }
      if (user.photoURL && user.photoURL !== existingUser.avatar) {
        updates.avatar = user.photoURL;
      }
      
      if (Object.keys(updates).length > 0) {
        await updateUserProfile(userId, updates);
        console.log('User document updated in Firestore:', userId);
      } else {
        console.log('User document already exists and is up to date:', userId);
      }
    }
  } catch (error) {
    console.error('Error ensuring user document:', error);
    // Don't throw - we don't want to block sign-in if Firestore fails
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Handle deep link sign in
  const handleDeepLink = async (url: string) => {
    console.log('Handling deep link:', url);
    
    // Extract the actual Firebase action URL from nested redirect URLs
    const actualActionUrl = extractFirebaseActionUrl(url);
    
    console.log('handleDeepLink: Extracted URL:', actualActionUrl.substring(0, 150));
    console.log('handleDeepLink: Contains oobCode:', actualActionUrl.includes('oobCode'));
    
    // Store the extracted URL for the verify screen to use
    // This is needed because Expo Router truncates URL parameters
    if (actualActionUrl.includes('oobCode')) {
      await AsyncStorage.setItem(PENDING_EMAIL_LINK_KEY, actualActionUrl);
      console.log('handleDeepLink: Stored pending email link');
    }
    
    // Check if this is a sign-in link
    if (isSignInWithEmailLink(auth, actualActionUrl)) {
      try {
        // Get saved email
        const email = await AsyncStorage.getItem(EMAIL_LINK_KEY);
        
        if (email) {
          console.log('Auto signing in with email:', email);
          const userCredential = await signInWithEmailLink(auth, email, actualActionUrl);
          await AsyncStorage.removeItem(EMAIL_LINK_KEY);
          await AsyncStorage.removeItem(PENDING_EMAIL_LINK_KEY);
          console.log('Sign in successful!');
          
          // Ensure user document exists in Firestore
          if (userCredential.user) {
            await ensureUserDocument(userCredential.user);
            // Save userId to AsyncStorage
            await AsyncStorage.setItem(USER_ID_KEY, userCredential.user.uid);
          }
        } else {
          console.log('No saved email found for auto sign-in');
        }
      } catch (error) {
        console.error('Error auto signing in:', error);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
      
      // When user signs in, ensure their document exists in Firestore
      if (user) {
        await ensureUserDocument(user);
        // Save userId to AsyncStorage
        await AsyncStorage.setItem(USER_ID_KEY, user.uid);
      } else {
        // Clear userId when user signs out
        await AsyncStorage.removeItem(USER_ID_KEY);
      }
    });

    return unsubscribe;
  }, []);

  // Listen for deep links
  useEffect(() => {
    // Handle initial URL (app opened via link)
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        await handleDeepLink(initialUrl);
      }
    };

    handleInitialURL();

    // Listen for URL events while app is open
    const subscription = Linking.addEventListener('url', async (event) => {
      await handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const sendSignInLink = async (email: string) => {
    try {
      const actionCodeSettings = {
        // URL that redirects to web, which then redirects to app
        // Note: Firebase will redirect here after processing the action
        // The actual Firebase action URL needs to be captured from the initial redirect
        url: `https://iyte-2b16f.firebaseapp.com/auth/verify?email=${encodeURIComponent(email)}`,
        handleCodeInApp: true,
        iOS: {
          bundleId: 'com.erentetik.iyte56',
        },
        android: {
          packageName: 'com.erentetik.iyte56',
          installApp: false,
          minimumVersion: '12',
        },
      };

      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      // Save email for later use
      await AsyncStorage.setItem(EMAIL_LINK_KEY, email);
    } catch (error) {
      console.error('Error sending sign in link:', error);
      throw error;
    }
  };

  const signInWithLink = async (email: string, emailLink: string) => {
    try {
      console.log('signInWithLink: Original link:', emailLink);
      
      // First, try the original link as-is
      let actionUrl = emailLink;
      let isValidLink = isSignInWithEmailLink(auth, emailLink);
      
      console.log('signInWithLink: Original link is valid:', isValidLink);
      
      // If original link is not valid, try extracting
      if (!isValidLink) {
        const extractedUrl = extractFirebaseActionUrl(emailLink);
        console.log('signInWithLink: Extracted action URL:', extractedUrl);
        
        // Check if extracted URL is valid
        if (extractedUrl !== emailLink && isSignInWithEmailLink(auth, extractedUrl)) {
          actionUrl = extractedUrl;
          isValidLink = true;
          console.log('signInWithLink: Extracted URL is valid');
        }
      }
      
      // Also try decoding the URL once more
      if (!isValidLink) {
        try {
          const decodedUrl = decodeURIComponent(actionUrl);
          if (decodedUrl !== actionUrl && isSignInWithEmailLink(auth, decodedUrl)) {
            actionUrl = decodedUrl;
            isValidLink = true;
            console.log('signInWithLink: Decoded URL is valid');
          }
        } catch (e) {
          console.log('signInWithLink: Could not decode URL further');
        }
      }
      
      if (isValidLink) {
        console.log('signInWithLink: Attempting sign in with URL:', actionUrl);
        const result = await signInWithEmailLink(auth, email, actionUrl);
        console.log('signInWithLink: Sign in successful');
        
        // Clear the email from storage
        await AsyncStorage.removeItem(EMAIL_LINK_KEY);
        
        // Ensure user document exists in Firestore
        if (result.user) {
          await ensureUserDocument(result.user);
          // Save userId to AsyncStorage
          await AsyncStorage.setItem(USER_ID_KEY, result.user.uid);
        }
        
        return result;
      } else {
        console.error('signInWithLink: Link validation failed for all attempts');
        console.error('signInWithLink: Final URL attempted:', actionUrl);
        throw new Error('Invalid email link');
      }
    } catch (error: any) {
      console.error('Error signing in with link:', error);
      // If it's already our custom error, throw it as-is
      if (error.message === 'Invalid email link') {
      throw error;
      }
      // Otherwise, wrap Firebase errors
      throw new Error(error.message || 'Failed to sign in with email link');
    }
  };

  const checkEmailLink = async (url: string): Promise<boolean> => {
    return isSignInWithEmailLink(auth, url);
  };

  const signOut = async () => {
    try {
      await auth.signOut();
      await AsyncStorage.removeItem(EMAIL_LINK_KEY);
      await AsyncStorage.removeItem(USER_ID_KEY);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    sendSignInLink,
    signInWithLink,
    signOut,
    checkEmailLink,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
