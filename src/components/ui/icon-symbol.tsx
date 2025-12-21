// Use SF Symbols (expo-symbols) on iOS, with Material Icons fallback for Android/Web

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolView, SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { Platform, StyleProp, TextStyle, ViewStyle } from 'react-native';

// Map SF Symbol names to Material Icon names for Android/Web fallback
const ICON_MAPPING: Record<string, string> = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'bell.fill': 'notifications',
  'person.fill': 'person',
  'square.and.pencil': 'edit',
  'gearshape.fill': 'settings',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'heart.fill': 'favorite',
  'heart': 'favorite-border',
  'square.and.arrow.up': 'share',
  'exclamationmark.triangle': 'report',
  'message': 'comment',
  'arrow.2.squarepath': 'repeat',
  'rocket.fill': 'rocket-launch',
  'rocket': 'rocket-launch',
};

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android/Web.
 * SF Symbols are Apple's native icon system with thousands of beautifully designed icons.
 * See available icons in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
export function IconSymbol({
  name,
  size = 24,
  color = '#000000',
  style,
  weight = 'regular',
}: {
  name: SymbolViewProps['name'];
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  const iconColor = color || '#000000';
  
  // Use SF Symbols on iOS
  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        weight={weight}
        tintColor={iconColor}
        resizeMode="scaleAspectFit"
        name={name}
        style={[
          {
            width: size,
            height: size,
          },
          style,
        ]}
      />
    );
  }

  // Fallback to Material Icons on Android/Web
  const materialIconName = ICON_MAPPING[name as string] || 'help-outline';
  return (
    <MaterialIcons
      name={materialIconName as any}
      size={size}
      color={iconColor}
      style={style as StyleProp<TextStyle>}
    />
  );
}
