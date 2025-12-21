# Firebase Analytics Documentation

## Overview

Firebase Analytics has been integrated into the IYTE56 app to track user behavior, app usage, and key business metrics. This document outlines what events are tracked, what data is collected, and how to use the analytics service.

## What Gets Tracked

### Automatic Events

These events are tracked automatically by Firebase Analytics:

- **App Open** (`app_open`)
  - Triggered when the app is opened
  - Includes platform information (iOS/Android)

- **Screen Views** (`screen_view`)
  - Automatically tracked when screens are viewed
  - Can be manually set using `setCurrentScreen()`

- **User Properties**
  - User ID is automatically set when user logs in
  - User ID is reset when user logs out

### Custom Events

The following custom events are implemented and can be tracked throughout the app:

#### Authentication Events

- **Login** (`login`)
  - Parameters: `method` (e.g., "email", "google", "apple")
  - Usage: `logLogin('email')`

- **Sign Up** (`sign_up`)
  - Parameters: `method` (e.g., "email", "google", "apple")
  - Usage: `logSignUp('email')`

#### Post Events

- **Post Created** (`post_created`)
  - Parameters:
    - `has_image` (boolean): Whether the post includes an image
    - `is_anonymous` (boolean): Whether the post is anonymous
  - Usage: `logPostCreated(true, false)`

- **Post Liked** (`post_liked`)
  - Parameters: `post_id` (string)
  - Usage: `logPostLiked('post123')`

- **Post Shared** (`share`)
  - Parameters:
    - `content_type`: "post"
    - `item_id`: Post ID
    - `method`: Sharing method
  - Usage: `logPostShared('post123', 'native')`

- **Post Commented** (`post_commented`)
  - Parameters: `post_id` (string)
  - Usage: `logPostCommented('post123')`

#### Boost/Purchase Events

- **Boost Viewed** (`boost_viewed`)
  - Triggered when user views the boost paywall
  - Usage: `logBoostViewed()`

- **Boost Purchase Initiated** (`boost_purchase_initiated`)
  - Parameters:
    - `product_id`: Product identifier
    - `value`: Price in TRY
    - `currency`: "TRY"
  - Usage: `logBoostPurchaseInitiated('boost_1', 9.99)`

- **Boost Purchase Completed** (`purchase`)
  - Parameters:
    - `transaction_id`: Product ID
    - `value`: Price in TRY
    - `currency`: "TRY"
    - `items`: Array with product details
  - Usage: `logBoostPurchaseCompleted('boost_1', 9.99)`

#### Ad Events

- **Ad Impression** (`ad_impression`)
  - Parameters:
    - `ad_id`: Ad identifier
    - `advertiser_id` (optional): Advertiser user ID
  - Usage: `logAdImpression('ad123', 'advertiser456')`
  - **Note**: This tracks total views (all impressions)

- **Ad Unique View** (`ad_unique_view`)
  - Parameters:
    - `ad_id`: Ad identifier
    - `advertiser_id` (optional): Advertiser user ID
  - Usage: Automatically tracked when user sees an ad for the first time
  - **Note**: This tracks unique views (first time only per user)

- **Ad Click** (`ad_click`)
  - Parameters:
    - `ad_id`: Ad identifier
    - `advertiser_id` (optional): Advertiser user ID
  - Usage: `logAdClick('ad123', 'advertiser456')`

#### Content Events

- **Image Uploaded** (`image_uploaded`)
  - Parameters:
    - `success` (boolean): Whether upload succeeded
    - `error` (string, optional): Error message if failed
  - Usage: `logImageUploaded(true)` or `logImageUploaded(false, 'Network error')`

- **Search** (`search`)
  - Parameters: `search_term` (string)
  - Usage: `logSearch('query text')`

- **Profile Viewed** (`profile_viewed`)
  - Parameters:
    - `user_id`: User ID of viewed profile
    - `is_own_profile`: Whether viewing own profile
  - Usage: `logProfileViewed('user123', false)`

#### App Events

- **Settings Changed** (`settings_changed`)
  - Parameters:
    - `setting`: Setting name
    - `value`: New value
  - Usage: `logSettingsChanged('theme', 'dark')`

- **Onboarding Completed** (`onboarding_completed`)
  - Triggered when user completes onboarding
  - Usage: `logOnboardingCompleted()`

- **App Error** (`app_error`)
  - Parameters:
    - `error`: Error message
    - `error_type`: Type of error
  - Usage: `logError('Network timeout', 'network')`

## How to Use Analytics

### Using the Hook (Recommended)

```typescript
import { useAnalytics } from '@/hooks/use-analytics';

function MyComponent() {
  const analytics = useAnalytics();
  
  const handleButtonClick = () => {
    // Track custom event
    analytics.logEvent('button_clicked', {
      button_name: 'submit',
      screen: 'HomeScreen'
    });
  };
  
  const handlePostLike = (postId: string) => {
    analytics.logPostLiked(postId);
  };
  
  return (
    // Your component JSX
  );
}
```

### Direct Import

```typescript
import { logEvent, logPostCreated, setCurrentScreen } from '@/services/analytics';

// Track custom event
await logEvent('custom_action', {
  action_type: 'click',
  element: 'button'
});

// Track post creation
await logPostCreated(true, false); // hasImage, isAnonymous

// Set current screen
await setCurrentScreen('HomeScreen', 'HomeScreen');
```

### Setting User Properties

```typescript
import { setUserProperty } from '@/services/analytics';

// Set custom user property
await setUserProperty('subscription_tier', 'premium');
await setUserProperty('user_type', 'student');
```

## What Data is Collected

### User Data
- **User ID**: Set automatically when user logs in (Firebase UID)
- **User Properties**: Custom properties you set (e.g., subscription tier, user type)

### Event Data
- Event names and parameters
- Timestamps
- Platform information (iOS/Android)
- App version
- Device information (automatically collected by Firebase)

### Privacy Considerations
- User IDs are anonymized in Firebase Analytics
- No personally identifiable information (PII) should be included in event parameters
- User consent should be obtained according to your privacy policy

## Firebase Console

### Accessing Analytics Data

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `iyte-2b16f`
3. Navigate to **Analytics** → **Events**
4. View real-time and historical event data

### Key Metrics to Monitor

- **Active Users**: Daily, weekly, monthly active users
- **Retention**: User retention rates
- **Engagement**: Posts created, likes, comments, shares
- **Revenue**: Boost purchases and revenue
- **Funnels**: User journey from signup to engagement
- **Custom Events**: All custom events you track

### Creating Custom Reports

1. Go to **Analytics** → **Events**
2. Click on any event to see detailed breakdown
3. Create custom reports with filters and segments
4. Export data for further analysis

## Expected Data Timeline

### Real-time Data
- Events appear in Firebase Console within seconds
- Real-time dashboard shows live user activity

### Standard Reports
- Daily data: Available within 24 hours
- Hourly data: Available within a few hours
- Historical data: Stored indefinitely

### Data Retention
- Free tier: 14 months of data retention
- Blaze plan: Up to 50 months (configurable)

## Best Practices

### 1. Event Naming
- Use lowercase with underscores: `post_created`, `user_login`
- Be consistent across the app
- Use descriptive names

### 2. Parameters
- Keep parameter names short but descriptive
- Use consistent data types (string, number, boolean)
- Don't include PII in parameters

### 3. When to Track
- Track important user actions
- Track business-critical events (purchases, signups)
- Track errors and issues
- Don't over-track (avoid tracking every click)

### 4. Testing
- Test events in development mode
- Verify events appear in Firebase Console
- Use Firebase DebugView for real-time testing

## Debugging Analytics

### Enable Debug Mode (Development)

```typescript
// In development, you can see console logs
// Events are logged to console with [Analytics] prefix
```

### Firebase DebugView

1. Enable debug mode in your app
2. Go to Firebase Console → **Analytics** → **DebugView**
3. See events in real-time as they're triggered

### Common Issues

- **Events not appearing**: 
  - Check internet connection
  - Verify Firebase is initialized
  - Check Firebase Console filters (date range, etc.)

- **Missing parameters**:
  - Verify parameter names match exactly
  - Check parameter types (string, number, boolean)

## Integration Status

✅ **Completed:**
- Firebase Analytics package installed
- Analytics service created
- Analytics initialized on app start
- User ID automatically set/reset on login/logout
- App open event tracked
- Helper functions for common events
- **Ad tracking integrated:**
  - Total ad views tracked (`ad_impression`)
  - Unique ad views tracked (`ad_unique_view`)
  - Ad clicks tracked (`ad_click`)
  - Analytics events sent automatically when ads are viewed/clicked

📋 **To Do (Optional Enhancements):**
- Add screen view tracking in navigation
- Add more event tracking throughout the app
- Set up custom user properties
- Create custom dashboards in Firebase Console
- Set up conversion events
- Configure audiences for targeted analysis

## Example Implementation Locations

Consider adding analytics tracking in:

- **Post Creation**: `src/screens/modal/add-post/add-post-screen.tsx`
- **Post Interactions**: `src/components/tweet.tsx`
- **Boost Purchase**: `src/screens/modal/add-post/components/BoostButton.tsx`
- **User Profile**: `src/screens/tabs/profile/index.tsx`
- **Search**: Search functionality screens
- **Settings**: Settings screens

## Support

For Firebase Analytics documentation:
- [Firebase Analytics Docs](https://firebase.google.com/docs/analytics)
- [React Native Firebase Analytics](https://rnfirebase.io/analytics/usage)

For questions or issues:
- Check Firebase Console for event delivery
- Review console logs for initialization errors
- Verify Firebase configuration files are correct

