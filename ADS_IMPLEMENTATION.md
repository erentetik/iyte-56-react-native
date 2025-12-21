# Ad Content Implementation Guide

This document outlines the implementation of ad content in the home feed tabs, including pinned ads and feed ads with intelligent ad selection algorithms.

## Overview

The ad system consists of two types of ads:
1. **Pinned Ad**: A single ad that appears at the top of the feed (only one active at a time)
2. **Feed Ads**: Multiple ads that appear in the feed, showing 1 ad after every 5 posts

Both ad types are managed from Firebase and use an algorithm to select which ad to display when multiple ads are available.

---

## Firebase Data Structure

### Collection: `ads`

Each ad document in the `ads` collection should have the following structure:

```typescript
interface AdDocument {
  id: string;                    // Document ID (auto-generated)
  
  // Ad Type
  type: 'pinned' | 'feed';       // Type of ad
  
  // Content
  title: string;                 // Ad title/headline
  content: string;               // Ad description/text
  imageUrl?: string;             // Ad image URL
  videoUrl?: string;             // Ad video URL (optional)
  mediaType?: 'image' | 'video'; // Type of media
  
  // Call to Action
  ctaText?: string;              // Button text (e.g., "Learn More", "Shop Now")
  ctaUrl?: string;               // URL to open when ad is clicked
  ctaAction?: 'url' | 'deep_link' | 'in_app'; // Type of action
  
  // Targeting & Scheduling
  isActive: boolean;             // Whether ad is currently active
  startDate: Timestamp;          // When ad should start showing
  endDate: Timestamp;            // When ad should stop showing
  priority: number;              // Priority score (higher = more important, used in selection)
  
  // Targeting (optional - for future expansion)
  targetAudience?: {
    minAge?: number;
    maxAge?: number;
    interests?: string[];
    locations?: string[];
    userSegments?: string[];
  };
  
  // Performance Tracking
  impressions: number;           // Total number of times ad was shown
  clicks: number;               // Total number of clicks
  views: number;                // Total number of views (if video)
  
  // Rotation & Display Logic
  maxImpressions?: number;      // Maximum impressions before ad is paused
  maxClicks?: number;           // Maximum clicks before ad is paused
  displayFrequency?: number;    // How often to show (1 = every time, 2 = every other time, etc.)
  lastShownAt?: Timestamp;      // Last time this ad was shown to any user
  
  // User-specific tracking (subcollection)
  // Path: ads/{adId}/user_impressions/{userId}
  // This is tracked separately to avoid document size limits
  
  // Timestamps
  createdAt: Timestamp;          // Ad creation time
  updatedAt: Timestamp;          // Last update time
}
```

### Collection: `ad_impressions`

Track individual user impressions to prevent showing the same ad too frequently to the same user:

```typescript
interface AdImpressionDocument {
  id: string;                    // Format: {adId}_{userId}
  adId: string;                  // Reference to ads/{adId}
  userId: string;                // Reference to users/{userId}
  
  impressions: number;           // Number of times shown to this user
  lastShownAt: Timestamp;        // Last time shown to this user
  clicks: number;                // Number of clicks by this user
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## Ad Selection Algorithm

### For Pinned Ads

Since only one pinned ad can be active, the algorithm is simpler:

1. **Filter active ads**:
   - `type === 'pinned'`
   - `isActive === true`
   - Current time is between `startDate` and `endDate`
   - If `maxImpressions` is set, total `impressions < maxImpressions`
   - If `maxClicks` is set, total `clicks < maxClicks`

2. **Select highest priority**:
   - Sort by `priority` (descending)
   - If priorities are equal, select the one with fewer total impressions
   - If still equal, select the one created most recently

### For Feed Ads

Feed ads use a more sophisticated algorithm to ensure variety and fair distribution:

1. **Filter active ads**:
   - `type === 'feed'`
   - `isActive === true`
   - Current time is between `startDate` and `endDate`
   - If `maxImpressions` is set, total `impressions < maxImpressions`
   - If `maxClicks` is set, total `clicks < maxClicks`

2. **User-specific filtering** (to avoid showing same ad too frequently):
   - Check user's impression history for this ad
   - If `displayFrequency` is set, ensure user hasn't seen it too recently
   - Consider user's last impression time

3. **Scoring algorithm**:
   Each eligible ad gets a score based on:
   ```
   score = (priority * 0.4) + 
           (impressionRatio * 0.3) + 
           (timeDecay * 0.2) + 
           (userFrequency * 0.1)
   ```
   
   Where:
   - **priority**: Ad's priority value (normalized 0-1)
   - **impressionRatio**: Inverse of impressions (ads with fewer impressions get higher score)
   - **timeDecay**: How recently the ad was created (newer ads get slight boost)
   - **userFrequency**: Inverse of how often user has seen this ad

4. **Select ad with highest score**

### Algorithm Implementation Details

```typescript
// Pseudo-code for feed ad selection
function selectFeedAd(eligibleAds: AdDocument[], userId: string): AdDocument | null {
  if (eligibleAds.length === 0) return null;
  
  // Get user impression history for all ads
  const userImpressions = await getUserImpressions(eligibleAds.map(a => a.id), userId);
  
  // Score each ad
  const scoredAds = eligibleAds.map(ad => {
    const userImpression = userImpressions.find(ui => ui.adId === ad.id);
    const userImpressionCount = userImpression?.impressions || 0;
    const lastShownToUser = userImpression?.lastShownAt;
    
    // Check if ad should be skipped due to frequency
    if (ad.displayFrequency && lastShownToUser) {
      const hoursSinceLastShown = (Date.now() - lastShownToUser.toMillis()) / (1000 * 60 * 60);
      if (hoursSinceLastShown < ad.displayFrequency) {
        return null; // Skip this ad
      }
    }
    
    // Calculate scores
    const priorityScore = normalize(ad.priority, 0, 100) * 0.4;
    const impressionRatio = (1 - normalize(ad.impressions, 0, 10000)) * 0.3;
    const timeDecay = calculateTimeDecay(ad.createdAt) * 0.2;
    const userFrequency = (1 - normalize(userImpressionCount, 0, 10)) * 0.1;
    
    const totalScore = priorityScore + impressionRatio + timeDecay + userFrequency;
    
    return { ad, score: totalScore };
  }).filter(item => item !== null);
  
  // Sort by score and return highest
  scoredAds.sort((a, b) => b.score - a.score);
  return scoredAds[0]?.ad || null;
}
```

---

## Implementation Steps

### Step 1: Add Ad Types to Firestore Types

Add the ad document interfaces to `src/types/firestore.ts`:

```typescript
// Add to COLLECTIONS constant
export const COLLECTIONS = {
  // ... existing collections
  ADS: 'ads',
  AD_IMPRESSIONS: 'ad_impressions',
} as const;

// Add AdDocument interface (see structure above)
export interface AdDocument {
  // ... (see Firebase Data Structure section)
}

export interface AdImpressionDocument {
  // ... (see Firebase Data Structure section)
}
```

### Step 2: Create Ad Service Functions

Create `src/services/ads.ts` with functions to:
- Fetch pinned ad
- Fetch eligible feed ads
- Select ad using algorithm
- Track impressions
- Track clicks

### Step 3: Create Ad Query Hooks

Create `src/hooks/queries/use-ads.ts` with:
- `usePinnedAd()`: Hook to fetch the current pinned ad
- `useFeedAds()`: Hook to fetch eligible feed ads
- `useSelectFeedAd()`: Hook that uses the selection algorithm

### Step 4: Create Ad Component

Create `src/components/ad-card.tsx`:
- Component to display ad content
- Handles image/video display
- Handles CTA button clicks
- Tracks impressions and clicks

### Step 5: Integrate with Home Feed

Modify `src/screens/tabs/home/index.tsx`:
- Add pinned ad at the top of the list
- Insert feed ads after every 5 posts
- Handle ad rendering in FlatList

### Step 6: Create Ad Selection Utility

Create `src/utils/ad-selection.ts`:
- Implement the ad selection algorithm
- Handle scoring and filtering logic

---

## Code Structure

### File: `src/services/ads.ts`

```typescript
import { db } from '@/config/firebase';
import { COLLECTIONS, AdDocument, AdImpressionDocument } from '@/types/firestore';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  increment,
  serverTimestamp,
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';

/**
 * Get the current active pinned ad
 */
export async function getPinnedAd(): Promise<AdDocument | null> {
  const adsRef = collection(db, COLLECTIONS.ADS);
  const now = Timestamp.now();
  
  const q = query(
    adsRef,
    where('type', '==', 'pinned'),
    where('isActive', '==', true),
    where('startDate', '<=', now),
    where('endDate', '>=', now),
    orderBy('priority', 'desc'),
    orderBy('impressions', 'asc'),
    limit(1)
  );
  
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  
  const adDoc = snapshot.docs[0];
  return {
    id: adDoc.id,
    ...adDoc.data(),
  } as AdDocument;
}

/**
 * Get all eligible feed ads
 */
export async function getEligibleFeedAds(): Promise<AdDocument[]> {
  const adsRef = collection(db, COLLECTIONS.ADS);
  const now = Timestamp.now();
  
  const q = query(
    adsRef,
    where('type', '==', 'feed'),
    where('isActive', '==', true),
    where('startDate', '<=', now),
    where('endDate', '>=', now)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as AdDocument[];
}

/**
 * Get user's impression history for ads
 */
export async function getUserAdImpressions(
  adIds: string[], 
  userId: string
): Promise<AdImpressionDocument[]> {
  if (adIds.length === 0) return [];
  
  const impressionsRef = collection(db, COLLECTIONS.AD_IMPRESSIONS);
  const impressions: AdImpressionDocument[] = [];
  
  // Firestore 'in' query limit is 10, so batch if needed
  for (let i = 0; i < adIds.length; i += 10) {
    const batch = adIds.slice(i, i + 10);
    const q = query(
      impressionsRef,
      where('userId', '==', userId),
      where('adId', 'in', batch)
    );
    
    const snapshot = await getDocs(q);
    impressions.push(...snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as AdImpressionDocument[]);
  }
  
  return impressions;
}

/**
 * Track ad impression
 */
export async function trackAdImpression(adId: string, userId: string): Promise<void> {
  const adRef = doc(db, COLLECTIONS.ADS, adId);
  const impressionRef = doc(db, COLLECTIONS.AD_IMPRESSIONS, `${adId}_${userId}`);
  
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
}

/**
 * Track ad click
 */
export async function trackAdClick(adId: string, userId: string): Promise<void> {
  const adRef = doc(db, COLLECTIONS.ADS, adId);
  const impressionRef = doc(db, COLLECTIONS.AD_IMPRESSIONS, `${adId}_${userId}`);
  
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
}
```

### File: `src/utils/ad-selection.ts`

```typescript
import { AdDocument, AdImpressionDocument } from '@/types/firestore';
import { Timestamp } from 'firebase/firestore';

/**
 * Normalize a value to 0-1 range
 */
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * Calculate time decay score (newer ads get slight boost)
 */
function calculateTimeDecay(createdAt: Timestamp): number {
  const now = Date.now();
  const created = createdAt.toMillis();
  const daysSinceCreation = (now - created) / (1000 * 60 * 60 * 24);
  
  // Ads created in last 7 days get full score, then decay
  if (daysSinceCreation <= 7) return 1.0;
  if (daysSinceCreation <= 30) return 0.8;
  if (daysSinceCreation <= 90) return 0.6;
  return 0.4;
}

/**
 * Select the best feed ad using scoring algorithm
 */
export function selectFeedAd(
  eligibleAds: AdDocument[],
  userImpressions: AdImpressionDocument[],
  userId: string
): AdDocument | null {
  if (eligibleAds.length === 0) return null;
  
  // Create a map for quick lookup
  const impressionMap = new Map(
    userImpressions.map(imp => [imp.adId, imp])
  );
  
  // Score each ad
  const scoredAds = eligibleAds
    .map(ad => {
      const userImpression = impressionMap.get(ad.id);
      const userImpressionCount = userImpression?.impressions || 0;
      const lastShownToUser = userImpression?.lastShownAt;
      
      // Check frequency limit
      if (ad.displayFrequency && lastShownToUser) {
        const hoursSinceLastShown = 
          (Date.now() - lastShownToUser.toMillis()) / (1000 * 60 * 60);
        if (hoursSinceLastShown < ad.displayFrequency) {
          return null; // Skip this ad
        }
      }
      
      // Check max impressions/clicks limits
      if (ad.maxImpressions && ad.impressions >= ad.maxImpressions) {
        return null;
      }
      if (ad.maxClicks && ad.clicks >= ad.maxClicks) {
        return null;
      }
      
      // Calculate component scores
      const priorityScore = normalize(ad.priority || 50, 0, 100) * 0.4;
      const impressionRatio = (1 - normalize(ad.impressions, 0, 10000)) * 0.3;
      const timeDecay = calculateTimeDecay(ad.createdAt) * 0.2;
      const userFrequency = (1 - normalize(userImpressionCount, 0, 10)) * 0.1;
      
      const totalScore = priorityScore + impressionRatio + timeDecay + userFrequency;
      
      return { ad, score: totalScore };
    })
    .filter((item): item is { ad: AdDocument; score: number } => item !== null);
  
  if (scoredAds.length === 0) return null;
  
  // Sort by score (highest first) and return top ad
  scoredAds.sort((a, b) => b.score - a.score);
  return scoredAds[0].ad;
}
```

### File: `src/hooks/queries/use-ads.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-client';
import { 
  getPinnedAd, 
  getEligibleFeedAds, 
  getUserAdImpressions,
  selectFeedAd 
} from '@/services/ads';
import { AdDocument } from '@/types/firestore';

/**
 * Hook to fetch the current pinned ad
 */
export function usePinnedAd() {
  return useQuery({
    queryKey: queryKeys.ads.pinned(),
    queryFn: () => getPinnedAd(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch eligible feed ads and select one
 */
export function useSelectedFeedAd(userId?: string) {
  return useQuery({
    queryKey: queryKeys.ads.feed(userId),
    queryFn: async () => {
      const eligibleAds = await getEligibleFeedAds();
      if (!userId || eligibleAds.length === 0) {
        return null;
      }
      
      const userImpressions = await getUserAdImpressions(
        eligibleAds.map(a => a.id),
        userId
      );
      
      return selectFeedAd(eligibleAds, userImpressions, userId);
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
```

### File: `src/components/ad-card.tsx`

```typescript
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { AdDocument } from '@/types/firestore';
import { trackAdClick, trackAdImpression } from '@/services/ads';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColors } from '@/hooks/use-theme-colors';

interface AdCardProps {
  ad: AdDocument;
  onImpressionTracked?: () => void;
}

export function AdCard({ ad, onImpressionTracked }: AdCardProps) {
  const colors = useThemeColors();
  const { user } = useAuth();
  const [impressionTracked, setImpressionTracked] = React.useState(false);
  
  // Track impression when component mounts
  React.useEffect(() => {
    if (!impressionTracked && user?.uid) {
      trackAdImpression(ad.id, user.uid).then(() => {
        setImpressionTracked(true);
        onImpressionTracked?.();
      });
    }
  }, [ad.id, user?.uid, impressionTracked, onImpressionTracked]);
  
  const handleClick = async () => {
    if (!user?.uid) return;
    
    await trackAdClick(ad.id, user.uid);
    
    if (ad.ctaUrl) {
      if (ad.ctaAction === 'deep_link' || ad.ctaAction === 'in_app') {
        // Handle deep link or in-app navigation
        // Implementation depends on your navigation setup
      } else {
        // Open URL
        Linking.openURL(ad.ctaUrl).catch(err => 
          console.error('Failed to open URL:', err)
        );
      }
    }
  };
  
  return (
    <View style={[styles.container, { backgroundColor: colors.neutral[2] }]}>
      {ad.imageUrl && (
        <Image 
          source={{ uri: ad.imageUrl }} 
          style={styles.image}
          resizeMode="cover"
        />
      )}
      
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.neutral[12] }]}>
          {ad.title}
        </Text>
        {ad.content && (
          <Text style={[styles.text, { color: colors.neutral[11] }]}>
            {ad.content}
          </Text>
        )}
        
        {ad.ctaText && ad.ctaUrl && (
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: colors.orange[9] }]}
            onPress={handleClick}
          >
            <Text style={styles.ctaText}>{ad.ctaText}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  image: {
    width: '100%',
    height: 200,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    marginBottom: 12,
  },
  ctaButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  ctaText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
```

### Integration in Home Screen

Modify `src/screens/tabs/home/index.tsx`:

```typescript
// Add imports
import { usePinnedAd, useSelectedFeedAd } from '@/hooks/queries/use-ads';
import { AdCard } from '@/components/ad-card';

// In HomeScreen component, add:
const { data: pinnedAd } = usePinnedAd();
const { data: selectedFeedAd } = useSelectedFeedAd(user?.uid);

// Modify the posts array to include ads
const feedWithAds = useMemo(() => {
  const items: (PostDocument | { type: 'ad'; ad: AdDocument })[] = [];
  
  // Add pinned ad at the top
  if (pinnedAd) {
    items.push({ type: 'ad', ad: pinnedAd });
  }
  
  // Add posts and feed ads
  filteredPosts.forEach((post, index) => {
    items.push(post);
    
    // Add feed ad after every 5 posts (positions 5, 10, 15, etc.)
    if ((index + 1) % 5 === 0 && selectedFeedAd) {
      items.push({ type: 'ad', ad: selectedFeedAd });
    }
  });
  
  return items;
}, [filteredPosts, pinnedAd, selectedFeedAd]);

// Update renderItem
const renderItem = useCallback(
  ({ item }: { item: PostDocument | { type: 'ad'; ad: AdDocument } }) => {
    // Check if item is an ad
    if ('type' in item && item.type === 'ad') {
      return <AdCard ad={item.ad} />;
    }
    
    // Otherwise render post
    const post = item as PostDocument;
    // ... existing post rendering logic
  },
  [/* existing dependencies */]
);

// Update FlatList data prop
<FlatList
  data={feedWithAds}
  renderItem={renderItem}
  keyExtractor={(item, index) => {
    if ('type' in item && item.type === 'ad') {
      return `ad-${item.ad.id}-${index}`;
    }
    return `${activeTab}-${(item as PostDocument).id}`;
  }}
  // ... rest of props
/>
```

---

## Firebase Indexes Required

Add these indexes to `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "ads",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "isActive", "order": "ASCENDING" },
        { "fieldPath": "startDate", "order": "ASCENDING" },
        { "fieldPath": "endDate", "order": "ASCENDING" },
        { "fieldPath": "priority", "order": "DESCENDING" },
        { "fieldPath": "impressions", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "ad_impressions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "adId", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## Admin Interface Considerations

For managing ads from Firebase, consider creating:

1. **Admin Web Interface** (in `iyte-56-web`):
   - Create/edit/delete ads
   - Set scheduling, targeting, and priority
   - View performance metrics (impressions, clicks)
   - Activate/deactivate ads

2. **Firebase Console**:
   - Direct Firestore editing for quick changes
   - View ad documents and metrics

---

## Testing Checklist

- [ ] Pinned ad appears at top of feed
- [ ] Only one pinned ad is shown at a time
- [ ] Feed ads appear after every 5 posts
- [ ] Ad selection algorithm works correctly
- [ ] Impressions are tracked correctly
- [ ] Clicks are tracked correctly
- [ ] Ads respect start/end dates
- [ ] Ads respect max impressions/clicks limits
- [ ] Ads respect display frequency
- [ ] Inactive ads don't show
- [ ] Expired ads don't show
- [ ] User-specific frequency limits work

---

## Performance Considerations

1. **Caching**: Ad queries are cached for 2-5 minutes to reduce Firestore reads
2. **Batching**: User impression queries are batched to handle Firestore's 10-item 'in' query limit
3. **Lazy Loading**: Feed ads are selected on-demand, not pre-loaded for all positions
4. **Optimistic Updates**: Impression tracking happens asynchronously to avoid blocking UI

---

## Future Enhancements

1. **A/B Testing**: Support for multiple ad variants
2. **Advanced Targeting**: User demographics, interests, behavior
3. **Real-time Bidding**: Dynamic ad selection based on real-time metrics
4. **Ad Analytics Dashboard**: Detailed performance metrics
5. **Ad Scheduling**: More granular time-based scheduling
6. **Geographic Targeting**: Show ads based on user location
7. **Frequency Capping**: More sophisticated frequency control per user

