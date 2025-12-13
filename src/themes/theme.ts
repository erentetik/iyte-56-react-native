import { ColorValue, Platform } from 'react-native';
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

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
