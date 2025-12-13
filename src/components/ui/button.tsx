import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { ActivityIndicator, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';

interface ButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  style?: ViewStyle;
}

export function Button({
  children,
  onPress,
  variant = 'default',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  ...props
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const baseStyle: ViewStyle = {
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  };

  const sizeStyles: Record<string, ViewStyle> = {
    sm: { paddingHorizontal: 16, paddingVertical: 8, minHeight: 32 },
    md: { paddingHorizontal: 24, paddingVertical: 12, minHeight: 44 },
    lg: { paddingHorizontal: 32, paddingVertical: 16, minHeight: 52 },
  };

  const variantStyles: Record<string, ViewStyle> = {
    default: {
      backgroundColor: isDark ? '#1DA1F2' : '#1DA1F2',
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: isDark ? '#333' : '#ccc',
    },
    ghost: {
      backgroundColor: 'transparent',
    },
  };

  const textStyles: Record<string, TextStyle> = {
    default: {
      color: '#fff',
      fontWeight: '700',
    },
    outline: {
      color: isDark ? '#fff' : '#000',
      fontWeight: '700',
    },
    ghost: {
      color: isDark ? '#fff' : '#000',
      fontWeight: '600',
    },
  };

  const textSizeStyles: Record<string, TextStyle> = {
    sm: { fontSize: 14 },
    md: { fontSize: 16 },
    lg: { fontSize: 18 },
  };

  return (
    <TouchableOpacity
      style={[baseStyle, sizeStyles[size], variantStyles[variant], disabled && { opacity: 0.5 }, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'default' ? '#fff' : (isDark ? '#fff' : '#000')} />
      ) : (
        <Text style={[textStyles[variant], textSizeStyles[size]]}>{children}</Text>
      )}
    </TouchableOpacity>
  );
}

