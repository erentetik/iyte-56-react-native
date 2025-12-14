/**
 * Font Utilities
 * 
 * Helper functions to apply SF Pro Rounded fonts to styles
 */

import { FONT_FAMILY, getFontFamily } from '@/config/fonts';
import { TextStyle } from 'react-native';

/**
 * Add font family to a text style
 * Maps fontWeight to appropriate font file
 */
export function withFont(style: TextStyle): TextStyle {
  const { fontWeight, ...rest } = style;
  
  // If fontWeight is specified, use the appropriate font file
  if (fontWeight) {
    return {
      ...rest,
      fontFamily: getFontFamily(fontWeight),
      // Remove fontWeight as we're using different font files
      fontWeight: undefined,
    };
  }
  
  // Default to regular weight
  return {
    ...rest,
    fontFamily: FONT_FAMILY,
  };
}

/**
 * Create a text style with font applied
 */
export function textStyle(style: TextStyle = {}): TextStyle {
  return withFont(style);
}

/**
 * Get font family name for a specific weight
 */
export function getFont(weight?: string | number): string {
  return getFontFamily(weight);
}

/**
 * Default font family
 */
export const defaultFont = FONT_FAMILY;


