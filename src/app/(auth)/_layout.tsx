import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function AuthLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        gestureEnabled: true,
        fullScreenGestureEnabled: Platform.OS === 'ios',
        animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
      }}
    >
      <Stack.Screen 
        name="login" 
        options={{
          gestureEnabled: false, // Disable on root screen
        }}
      />
      <Stack.Screen 
        name="setup" 
        options={{
          gestureEnabled: true,
          fullScreenGestureEnabled: Platform.OS === 'ios',
        }}
      />
    </Stack>
  );
}

