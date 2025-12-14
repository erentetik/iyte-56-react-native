/**
 * Custom Text Component
 * 
 * Automatically applies SF Pro Rounded fonts based on fontWeight
 */

import { getFontFamily } from '@/config/fonts';
import React from 'react';
import { Text as RNText, TextProps, TextStyle } from 'react-native';

interface CustomTextProps extends TextProps {
  weight?: 'thin' | 'ultralight' | 'light' | 'regular' | 'medium' | 'semibold' | 'bold' | 'heavy' | 'black';
}

export function Text({ style, weight, ...props }: CustomTextProps) {
  const fontFamily = weight ? getFontFamily(weight) : getFontFamily('regular');
  
  const textStyle: TextStyle = {
    fontFamily,
  };

  // Merge with existing style
  const mergedStyle = Array.isArray(style) 
    ? [textStyle, ...style] 
    : style 
      ? [textStyle, style] 
      : textStyle;

  return <RNText style={mergedStyle} {...props} />;
}


