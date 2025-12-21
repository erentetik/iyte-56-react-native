/**
 * Firebase Analytics Service
 * 
 * Provides analytics tracking functions for the app
 */

import analytics from '@react-native-firebase/analytics';
import { Platform } from 'react-native';

/**
 * Initialize Firebase Analytics
 * Should be called once when the app starts
 */
export async function initializeAnalytics(): Promise<void> {
  try {
    // Enable analytics collection (enabled by default, but we can explicitly set it)
    await analytics().setAnalyticsCollectionEnabled(true);
    console.log('[Analytics] Firebase Analytics initialized');
  } catch (error) {
    console.error('[Analytics] Failed to initialize:', error);
  }
}

/**
 * Log a custom event
 */
export async function logEvent(
  eventName: string,
  parameters?: { [key: string]: any }
): Promise<void> {
  try {
    await analytics().logEvent(eventName, parameters);
    if (__DEV__) {
      console.log(`[Analytics] Event: ${eventName}`, parameters);
    }
  } catch (error) {
    console.error(`[Analytics] Failed to log event ${eventName}:`, error);
  }
}

/**
 * Set user properties
 */
export async function setUserProperty(name: string, value: string | null): Promise<void> {
  try {
    await analytics().setUserProperty(name, value);
    if (__DEV__) {
      console.log(`[Analytics] User property set: ${name} = ${value}`);
    }
  } catch (error) {
    console.error(`[Analytics] Failed to set user property ${name}:`, error);
  }
}

/**
 * Set user ID for analytics
 */
export async function setUserId(userId: string | null): Promise<void> {
  try {
    await analytics().setUserId(userId);
    if (__DEV__) {
      console.log(`[Analytics] User ID set: ${userId}`);
    }
  } catch (error) {
    console.error('[Analytics] Failed to set user ID:', error);
  }
}

/**
 * Reset analytics data (useful for logout)
 */
export async function resetAnalytics(): Promise<void> {
  try {
    await analytics().resetAnalyticsData();
    if (__DEV__) {
      console.log('[Analytics] Analytics data reset');
    }
  } catch (error) {
    console.error('[Analytics] Failed to reset analytics:', error);
  }
}

/**
 * Set current screen name
 */
export async function setCurrentScreen(screenName: string, screenClass?: string): Promise<void> {
  try {
    await analytics().logScreenView({
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });
    if (__DEV__) {
      console.log(`[Analytics] Screen: ${screenName}`);
    }
  } catch (error) {
    console.error(`[Analytics] Failed to set screen ${screenName}:`, error);
  }
}

// ============================================================================
// Predefined Event Helpers
// ============================================================================

/**
 * Track user login
 */
export async function logLogin(method: string): Promise<void> {
  await logEvent('login', { method });
}

/**
 * Track user signup
 */
export async function logSignUp(method: string): Promise<void> {
  await logEvent('sign_up', { method });
}

/**
 * Track post creation
 */
export async function logPostCreated(hasImage: boolean, isAnonymous: boolean): Promise<void> {
  await logEvent('post_created', {
    has_image: hasImage,
    is_anonymous: isAnonymous,
  });
}

/**
 * Track post like
 */
export async function logPostLiked(postId: string): Promise<void> {
  await logEvent('post_liked', { post_id: postId });
}

/**
 * Track post share
 */
export async function logPostShared(postId: string, method: string): Promise<void> {
  await logEvent('share', {
    content_type: 'post',
    item_id: postId,
    method,
  });
}

/**
 * Track post comment
 */
export async function logPostCommented(postId: string): Promise<void> {
  await logEvent('post_commented', { post_id: postId });
}

/**
 * Track boost purchase/view
 */
export async function logBoostViewed(): Promise<void> {
  await logEvent('boost_viewed');
}

/**
 * Track boost purchase initiated
 */
export async function logBoostPurchaseInitiated(productId: string, price: number): Promise<void> {
  await logEvent('boost_purchase_initiated', {
    product_id: productId,
    value: price,
    currency: 'TRY',
  });
}

/**
 * Track boost purchase completed
 */
export async function logBoostPurchaseCompleted(productId: string, price: number): Promise<void> {
  await logEvent('purchase', {
    transaction_id: productId,
    value: price,
    currency: 'TRY',
    items: [{ item_id: productId, item_name: 'Post Boost' }],
  });
}

/**
 * Track image upload
 */
export async function logImageUploaded(success: boolean, error?: string): Promise<void> {
  await logEvent('image_uploaded', {
    success,
    ...(error && { error }),
  });
}

/**
 * Track search
 */
export async function logSearch(searchTerm: string): Promise<void> {
  await logEvent('search', { search_term: searchTerm });
}

/**
 * Track profile view
 */
export async function logProfileViewed(userId: string, isOwnProfile: boolean): Promise<void> {
  await logEvent('profile_viewed', {
    user_id: userId,
    is_own_profile: isOwnProfile,
  });
}

/**
 * Track settings change
 */
export async function logSettingsChanged(setting: string, value: any): Promise<void> {
  await logEvent('settings_changed', {
    setting,
    value: String(value),
  });
}

/**
 * Track app open
 */
export async function logAppOpen(): Promise<void> {
  await logEvent('app_open', {
    platform: Platform.OS,
  });
}

/**
 * Track onboarding completion
 */
export async function logOnboardingCompleted(): Promise<void> {
  await logEvent('onboarding_completed');
}

/**
 * Track error
 */
export async function logError(error: string, errorType?: string): Promise<void> {
  await logEvent('app_error', {
    error,
    error_type: errorType || 'unknown',
  });
}

/**
 * Track ad impression (view)
 */
export async function logAdImpression(adId: string, advertiserId?: string): Promise<void> {
  await logEvent('ad_impression', {
    ad_id: adId,
    ...(advertiserId && { advertiser_id: advertiserId }),
  });
}

/**
 * Track ad click
 */
export async function logAdClick(adId: string, advertiserId?: string): Promise<void> {
  await logEvent('ad_click', {
    ad_id: adId,
    ...(advertiserId && { advertiser_id: advertiserId }),
  });
}

