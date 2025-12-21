/**
 * Adapty Configuration
 * 
 * Adapty SDK for handling in-app purchases (IAP)
 * Used for popularity boost purchases
 */

// Dynamically import Adapty to handle cases where native module isn't available
let Adapty: any = null;
let adaptyLoadError: Error | null = null;

try {
  // Only import if available (native module may not be available in web or if not compiled)
  const adaptyModule = require('react-native-adapty');
  
  // The module exports 'adapty' as a named export (lowercase)
  // Check for both 'adapty' (named export) and default export patterns
  Adapty = adaptyModule?.adapty || adaptyModule?.default || adaptyModule;
  
  // Verify Adapty is actually available (not just an empty object)
  if (!Adapty) {
    throw new Error('Adapty module is null or undefined');
  }
  
  if (typeof Adapty !== 'object') {
    throw new Error(`Adapty module is not an object (got ${typeof Adapty})`);
  }
  
  if (typeof Adapty.activate !== 'function') {
    // Log available methods for debugging
    const availableMethods = Object.keys(Adapty).filter(
      key => typeof Adapty[key] === 'function'
    );
    console.warn('[Adapty] activate() not found. Available methods:', availableMethods);
    console.warn('[Adapty] Module keys:', Object.keys(adaptyModule || {}));
    throw new Error(
      `Adapty.activate is not a function. Available methods: ${availableMethods.join(', ')}`
    );
  }
  
  console.log('[Adapty] Successfully loaded and verified');
} catch (error) {
  adaptyLoadError = error as Error;
  console.warn('[Adapty] Load error:', error);
  // Adapty will remain null, and all functions will gracefully handle this
  // This is expected if:
  // 1. Running in Expo Go (doesn't support custom native modules)
  // 2. App hasn't been rebuilt after installing react-native-adapty
  // 3. Running on web platform
  // 4. Native module not properly linked
}

// Adapty API Key - should be set in environment variables
const ADAPTY_API_KEY = process.env.EXPO_PUBLIC_ADAPTY_API_KEY || '';

// Track activation state to prevent multiple activations
let isActivated = false;
let activationPromise: Promise<void> | null = null;

/**
 * Check if Adapty is available
 */
function isAdaptyAvailable(): boolean {
  return Adapty !== null && typeof Adapty === 'object' && typeof Adapty.activate === 'function';
}

/**
 * Initialize Adapty SDK
 * Should be called once when the app starts
 * Uses a singleton pattern to prevent multiple activations
 */
export async function initializeAdapty(): Promise<void> {
  // If already activated, return immediately
  if (isActivated) {
    return;
  }

  // If activation is in progress, wait for it
  if (activationPromise) {
    return activationPromise;
  }

  // Create activation promise
  activationPromise = (async () => {
    try {
      if (!isAdaptyAvailable()) {
        if (adaptyLoadError) {
          console.warn(
            '⚠️ Adapty native module not available. IAP features will not work.\n' +
            '   This is expected if:\n' +
            '   • Running in Expo Go (use development build instead)\n' +
            '   • App hasn\'t been rebuilt after installing react-native-adapty\n' +
            '   • Running on web platform\n' +
            '   To fix: Run "npx expo run:ios" or "npx expo run:android" to rebuild with native code.'
          );
        } else {
          console.warn('Adapty native module not available. IAP features will not work.');
        }
        return;
      }

      if (!ADAPTY_API_KEY) {
        console.warn('Adapty API key not found. IAP features will not work.');
        return;
      }

      // Use __ignoreActivationOnFastRefresh option to handle Fast Refresh in development
      // @ts-ignore - This is a valid option but may not be in types
      await Adapty.activate(ADAPTY_API_KEY, {
        __ignoreActivationOnFastRefresh: __DEV__,
      });
      
      isActivated = true;
      console.log('Adapty initialized successfully');
    } catch (error: any) {
      // Check if error is about already being activated
      if (error?.message?.includes('activateOnceError') || error?.message?.includes('already activated')) {
        console.log('Adapty already activated (likely due to Fast Refresh)');
        isActivated = true; // Mark as activated to prevent future attempts
      } else {
        console.error('Error initializing Adapty:', error);
        // Don't throw - allow app to continue without IAP
      }
    } finally {
      activationPromise = null;
    }
  })();

  return activationPromise;
}

/**
 * Identify user with Adapty
 * Associates the user's Adapty profile with their Firebase UID
 * 
 * @param userId Firebase Auth UID
 */
export async function identifyAdaptyUser(userId: string): Promise<void> {
  try {
    if (!isAdaptyAvailable()) {
      return;
    }

    if (!ADAPTY_API_KEY) {
      return;
    }

    await Adapty.identify(userId);
    console.log('Adapty user identified:', userId);
  } catch (error) {
    console.error('Error identifying Adapty user:', error);
  }
}

/**
 * Get Adapty paywall for a placement
 * 
 * @param placement Placement ID (e.g., 'popularity_boost')
 * @returns Paywall object or null
 */
export async function getPaywall(placement: string = 'popularity_boost') {
  try {
    if (!isAdaptyAvailable()) {
      return null;
    }

    if (!ADAPTY_API_KEY) {
      return null;
    }

    const paywall = await Adapty.getPaywall(placement);
    return paywall;
  } catch (error) {
    console.error('Error getting paywall:', error);
    return null;
  }
}

/**
 * Get products for a paywall
 * 
 * @param paywall Paywall object from getPaywall
 * @returns Array of products
 */
export async function getPaywallProducts(paywall: any) {
  try {
    if (!isAdaptyAvailable()) {
      return [];
    }

    if (!paywall || !ADAPTY_API_KEY) {
      return [];
    }

    const products = await Adapty.getPaywallProducts(paywall);
    return products;
  } catch (error) {
    console.error('Error getting paywall products:', error);
    return [];
  }
}

/**
 * Make a purchase
 * 
 * @param product Product to purchase
 * @returns Purchase result
 */
export async function makePurchase(product: any) {
  try {
    if (!isAdaptyAvailable()) {
      throw new Error('Adapty native module not available');
    }

    if (!ADAPTY_API_KEY) {
      throw new Error('Adapty not initialized');
    }

    const result = await Adapty.makePurchase(product);
    return result;
  } catch (error) {
    console.error('Error making purchase:', error);
    throw error;
  }
}

/**
 * Get user profile (subscription status)
 * 
 * @returns User profile with access levels
 */
export async function getProfile() {
  try {
    if (!isAdaptyAvailable()) {
      return null;
    }

    if (!ADAPTY_API_KEY) {
      return null;
    }

    const profile = await Adapty.getProfile();
    return profile;
  } catch (error) {
    console.error('Error getting profile:', error);
    return null;
  }
}

export default Adapty;

