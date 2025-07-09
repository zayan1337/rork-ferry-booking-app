import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import { formatCurrency } from '@/utils/agentFormatters';

interface BookingSummaryData {
  client: string;
  tripType: string;
  route: string;
  returnRoute?: string | null;
  departureDate: string;
  returnDate?: string | null;
  passengers: number;
  seats: string;
  returnSeats?: string;
  totalAmount: number;
}

interface BookingSummaryProps {
  summary: BookingSummaryData;
  title?: string;
  style?: any;
}

const BookingSummary: React.FC<BookingSummaryProps> = ({
  summary,
  title = "Booking Summary",
  style,
}) => {
  return (
    <Card variant="elevated" style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Client:</Text>
        <Text style={styles.value}>{summary.client}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Trip Type:</Text>
        <Text style={styles.value}>{summary.tripType}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Route:</Text>
        <Text style={styles.value}>{summary.route}</Text>
      </View>

      {summary.returnRoute && (
        <View style={styles.row}>
          <Text style={styles.label}>Return Route:</Text>
          <Text style={styles.value}>{summary.returnRoute}</Text>
        </View>
      )}

      <View style={styles.row}>
        <Text style={styles.label}>Departure Date:</Text>
        <Text style={styles.value}>{summary.departureDate}</Text>
      </View>

      {summary.returnDate && (
        <View style={styles.row}>
          <Text style={styles.label}>Return Date:</Text>
          <Text style={styles.value}>{summary.returnDate}</Text>
        </View>
      )}

      <View style={styles.row}>
        <Text style={styles.label}>Passengers:</Text>
        <Text style={styles.value}>{summary.passengers}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Seats:</Text>
        <Text style={styles.value}>{summary.seats}</Text>
      </View>

      {summary.returnSeats && summary.returnSeats !== 'None' && (
        <View style={styles.row}>
          <Text style={styles.label}>Return Seats:</Text>
          <Text style={styles.value}>{summary.returnSeats}</Text>
        </View>
      )}

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total Amount:</Text>
        <Text style={styles.totalValue}>
          {formatCurrency(summary.totalAmount)}
        </Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: Colors.highlight,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'right',
    flex: 1,
    marginLeft: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
});

export default BookingSummary; 