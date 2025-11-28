import React from 'react';
import { View, StyleSheet } from 'react-native';
import Button from '@/components/Button';
import { useRouter } from 'expo-router';
import { useAlertContext } from '@/components/AlertProvider';

interface BookingActionsProps {
  bookingId: string;
  status: string;
  tripType?: string | null;
  returnDate?: string | null;
  paymentStatus?: string;
  onShare: () => void;
  isModifiable?: boolean;
  isCancellable?: boolean;
  eligibilityMessage?: string | null;
}

const BookingActions: React.FC<BookingActionsProps> = ({
  bookingId,
  status,
  tripType,
  returnDate,
  paymentStatus,
  onShare,
  isModifiable = false,
  isCancellable = false,
  eligibilityMessage,
}) => {
  const router = useRouter();
  const { showInfo, alert } = useAlertContext();

  const unavailableMessage =
    eligibilityMessage ||
    'This action is not available for the selected booking because it is too close to the departure time.';

  const pushToModify = (segment: 'departure' | 'return') => {
    router.push(
      `/(agent)/agent-modify-booking/${bookingId}?ticketType=${segment}` as any
    );
  };

  const handleModifyBooking = () => {
    if (!bookingId) {
      return;
    }

    if (!isModifiable) {
      showInfo('Cannot Modify Booking', unavailableMessage);
      return;
    }

    if (tripType === 'round_trip' && returnDate) {
      alert('Select Segment', 'Which segment would you like to modify?', [
        {
          text: 'Departure Ticket',
          onPress: () => pushToModify('departure'),
        },
        {
          text: 'Return Ticket',
          onPress: () => pushToModify('return'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]);
      return;
    }

    pushToModify('departure');
  };

  const handleCancelBooking = () => {
    if (!bookingId) {
      return;
    }

    if (!isCancellable) {
      showInfo('Cannot Cancel Booking', unavailableMessage);
      return;
    }

    router.push(`/(agent)/agent-cancel-booking/${bookingId}` as any);
  };

  // Only show share button for confirmed, completed, and checked_in bookings
  const canShare =
    (status === 'confirmed' ||
      status === 'completed' ||
      status === 'checked_in') &&
    paymentStatus === 'completed';

  return (
    <View style={styles.actionButtons}>
      {/* Show share option when ticket is paid and status allows sharing */}
      {canShare && (
        <Button
          title='Share Ticket'
          onPress={onShare}
          variant='outline'
          style={styles.actionButton}
          textStyle={styles.actionButtonText}
        />
      )}

      {isModifiable && (
        <Button
          title='Modify Booking'
          onPress={handleModifyBooking}
          variant='outline'
          style={styles.actionButton}
          textStyle={styles.modifyButtonText}
        />
      )}

      {isCancellable && (
        <Button
          title='Cancel Booking'
          onPress={handleCancelBooking}
          variant='outline'
          style={styles.actionButton}
          textStyle={styles.cancelButtonText}
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
