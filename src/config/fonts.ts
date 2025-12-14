/**
 * Font Configuration
 * 
 * Maps font weights to SF Pro Rounded font files
 */

export const fonts = {
  'SF-Pro-Rounded-Thin': require('@/assets/fonts/SF-Pro-Rounded-Thin.otf'),
  'SF-Pro-Rounded-Ultralight': require('@/assets/fonts/SF-Pro-Rounded-Ultralight.otf'),
  'SF-Pro-Rounded-Light': require('@/assets/fonts/SF-Pro-Rounded-Light.otf'),
  'SF-Pro-Rounded-Regular': require('@/assets/fonts/SF-Pro-Rounded-Regular.otf'),
  'SF-Pro-Rounded-Medium': require('@/assets/fonts/SF-Pro-Rounded-Medium.otf'),
  'SF-Pro-Rounded-Semibold': require('@/assets/fonts/SF-Pro-Rounded-Semibold.otf'),
  'SF-Pro-Rounded-Bold': require('@/assets/fonts/SF-Pro-Rounded-Bold.otf'),
  'SF-Pro-Rounded-Heavy': require('@/assets/fonts/SF-Pro-Rounded-Heavy.otf'),
  'SF-Pro-Rounded-Black': require('@/assets/fonts/SF-Pro-Rounded-Black.otf'),
};

/**
 * Font family name to use throughout the app
 */
export const FONT_FAMILY = 'SF-Pro-Rounded';

/**
 * Map React Native fontWeight values to SF Pro Rounded font files
 */
export const fontWeights = {
  '100': 'SF-Pro-Rounded-Thin',
  '200': 'SF-Pro-Rounded-Ultralight',
  '300': 'SF-Pro-Rounded-Light',
  '400': 'SF-Pro-Rounded-Regular',
  '500': 'SF-Pro-Rounded-Medium',
  '600': 'SF-Pro-Rounded-Semibold',
  '700': 'SF-Pro-Rounded-Bold',
  '800': 'SF-Pro-Rounded-Heavy',
  '900': 'SF-Pro-Rounded-Black',
  normal: 'SF-Pro-Rounded-Regular',
  bold: 'SF-Pro-Rounded-Bold',
  thin: 'SF-Pro-Rounded-Thin',
  ultralight: 'SF-Pro-Rounded-Ultralight',
  light: 'SF-Pro-Rounded-Light',
  medium: 'SF-Pro-Rounded-Medium',
  semibold: 'SF-Pro-Rounded-Semibold',
  heavy: 'SF-Pro-Rounded-Heavy',
  black: 'SF-Pro-Rounded-Black',
};

/**
 * Helper function to get font family based on fontWeight
 */
export function getFontFamily(fontWeight?: string | number): string {
  if (!fontWeight) {
    return FONT_FAMILY;
  }
  
  const weight = typeof fontWeight === 'number' ? fontWeight.toString() : fontWeight;
  return fontWeights[weight as keyof typeof fontWeights] || FONT_FAMILY;
}


