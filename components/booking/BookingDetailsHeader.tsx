import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Share2 } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface BookingStatus {
  status: string;
  getStatusBadgeStyle: (status: string) => object;
  getStatusTextStyle: (status: string) => object;
}

interface BookingDetailsHeaderProps {
  bookingNumber: string;
  status: string;
  onShare: () => void;
}

const BookingDetailsHeader: React.FC<BookingDetailsHeaderProps> = ({
  bookingNumber,
  status,
  onShare,
}) => {
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'confirmed':
        return styles.statusConfirmed;
      case 'completed':
        return styles.statusCompleted;
      case 'cancelled':
        return styles.statusCancelled;
      case 'modified':
        return styles.statusModified;
      case 'pending':
        return styles.statusPending;
      case 'checked_in':
        return styles.statusCompleted;
      default:
        return {};
    }
  };

  const getStatusTextStyle = (status: string) => {
    switch (status) {
      case 'confirmed':
        return styles.statusTextConfirmed;
      case 'completed':
        return styles.statusTextCompleted;
      case 'cancelled':
        return styles.statusTextCancelled;
      case 'modified':
        return styles.statusTextModified;
      case 'pending':
        return styles.statusTextPending;
      case 'checked_in':
        return styles.statusTextCompleted;
      default:
        return {};
    }
  };

  // Only show share button for confirmed, completed, and checked_in bookings
  const canShare =
    status === 'confirmed' || status === 'completed' || status === 'checked_in';

  return (
    <View style={styles.header}>
      <Text style={styles.bookingNumber}>Booking #{bookingNumber}</Text>
      <View style={styles.headerRight}>
        <View style={[styles.statusBadge, getStatusBadgeStyle(status)]}>
          <Text style={[styles.statusText, getStatusTextStyle(status)]}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Text>
        </View>
        {canShare && (
          <Pressable style={styles.shareButton} onPress={onShare}>
            <Share2 size={20} color={Colors.primary} />
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  bookingNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.inactive,
  },
  statusConfirmed: {
    backgroundColor: '#e8f5e9',
  },
  statusCompleted: {
    backgroundColor: '#e3f2fd',
  },
  statusCancelled: {
    backgroundColor: '#ffebee',
  },
  statusModified: {
    backgroundColor: '#fff3e0',
  },
  statusPending: {
    backgroundColor: '#f3e5f5',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  statusTextConfirmed: {
    color: Colors.success,
  },
  statusTextCompleted: {
    color: Colors.primary,
  },
  statusTextCancelled: {
    color: Colors.error,
  },
  statusTextModified: {
    color: Colors.warning,
  },
  statusTextPending: {
    color: '#9c27b0',
  },
  shareButton: {
    padding: 8,
  },
});

export default BookingDetailsHeader;
