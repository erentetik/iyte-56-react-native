import { FONT_FAMILY } from '@/config/fonts';
import { ColorValue } from 'react-native';
import { darkColors, lightColors } from './colors';

export type Theme = {
  colors: typeof lightColors;
  fixedColors: {
    background: ColorValue;
    backgroundEmphasis: ColorValue;
  };
};

export const defaultLightTheme: Theme = {
  colors: lightColors,
  fixedColors: {
    background: lightColors.background,
    backgroundEmphasis: lightColors.backgroundEmphasis,
  },
};

export const defaultDarkTheme: Theme = {
  colors: darkColors,
  fixedColors: {
    background: darkColors.background,
    backgroundEmphasis: darkColors.backgroundEmphasis,
  },
};

// Legacy Colors export for backward compatibility
export const Colors = {
  light: {
    text: lightColors.neutral[12],
    background: lightColors.background,
    tint: lightColors.orange[9],
    icon: lightColors.neutral[9],
    tabIconDefault: lightColors.neutral[9],
    tabIconSelected: lightColors.orange[9],
  },
  dark: {
    text: darkColors.neutral[12],
    background: darkColors.background,
    tint: darkColors.orange[9],
    icon: darkColors.neutral[9],
    tabIconDefault: darkColors.neutral[9],
    tabIconSelected: darkColors.orange[9],
  },
};

export const Fonts = {
  /** SF Pro Rounded font family */
  rounded: FONT_FAMILY,
  /** Default font (SF Pro Rounded) */
  default: FONT_FAMILY,
  /** Sans font (SF Pro Rounded) */
  sans: FONT_FAMILY,
  /** Serif font (SF Pro Rounded) */
  serif: FONT_FAMILY,
  /** Monospace font (SF Pro Rounded) */
  mono: FONT_FAMILY,
};
