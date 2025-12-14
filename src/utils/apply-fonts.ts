/**
 * Apply Fonts Utility
 * 
 * Helper to add fontFamily to text styles in StyleSheet definitions
 * 
 * Usage:
 *   const styles = StyleSheet.create({
 *     text: applyFont({ fontSize: 16, fontWeight: '600' }),
 *   });
 */

import { FONT_FAMILY, getFontFamily } from '@/config/fonts';
import { TextStyle } from 'react-native';

/**
 * Apply font family to a text style
 * Automatically maps fontWeight to the correct font file
 */
export function applyFont(style: TextStyle = {}): TextStyle {
  const { fontWeight, fontFamily, ...rest } = style;
  
  // If fontWeight is specified, use the appropriate font file
  if (fontWeight) {
    return {
      ...rest,
      fontFamily: getFontFamily(fontWeight),
    };
  }
  
  // Use provided fontFamily or default to regular
  return {
    ...rest,
    fontFamily: fontFamily || FONT_FAMILY,
  };
}

/**
 * Helper to create text styles with font applied
 */
export function textStyle(style: TextStyle = {}): TextStyle {
  return applyFont(style);
}


