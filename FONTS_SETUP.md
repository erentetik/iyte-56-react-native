# Font Setup Guide

This app uses **SF Pro Rounded** fonts from `assets/fonts/`. All fonts are automatically loaded when the app starts.

## Font Weights Available

- **Thin** (100)
- **Ultralight** (200)
- **Light** (300)
- **Regular** (400) - Default
- **Medium** (500)
- **Semibold** (600)
- **Bold** (700)
- **Heavy** (800)
- **Black** (900)

## How to Use Fonts

### Method 1: Using `applyFont` utility (Recommended)

Use the `applyFont` helper function in your StyleSheet definitions:

```typescript
import { applyFont } from '@/utils/apply-fonts';
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  title: {
    ...applyFont({
      fontSize: 24,
      fontWeight: '700', // Will use SF-Pro-Rounded-Bold
    }),
  },
  body: {
    ...applyFont({
      fontSize: 16,
      fontWeight: '400', // Will use SF-Pro-Rounded-Regular
    }),
  },
  subtitle: {
    ...applyFont({
      fontSize: 18,
      fontWeight: '600', // Will use SF-Pro-Rounded-Semibold
    }),
  },
});
```

### Method 2: Using Custom Text Component

Use the custom `Text` component that automatically applies fonts:

```typescript
import { Text } from '@/components/ui/text';

<Text weight="bold" style={{ fontSize: 16 }}>
  This text uses SF Pro Rounded Bold
</Text>

<Text weight="medium" style={{ fontSize: 14 }}>
  This text uses SF Pro Rounded Medium
</Text>
```

### Method 3: Direct fontFamily usage

You can also directly specify the font family:

```typescript
import { getFontFamily } from '@/config/fonts';

const styles = StyleSheet.create({
  text: {
    fontFamily: getFontFamily('bold'),
    fontSize: 16,
  },
});
```

## Font Weight Mapping

The `applyFont` function automatically maps React Native `fontWeight` values to the correct font file:

- `'100'` or `'thin'` → SF-Pro-Rounded-Thin
- `'200'` or `'ultralight'` → SF-Pro-Rounded-Ultralight
- `'300'` or `'light'` → SF-Pro-Rounded-Light
- `'400'` or `'normal'` or `'regular'` → SF-Pro-Rounded-Regular (default)
- `'500'` or `'medium'` → SF-Pro-Rounded-Medium
- `'600'` or `'semibold'` → SF-Pro-Rounded-Semibold
- `'700'` or `'bold'` → SF-Pro-Rounded-Bold
- `'800'` or `'heavy'` → SF-Pro-Rounded-Heavy
- `'900'` or `'black'` → SF-Pro-Rounded-Black

## Important Notes

1. **Font Loading**: Fonts are loaded in `app/_layout.tsx`. The app waits for fonts to load before showing content.

2. **fontWeight Removal**: When using `applyFont`, the `fontWeight` property is removed from the style object because we use separate font files for each weight. React Native's `fontWeight` won't work with custom font files.

3. **Default Font**: If no `fontWeight` is specified, the Regular weight (400) is used by default.

4. **Performance**: All fonts are loaded at app startup, so there's no performance impact when switching between weights.

## Migration Guide

To migrate existing styles to use custom fonts:

1. Import `applyFont`:
   ```typescript
   import { applyFont } from '@/utils/apply-fonts';
   ```

2. Wrap text styles with `applyFont`:
   ```typescript
   // Before
   const styles = StyleSheet.create({
     text: {
       fontSize: 16,
       fontWeight: '600',
     },
   });

   // After
   const styles = StyleSheet.create({
     text: {
       ...applyFont({
         fontSize: 16,
         fontWeight: '600',
       }),
     },
   });
   ```

3. For styles without fontWeight, you can still use `applyFont` to ensure the default font is applied:
   ```typescript
   text: {
     ...applyFont({
       fontSize: 16,
     }),
   }
   ```
