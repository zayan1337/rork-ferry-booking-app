import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '@/components/Card';
import { formatCurrency } from '@/utils/agentFormatters';
import Colors from '@/constants/colors';
import { formatBookingDate, formatTimeAMPM } from '@/utils/dateUtils';

interface CurrentTicketDetailsCardProps {
  bookingNumber: string;
  clientName: string;
  clientEmail?: string;
  route?: {
    fromIsland?: { name: string };
    toIsland?: { name: string };
  };
  origin?: string;
  destination?: string;
  currentDate: string;
  currentTime?: string | null;
  currentSeats: any[];
  totalAmount: number;
  ticketLabel: string;
}

const CurrentTicketDetailsCard: React.FC<CurrentTicketDetailsCardProps> = ({
  bookingNumber,
  clientName,
  route,
  clientEmail,
  currentTime,
  origin,
  destination,
  currentDate,
  currentSeats,
  totalAmount,
  ticketLabel,
}) => {
  // const formatBookingDate = (dateString: string) => {
  //   return dateString ? new Date(dateString).toLocaleDateString() : 'N/A';
  // };

  const formatSeats = (seats: any[]) => {
    return seats?.map((seat: any) => seat.number).join(', ') || 'N/A';
  };

  const formatRoute = () => {
    const from = route?.fromIsland?.name || origin || 'Unknown';
    const to = route?.toIsland?.name || destination || 'Unknown';
    return `${from} → ${to}`;
  };

  return (
    <Card variant='elevated' style={styles.bookingCard}>
      <Text style={styles.cardTitle}>Current {ticketLabel} Ticket Details</Text>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Booking Number:</Text>
        <Text style={styles.detailValue}>{bookingNumber}</Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Client Name:</Text>
        <Text style={styles.detailValue}>
          {clientName?.trim() || 'Unknown Client'}
        </Text>
      </View>

      {clientEmail ? (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Email:</Text>
          <Text style={styles.detailValue}>{clientEmail}</Text>
        </View>
      ) : null}

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Route:</Text>
        <Text style={styles.detailValue}>{formatRoute()}</Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Current Date:</Text>
        <Text style={styles.detailValue}>{formatBookingDate(currentDate)}</Text>
      </View>

      {currentTime ? (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Departure Time:</Text>
          <Text style={styles.detailValue}>{formatTimeAMPM(currentTime)}</Text>
        </View>
      ) : null}

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Current Seats:</Text>
        <Text style={styles.detailValue}>{formatSeats(currentSeats)}</Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Original Amount:</Text>
        <Text style={styles.detailValue}>{formatCurrency(totalAmount)}</Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  bookingCard: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'right',
  },
});

export default CurrentTicketDetailsCard;
