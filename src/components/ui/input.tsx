import React from 'react';
import { TextInput, StyleSheet, TextInputProps, View, Text } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  className?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: isDark ? '#fff' : '#000' }]}>{label}</Text>
      )}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
            color: isDark ? '#fff' : '#000',
            borderColor: error ? '#ef4444' : (isDark ? '#333' : '#e0e0e0'),
          },
          style,
        ]}
        placeholderTextColor={isDark ? '#666' : '#999'}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
});

