/**
 * Ad Service Functions
 * 
 * Functions for fetching and managing ads from Firestore
 */

import { db } from '@/config/firebase';
import { AdDocument, AdImpressionDocument, COLLECTIONS } from '@/types/firestore';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    increment,
    limit,
    query,
    QueryDocumentSnapshot,
    serverTimestamp,
    setDoc,
    Timestamp,
    updateDoc,
    where
} from 'firebase/firestore';

/**
 * Get the current active pinned ad
 * Returns the first active pinned ad that is within date range
 */
export async function getPinnedAd(): Promise<AdDocument | null> {
  try {
    const adsRef = collection(db, COLLECTIONS.ADS);
    const now = Timestamp.now();
    
    // Get all pinned ads that are active
    const q = query(
      adsRef,
      where('type', '==', 'pinned'),
      where('isActive', '==', true),
      limit(20) // Get up to 20 to filter by date
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      console.log('No pinned ads found');
      return null;
    }
    
    // Filter by date range in memory and return the first one
    const ads = snapshot.docs
      .map((doc: QueryDocumentSnapshot) => ({
        id: doc.id,
        ...doc.data(),
      })) as AdDocument[];
    
    // Find first ad that is within date range
    for (const ad of ads) {
      const startDate = ad.startDate instanceof Timestamp 
        ? ad.startDate 
        : Timestamp.fromDate(new Date(ad.startDate));
      const endDate = ad.endDate instanceof Timestamp 
        ? ad.endDate 
        : Timestamp.fromDate(new Date(ad.endDate));
      
      if (startDate <= now && endDate >= now) {
        console.log('Found active pinned ad:', ad.id, ad.title);
        return ad;
      }
    }
    
    console.log('No active pinned ads in date range');
    return null;
  } catch (error) {
    console.error('Error fetching pinned ad:', error);
    return null;
  }
}

/**
 * Track ad impression
 */
export async function trackAdImpression(adId: string, userId: string): Promise<void> {
  if (!userId) return;
  
  const adRef = doc(db, COLLECTIONS.ADS, adId);
  const impressionRef = doc(db, COLLECTIONS.AD_IMPRESSIONS, `${adId}_${userId}`);
  
  try {
    // Update ad's total impressions
    await updateDoc(adRef, {
      impressions: increment(1),
      lastShownAt: serverTimestamp(),
    });
    
    // Update or create user impression record
    const impressionDoc = await getDoc(impressionRef);
    if (impressionDoc.exists()) {
      await updateDoc(impressionRef, {
        impressions: increment(1),
        lastShownAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      // Create new impression record
      await setDoc(impressionRef, {
        adId,
        userId,
        impressions: 1,
        clicks: 0,
        lastShownAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error tracking ad impression:', error);
    // Don't throw - impression tracking shouldn't break the app
  }
}

/**
 * Track ad click
 */
export async function trackAdClick(adId: string, userId: string): Promise<void> {
  if (!userId) return;
  
  const adRef = doc(db, COLLECTIONS.ADS, adId);
  const impressionRef = doc(db, COLLECTIONS.AD_IMPRESSIONS, `${adId}_${userId}`);
  
  try {
    // Update ad's total clicks
    await updateDoc(adRef, {
      clicks: increment(1),
    });
    
    // Update user impression record
    const impressionDoc = await getDoc(impressionRef);
    if (impressionDoc.exists()) {
      await updateDoc(impressionRef, {
        clicks: increment(1),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error tracking ad click:', error);
    // Don't throw - click tracking shouldn't break the app
  }
}

/**
 * Get all active feed ads within date range
 */
export async function getFeedAds(): Promise<AdDocument[]> {
  try {
    const adsRef = collection(db, COLLECTIONS.ADS);
    const now = Timestamp.now();
    
    // Get all feed ads that are active
    const q = query(
      adsRef,
      where('type', '==', 'feed'),
      where('isActive', '==', true),
      limit(50) // Get up to 50 to filter by date
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      console.log('No feed ads found');
      return [];
    }
    
    // Filter by date range in memory
    const ads = snapshot.docs
      .map((doc: QueryDocumentSnapshot) => ({
        id: doc.id,
        ...doc.data(),
      })) as AdDocument[];
    
    // Filter ads that are within date range
    const activeAds = ads.filter(ad => {
      const startDate = ad.startDate instanceof Timestamp 
        ? ad.startDate 
        : Timestamp.fromDate(new Date(ad.startDate));
      const endDate = ad.endDate instanceof Timestamp 
        ? ad.endDate 
        : Timestamp.fromDate(new Date(ad.endDate));
      
      return startDate <= now && endDate >= now;
    });
    
    // Sort by priority (higher priority first)
    activeAds.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    console.log(`Found ${activeAds.length} active feed ads`);
    return activeAds;
  } catch (error) {
    console.error('Error fetching feed ads:', error);
    return [];
  }
}

/**
 * Get user's ad impressions for tracking which ads they've seen
 */
export async function getUserAdImpressions(userId: string): Promise<Map<string, AdImpressionDocument>> {
  if (!userId) return new Map();
  
  try {
    const impressionsRef = collection(db, COLLECTIONS.AD_IMPRESSIONS);
    const q = query(
      impressionsRef,
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(q);
    const impressionsMap = new Map<string, AdImpressionDocument>();
    
    snapshot.docs.forEach((doc: QueryDocumentSnapshot) => {
      const data = doc.data() as AdImpressionDocument;
      impressionsMap.set(data.adId, {
        ...data,
        id: doc.id,
      });
    });
    
    return impressionsMap;
  } catch (error) {
    console.error('Error fetching user ad impressions:', error);
    return new Map();
  }
}

/**
 * Get the next feed ad to show (highest priority)
 * Algorithm:
 * 1. Get all active feed ads (already sorted by priority in getFeedAds)
 * 2. Return the first ad (highest priority)
 * 
 * @returns Selected ad or null if no ads available
 */
export async function getNextFeedAd(): Promise<AdDocument | null> {
  try {
    // Get all active feed ads (already sorted by priority)
    const feedAds = await getFeedAds();
    if (feedAds.length === 0) {
      return null;
    }
    
    // Return highest priority ad (first in sorted array)
    return feedAds[0];
  } catch (error) {
    console.error('Error getting next feed ad:', error);
    return null;
  }
}

