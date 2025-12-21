/**
 * Hook for managing popularity boost purchases
 * 
 * Provides a simple interface for purchasing and applying boosts to posts
 */

import { type BoostTier } from '@/config/popularity-boost';
import { useAuth } from '@/contexts/AuthContext';
import {
    getBoostProducts,
    purchaseAndApplyBoost,
} from '@/services/popularity-boost';
import { useState } from 'react';
import { Alert } from 'react-native';

interface BoostProduct {
  vendorProductId: string;
  localizedPrice: string;
  price: number;
  currencyCode: string;
  [key: string]: any;
}

interface UsePopularityBoostReturn {
  /**
   * Available boost products from Adapty
   */
  products: BoostProduct[];
  
  /**
   * Whether products are currently being loaded
   */
  loading: boolean;
  
  /**
   * Error message if loading failed
   */
  error: string | null;
  
  /**
   * Whether a purchase is currently in progress
   */
  purchasing: boolean;
  
  /**
   * Load boost products from Adapty
   */
  loadProducts: () => Promise<void>;
  
  /**
   * Purchase and apply a boost to a post
   */
  purchaseBoost: (postId: string, tier: BoostTier) => Promise<boolean>;
}

/**
 * Hook for managing popularity boost purchases
 * 
 * @example
 * ```tsx
 * const { products, loading, purchaseBoost } = usePopularityBoost();
 * 
 * useEffect(() => {
 *   loadProducts();
 * }, []);
 * 
 * const handlePurchase = async () => {
 *   const success = await purchaseBoost(postId, 'premium');
 *   if (success) {
 *     Alert.alert('Success', 'Your post has been boosted!');
 *   }
 * };
 * ```
 */
export function usePopularityBoost(): UsePopularityBoostReturn {
  const { user } = useAuth();
  const [products, setProducts] = useState<BoostProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const boostProducts = await getBoostProducts('popularity_boost');
      setProducts(boostProducts);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load boost options';
      setError(errorMessage);
      console.error('Error loading boost products:', err);
    } finally {
      setLoading(false);
    }
  };

  const purchaseBoost = async (
    postId: string,
    tier: BoostTier
  ): Promise<boolean> => {
    if (purchasing) {
      return false;
    }

    setPurchasing(true);
    setError(null);

    try {
      const result = await purchaseAndApplyBoost(
        postId,
        tier,
        user?.uid
      );

      if (result.success) {
        Alert.alert(
          'Boost Applied!',
          `Your post has been boosted with ${result.boostValue} points. New popularity score: ${result.newScore.toFixed(2)}`
        );
        return true;
      } else {
        Alert.alert('Error', result.message || 'Failed to apply boost');
        return false;
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to purchase boost';
      setError(errorMessage);
      
      // Show user-friendly error
      if (errorMessage.includes('canceled') || errorMessage.includes('cancel')) {
        // User canceled - don't show error
        return false;
      }
      
      Alert.alert('Purchase Failed', errorMessage);
      return false;
    } finally {
      setPurchasing(false);
    }
  };

  return {
    products,
    loading,
    error,
    purchasing,
    loadProducts,
    purchaseBoost,
  };
}

