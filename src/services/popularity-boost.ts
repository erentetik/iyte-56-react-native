/**
 * Popularity Boost IAP Service
 * 
 * Handles in-app purchases for boosting post popularity scores.
 * This service integrates with the app's IAP system and Cloud Functions.
 */

import {
  getPaywall,
  getPaywallProducts,
  identifyAdaptyUser,
  makePurchase,
} from '@/config/adapty';
import { db } from '@/config/firebase';
import {
  IAP_PRODUCT_IDS,
  getBoostTierDisplayName,
  type BoostTier
} from '@/config/popularity-boost';
import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * Get current user count from Firestore
 * This is used to determine which boost tier values to show
 */
export async function getCurrentUserCount(): Promise<number> {
  try {
    // Note: Firestore doesn't have a direct count query in the client SDK
    // You may want to maintain a userCount field in a settings document
    // or use a Cloud Function to get the count
    // For now, we'll use a workaround by getting a sample and estimating
    const { collection, getDocs, query, limit } = await import('firebase/firestore');
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(query(usersRef, limit(1)));
    
    // This is a placeholder - you should maintain a userCount in a settings doc
    // or call a Cloud Function to get the actual count
    return 100; // Default to minimum tier
  } catch (error) {
    console.error('Error getting user count:', error);
    return 100; // Default to minimum tier on error
  }
}

/**
 * Get available boost tiers
 * Note: Actual boost values are calculated server-side based on user count
 */
export function getAvailableBoostTiers() {
  return {
    basic: {
      productId: IAP_PRODUCT_IDS.basic,
      tier: 'basic' as BoostTier,
      displayName: getBoostTierDisplayName('basic'),
    },
    premium: {
      productId: IAP_PRODUCT_IDS.premium,
      tier: 'premium' as BoostTier,
      displayName: getBoostTierDisplayName('premium'),
    },
    ultra: {
      productId: IAP_PRODUCT_IDS.ultra,
      tier: 'ultra' as BoostTier,
      displayName: getBoostTierDisplayName('ultra'),
    },
  };
}

/**
 * Apply popularity boost to a post after successful IAP purchase
 * 
 * @param postId ID of the post to boost
 * @param productId IAP product ID that was purchased
 * @param purchaseReceipt Purchase receipt for verification (optional)
 * @returns Result of the boost application
 */
export async function applyPopularityBoost(
  postId: string,
  productId: string,
  purchaseReceipt?: string
): Promise<{
  success: boolean;
  boostValue: number;
  tier: BoostTier;
  newScore: number;
  message: string;
}> {
  try {
    const functions = getFunctions();
    const applyBoost = httpsCallable(functions, 'applyPopularityBoost');

    const result = await applyBoost({
      postId,
      productId,
      purchaseReceipt, // Optional: for server-side receipt verification
    });

    return result.data as {
      success: boolean;
      boostValue: number;
      tier: BoostTier;
      newScore: number;
      message: string;
    };
  } catch (error: any) {
    console.error('Error applying popularity boost:', error);
    throw new Error(
      error.message || 'Failed to apply popularity boost. Please try again.'
    );
  }
}

/**
 * Get boost products from Adapty paywall
 * 
 * @param placement Placement ID (default: 'popularity_boost')
 * @returns Array of products with pricing and metadata
 */
export async function getBoostProducts(placement: string = 'popularity_boost') {
  try {
    const paywall = await getPaywall(placement);
    if (!paywall) {
      throw new Error('Paywall not found. Please configure it in Adapty dashboard.');
    }

    const products = await getPaywallProducts(paywall);
    return products;
  } catch (error: any) {
    console.error('Error getting boost products:', error);
    throw new Error(`Failed to load boost options: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Purchase and apply boost to a post using Adapty
 * 
 * This function:
 * 1. Gets the paywall and products from Adapty
 * 2. Initiates the purchase through Adapty
 * 3. Applies the boost via Cloud Function after successful purchase
 * 
 * @param postId ID of the post to boost
 * @param tier Boost tier to purchase (basic, premium, or ultra)
 * @param userId Firebase user ID (for Adapty identification)
 */
export async function purchaseAndApplyBoost(
  postId: string,
  tier: BoostTier,
  userId?: string
): Promise<{
  success: boolean;
  boostValue: number;
  tier: BoostTier;
  newScore: number;
  message: string;
}> {
  try {
    // Identify user with Adapty if userId provided
    if (userId) {
      await identifyAdaptyUser(userId);
    }

    // Get paywall and products
    const paywall = await getPaywall('popularity_boost');
    if (!paywall) {
      throw new Error('Boost paywall not found. Please configure it in Adapty dashboard.');
    }

    const products = await getPaywallProducts(paywall);
    
    // Find the product for the requested tier
    const productId = IAP_PRODUCT_IDS[tier];
    const product = products.find((p: any) => p.vendorProductId === productId);

    if (!product) {
      throw new Error(`Boost product not found for tier: ${tier}. Please configure products in Adapty dashboard.`);
    }

    console.log(`Purchasing boost: ${tier} (${productId})`);

    // Make purchase through Adapty
    const purchaseResult = await makePurchase(product);

    if (!purchaseResult || !purchaseResult.profile) {
      throw new Error('Purchase failed or incomplete');
    }

    console.log('Purchase successful, applying boost...');

    // Apply boost via Cloud Function
    // Adapty handles receipt validation automatically
    const result = await applyPopularityBoost(
      postId,
      productId,
      purchaseResult.transaction?.vendorTransactionId // Use transaction ID as receipt
    );

    return result;
  } catch (error: any) {
    console.error('Error purchasing boost:', error);
    
    // Convert Adapty errors to user-friendly messages
    if (error.message?.includes('cancelled') || error.message?.includes('canceled')) {
      throw new Error('Purchase was canceled');
    }
    
    if (error.message?.includes('network') || error.message?.includes('connection')) {
      throw new Error('Network error. Please check your internet connection and try again.');
    }
    
    throw new Error(error.message || 'Failed to purchase boost. Please try again.');
  }
}

/**
 * Check if a post already has a boost applied
 */
export function hasBoost(post: { popularityBoost?: number }): boolean {
  return !!(post.popularityBoost && post.popularityBoost > 0);
}

// Re-export for convenience
export { getBoostTierDisplayName, getBoostTierFromProductId } from '@/config/popularity-boost';

