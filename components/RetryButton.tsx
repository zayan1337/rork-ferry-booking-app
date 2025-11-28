import React from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface RetryButtonProps {
  onPress: () => void;
  message?: string;
  loading?: boolean;
}

export default function RetryButton({
  onPress,
  message = 'Retry',
  loading = false,
}: RetryButtonProps) {
  return (
    <Pressable
      style={[styles.button, loading && styles.buttonDisabled]}
      onPress={onPress}
      disabled={loading}
    >
      <RefreshCw
        size={18}
        color={loading ? Colors.textSecondary : Colors.primary}
        style={loading && styles.iconSpinning}
      />
      <Text style={[styles.text, loading && styles.textDisabled]}>
        {message}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  textDisabled: {
    color: Colors.textSecondary,
  },
  iconSpinning: {
    // Note: You may need to add animation for spinning icon
    // For now, this is a placeholder
  },
});
