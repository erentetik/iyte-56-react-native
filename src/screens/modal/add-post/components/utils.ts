/**
 * Utility functions and module imports for Add Post Screen
 */

// Import ImagePicker with fallback for environments where native module is not available
let ImagePicker: typeof import('expo-image-picker') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ImagePicker = require('expo-image-picker');
} catch {
  console.warn('expo-image-picker native module not available');
}

export { ImagePicker };

