/**
 * Analytics Hook
 * 
 * Provides easy access to analytics functions throughout the app
 */

import { useCallback } from 'react';
import * as analytics from '@/services/analytics';

export function useAnalytics() {
  const logEvent = useCallback(
    (eventName: string, parameters?: { [key: string]: any }) => {
      return analytics.logEvent(eventName, parameters);
    },
    []
  );

  const setScreen = useCallback((screenName: string, screenClass?: string) => {
    return analytics.setCurrentScreen(screenName, screenClass);
  }, []);

  const setUserProperty = useCallback((name: string, value: string | null) => {
    return analytics.setUserProperty(name, value);
  }, []);

  return {
    logEvent,
    setScreen,
    setUserProperty,
    // Predefined event helpers
    logLogin: analytics.logLogin,
    logSignUp: analytics.logSignUp,
    logPostCreated: analytics.logPostCreated,
    logPostLiked: analytics.logPostLiked,
    logPostShared: analytics.logPostShared,
    logPostCommented: analytics.logPostCommented,
    logBoostViewed: analytics.logBoostViewed,
    logBoostPurchaseInitiated: analytics.logBoostPurchaseInitiated,
    logBoostPurchaseCompleted: analytics.logBoostPurchaseCompleted,
    logImageUploaded: analytics.logImageUploaded,
    logSearch: analytics.logSearch,
    logProfileViewed: analytics.logProfileViewed,
    logSettingsChanged: analytics.logSettingsChanged,
    logOnboardingCompleted: analytics.logOnboardingCompleted,
    logError: analytics.logError,
    logAdImpression: analytics.logAdImpression,
    logAdClick: analytics.logAdClick,
  };
}

