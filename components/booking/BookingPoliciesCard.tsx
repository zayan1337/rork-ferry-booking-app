import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '@/components/Card';
import Colors from '@/constants/colors';

const BookingPoliciesCard: React.FC = () => {
  return (
    <Card variant='elevated' style={styles.policyCard}>
      <Text style={styles.cardTitle}>Booking Policies</Text>

      <View style={styles.policyItem}>
        <Text style={styles.policyTitle}>Cancellation Policy</Text>
        <Text style={styles.policyText}>
          • Bookings can be cancelled up to 72 hours before departure
        </Text>
        <Text style={styles.policyText}>
          • Cancellation within 72 hours may incur charges
        </Text>
        <Text style={styles.policyText}>
          • No-show bookings are non-refundable
        </Text>
      </View>

      <View style={styles.policyItem}>
        <Text style={styles.policyTitle}>Modification Policy</Text>
        <Text style={styles.policyText}>
          • Bookings can be modified up to 72 hours before departure
        </Text>
        <Text style={styles.policyText}>
          • Subject to seat availability and fare differences
        </Text>
      </View>

      <View style={styles.policyItem}>
        <Text style={styles.policyTitle}>Check-in Information</Text>
        <Text style={styles.policyText}>
          • Check-in opens 2 hours before departure
        </Text>
        <Text style={styles.policyText}>
          • Please arrive at least 30 minutes before departure
        </Text>
        <Text style={styles.policyText}>
          • Present this QR code ticket at check-in
        </Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  policyCard: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  policyItem: {
    marginBottom: 16,
  },
  policyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  policyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
    lineHeight: 20,
  },
});

export default BookingPoliciesCard;
