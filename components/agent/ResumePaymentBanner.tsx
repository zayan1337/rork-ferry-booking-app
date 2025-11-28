import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock } from 'lucide-react-native';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';

interface ResumePaymentBannerProps {
  bookingNumber: string;
  countdown: {
    minutes: number;
    seconds: number;
    totalSeconds: number;
  } | null;
  expiryReason?: 'booking_timeout' | 'departure_time';
  onResume: () => void;
  onCancel: () => void;
}

export default function ResumePaymentBanner({
  bookingNumber,
  countdown,
  expiryReason,
  onResume,
  onCancel,
}: ResumePaymentBannerProps) {
  const formatCountdown = () => {
    if (!countdown) return '--:--';
    const pad = (value: number) => value.toString().padStart(2, '0');
    return `${pad(countdown.minutes)}:${pad(countdown.seconds)}`;
  };

  return (
    <Card variant='elevated' style={styles.container}>
      <View style={styles.header}>
        <Clock size={20} color={Colors.primary} />
        <Text style={styles.title}>
          Complete Payment for Booking #{bookingNumber}
        </Text>
      </View>
      <Text style={styles.text}>
        Seats are reserved for{' '}
        <Text style={styles.time}>{formatCountdown()}</Text>
        {expiryReason === 'departure_time' && (
          <Text style={styles.note}> (until departure time)</Text>
        )}
        . Resume payment now or cancel the booking to release the seats.
      </Text>
      <View style={styles.actions}>
        <Button
          title='Continue Payment'
          onPress={onResume}
          style={styles.button}
        />
        <Button
          title='Cancel Booking'
          onPress={onCancel}
          variant='outline'
          style={styles.button}
          textStyle={styles.cancelButtonText}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  text: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  time: {
    fontWeight: '700',
    color: Colors.primary,
  },
  note: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
  },
  cancelButtonText: {
    color: Colors.error,
  },
});

