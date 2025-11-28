import React from 'react';
import { Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface PaymentCountdownProps {
  minutes: number;
  seconds: number;
  isExpiring?: boolean; // When < 2 minutes remaining
}

export default function PaymentCountdown({
  minutes,
  seconds,
  isExpiring = false,
}: PaymentCountdownProps) {
  const pad = (value: number) => value.toString().padStart(2, '0');
  const formatted = `${pad(minutes)}:${pad(seconds)}`;

  return (
    <Text
      style={[
        styles.countdown,
        isExpiring && styles.countdownExpiring,
      ]}
    >
      {formatted}
    </Text>
  );
}

const styles = StyleSheet.create({
  countdown: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: 'monospace',
  },
  countdownExpiring: {
    color: Colors.error,
  },
});

