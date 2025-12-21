/**
 * Popularity Boost Configuration (Mobile App)
 * 
 * This file contains the boost configuration that matches the Cloud Functions.
 * Keep this in sync with functions/src/popularity-boost.ts
 */

export type BoostTier = 'basic' | 'premium' | 'ultra';

/**
 * IAP Product IDs
 * These should match the product IDs configured in App Store Connect and Google Play Console
 */
export const IAP_PRODUCT_IDS = {
  basic: 'com.erentetik.iyte56.boost.basic',
  premium: 'com.erentetik.iyte56.boost.premium',
  ultra: 'com.erentetik.iyte56.boost.ultra',
} as const;

/**
 * Get boost tier from IAP product ID
 */
export function getBoostTierFromProductId(productId: string): BoostTier | null {
  if (productId === IAP_PRODUCT_IDS.basic) return 'basic';
  if (productId === IAP_PRODUCT_IDS.premium) return 'premium';
  if (productId === IAP_PRODUCT_IDS.ultra) return 'ultra';
  return null;
}

/**
 * Get boost tier display name
 */
export function getBoostTierDisplayName(tier: BoostTier): string {
  switch (tier) {
    case 'basic':
      return 'Basic Boost';
    case 'premium':
      return 'Premium Boost';
    case 'ultra':
      return 'Ultra Boost';
    default:
      return 'Boost';
  }
}

/**
 * Get boost tier description
 */
export function getBoostTierDescription(tier: BoostTier): string {
  switch (tier) {
    case 'basic':
      return 'Get a small boost to help your post stand out';
    case 'premium':
      return 'Get a medium boost for better visibility';
    case 'ultra':
      return 'Get maximum boost for top visibility';
    default:
      return 'Boost your post';
  }
}

