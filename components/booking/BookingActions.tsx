import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import Button from '@/components/Button';
import { useRouter } from 'expo-router';

interface BookingActionsProps {
  bookingId: string;
  status: string;
  departureDate: string;
  tripType?: string;
  returnDate?: string;
  loading?: boolean;
  onShare: () => void;
  onUpdateStatus?: (status: string) => void;
  paymentStatus?: string;
  isModifiable?: boolean;
  isCancellable?: boolean;
}

const BookingActions: React.FC<BookingActionsProps> = ({
  bookingId,
  status,
  departureDate,
  tripType,
  returnDate,
  loading = false,
  onShare,
  onUpdateStatus,
  paymentStatus,
  isModifiable: propIsModifiable,
  isCancellable: propIsCancellable,
}) => {
  const router = useRouter();

  const isModifiable = () => {
    // Use prop value if provided, otherwise fallback to status check
    if (propIsModifiable !== undefined) {
      return propIsModifiable;
    }
    const allowedStatuses = ['confirmed'];
    return allowedStatuses.includes(status);
  };

  const isCancellable = () => {
    // Use prop value if provided, otherwise fallback to status check
    if (propIsCancellable !== undefined) {
      return propIsCancellable;
    }
    const allowedStatuses = ['confirmed'];
    return allowedStatuses.includes(status);
  };

  const checkTimeRestriction = (callback: () => void) => {
    const departure = new Date(departureDate);
    const now = new Date();
    const hoursDifference =
      (departure.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursDifference < 72) {
      return false;
    }
    return true;
  };

  const handleModifyBooking = () => {
    if (!bookingId) {
      Alert.alert('Error', 'Invalid booking ID');
      return;
    }

    const canModify = checkTimeRestriction(() => {});

    const showTicketSelection = () => {
      if (tripType === 'round_trip' && returnDate) {
        Alert.alert(
          'Select Ticket to Modify',
          'Which ticket would you like to modify?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Departure Ticket',
              onPress: () =>
                router.push(
                  `/(agent)/agent-modify-booking/${bookingId}?ticketType=departure` as any
                ),
            },
            {
              text: 'Return Ticket',
              onPress: () =>
                router.push(
                  `/(agent)/agent-modify-booking/${bookingId}?ticketType=return` as any
                ),
            },
          ]
        );
      } else {
        router.push(
          `/(agent)/agent-modify-booking/${bookingId}?ticketType=departure` as any
        );
      }
    };

    if (!canModify) {
      Alert.alert(
        'Cannot Modify',
        'Bookings can only be modified at least 72 hours before departure. As an agent, you can override this policy if needed.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Override & Modify', onPress: showTicketSelection },
        ]
      );
      return;
    }

    showTicketSelection();
  };

  const handleCancelBooking = () => {
    if (!bookingId) {
      Alert.alert('Error', 'Invalid booking ID');
      return;
    }

    const canCancel = checkTimeRestriction(() => {});

    if (!canCancel) {
      Alert.alert(
        'Cancel Booking',
        'Standard policy requires 72 hours notice for cancellation. As an agent, you can override this policy and process the cancellation with appropriate refund terms.',
        [
          { text: 'Go Back', style: 'cancel' },
          {
            text: 'Process Cancellation',
            onPress: () =>
              router.push(`/(agent)/agent-cancel-booking/${bookingId}` as any),
          },
        ]
      );
      return;
    }

    router.push(`/(agent)/agent-cancel-booking/${bookingId}` as any);
  };

  const handleMarkCompleted = () => {
    Alert.alert(
      'Mark as Completed',
      'Are you sure you want to mark this booking as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => onUpdateStatus?.('completed'),
        },
      ]
    );
  };

  return (
    <View style={styles.actionButtons}>
      {/* Only show Share Ticket button for confirmed bookings with completed payment */}
      {status === 'confirmed' && paymentStatus === 'completed' && (
        <Button
          title='Share Ticket'
          onPress={onShare}
          variant='outline'
          style={styles.actionButton}
          textStyle={styles.actionButtonText}
        />
      )}

      {isModifiable() && (
        <Button
          title='Modify Booking'
          onPress={handleModifyBooking}
          variant='outline'
          style={styles.actionButton}
          textStyle={styles.modifyButtonText}
        />
      )}

      {isCancellable() && (
        <Button
          title='Cancel Booking'
          onPress={handleCancelBooking}
          variant='outline'
          style={styles.actionButton}
          textStyle={styles.cancelButtonText}
          loading={loading}
        />
      )}

      {status === 'confirmed' && onUpdateStatus && (
        <Button
          title='Mark as Completed'
          onPress={handleMarkCompleted}
          variant='secondary'
          style={styles.actionButton}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  actionButtons: {
    marginBottom: 16,
  },
  actionButton: {
    marginBottom: 12,
  },
  actionButtonText: {
    // Default button text styling
  },
  modifyButtonText: {
    // Modify button specific styling
  },
  cancelButtonText: {
    // Cancel button specific styling
  },
});

export default BookingActions;
