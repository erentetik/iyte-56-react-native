/**
 * StyleSheet Utilities
 * 
 * Wrapper for StyleSheet.create that automatically applies fonts to text styles
 */

import { FONT_FAMILY, getFontFamily } from '@/config/fonts';
import { StyleSheet, TextStyle } from 'react-native';

/**
 * Process a style object to add font family
 */
function processTextStyle(style: TextStyle): TextStyle {
  if (!style.fontSize && !style.fontWeight && !style.fontFamily) {
    // Not a text style, return as is
    return style;
  }

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
  
  // Default to regular weight if it's a text style
  if (style.fontSize || style.fontFamily) {
    return {
      ...rest,
      fontFamily: style.fontFamily || FONT_FAMILY,
    };
  }
  
  return style;
}

/**
 * Process all styles in a StyleSheet
 */
function processStyles<T extends Record<string, any>>(styles: T): T {
  const processed: any = {};
  
  for (const key in styles) {
    const style = styles[key];
    if (Array.isArray(style)) {
      processed[key] = style.map((s: TextStyle) => processTextStyle(s));
    } else if (typeof style === 'object' && style !== null) {
      processed[key] = processTextStyle(style);
    } else {
      processed[key] = style;
    }
  }
  
  return processed as T;
}

/**
 * Create a StyleSheet with fonts automatically applied
 */
export function createStyleSheet<T extends Record<string, any>>(styles: T): T {
  const processed = processStyles(styles);
  return StyleSheet.create(processed);
}

// Export original StyleSheet for non-text styles
export { StyleSheet } from 'react-native';

