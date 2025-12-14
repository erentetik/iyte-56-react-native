/**
 * Font Utilities Hook
 * 
 * Provides helper functions to apply SF Pro Rounded fonts to text styles
 */

import { FONT_FAMILY, getFontFamily } from '@/config/fonts';
import { TextStyle } from 'react-native';

/**
 * Apply font family to a text style based on fontWeight
 */
export function applyFontStyle(style?: TextStyle | TextStyle[]): TextStyle {
  const baseStyle: TextStyle = {
    fontFamily: FONT_FAMILY,
  };

  if (!style) {
    return baseStyle;
  }

  const styles = Array.isArray(style) ? style : [style];
  const mergedStyle = Object.assign({}, ...styles);
  
  // If fontWeight is specified, use the appropriate font file
  if (mergedStyle.fontWeight) {
    const fontFamily = getFontFamily(mergedStyle.fontWeight);
    return {
      ...mergedStyle,
      fontFamily,
      // Remove fontWeight as we're using different font files for weights
      fontWeight: undefined,
    };
  }

  return {
    ...mergedStyle,
    ...baseStyle,
  };
}

/**
 * Get font style for a specific weight
 */
export function getFontStyle(weight?: string | number): TextStyle {
  return {
    fontFamily: getFontFamily(weight),
  };
}


