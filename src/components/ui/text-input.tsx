/**
 * Custom TextInput Component
 * 
 * Automatically applies SF Pro Rounded fonts
 */

import { FONT_FAMILY } from '@/config/fonts';
import React from 'react';
import { TextInput as RNTextInput, TextInputProps } from 'react-native';

export function TextInput({ style, ...props }: TextInputProps) {
  const defaultStyle = {
    fontFamily: FONT_FAMILY,
  };

  return (
    <RNTextInput
      style={[defaultStyle, style]}
      {...props}
    />
  );
}


