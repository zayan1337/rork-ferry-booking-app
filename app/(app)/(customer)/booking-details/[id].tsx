import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Share2,
  Edit,
  XCircle,
} from 'lucide-react-native';
import { useUserBookingsStore } from '@/store/userBookingsStore';
import { useBookingEligibility } from '@/hooks/useBookingEligibility';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';
import TicketCard from '@/components/TicketCard';
import { shareBookingTicket } from '@/utils/shareUtils';
import { formatBookingDate } from '@/utils/dateUtils';
import { formatPaymentMethod } from '@/utils/paymentUtils';

export default function BookingDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { bookings, fetchUserBookings } = useUserBookingsStore();

  // Ensure bookings are loaded when component mounts
  useEffect(() => {
    if (bookings.length === 0) {
      fetchUserBookings();
    }
  }, [fetchUserBookings, bookings.length]);

  // Find the booking by id with proper type handling
  const booking = bookings.find(b => String(b.id) === String(id)) ?? null;

  // Use booking eligibility hook
  const { isModifiable, isCancellable, message } = useBookingEligibility({
    booking,
  });

  if (!booking) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>Booking not found</Text>
        <Button
          title='Go Back'
          onPress={() => router.back()}
          style={styles.notFoundButton}
        />
      </View>
    );
  }

  const handleShareTicket = async () => {
    await shareBookingTicket(booking);
  };

  const handleModifyBooking = () => {
    if (!isModifiable) {
      Alert.alert(
        'Cannot Modify',
        message || 'This booking cannot be modified'
      );
      return;
    }

    router.push(`/modify-booking/${booking.id}`);
  };

  const handleCancelBooking = () => {
    if (!isCancellable) {
      Alert.alert(
        'Cannot Cancel',
        message || 'This booking cannot be cancelled'
      );
      return;
    }

    router.push(`/cancel-booking/${booking.id}`);
  };

  const renderBookingDetails = () => (
    <Card variant='elevated' style={styles.detailsCard}>
      <Text style={styles.cardTitle}>Booking Details</Text>

      <View style={styles.detailRow}>
        <View style={styles.detailIcon}>
          <Calendar size={20} color={Colors.primary} />
        </View>
        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>Departure Date</Text>
          <Text style={styles.detailValue}>
            {formatBookingDate(booking.departureDate)}
          </Text>
        </View>
      </View>

      <View style={styles.detailRow}>
        <View style={styles.detailIcon}>
          <Clock size={20} color={Colors.primary} />
        </View>
        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>Departure Time</Text>
          <Text style={styles.detailValue}>{booking.departureTime}</Text>
        </View>
      </View>

      {booking.tripType === 'round_trip' && booking.returnDate && (
        <>
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Calendar size={20} color={Colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Return Date</Text>
              <Text style={styles.detailValue}>
                {formatBookingDate(booking.returnDate)}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Clock size={20} color={Colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Return Time</Text>
              <Text style={styles.detailValue}>{booking.returnTime}</Text>
            </View>
          </View>
        </>
      )}

      <View style={styles.detailRow}>
        <View style={styles.detailIcon}>
          <MapPin size={20} color={Colors.primary} />
        </View>
        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>Route</Text>
          <Text style={styles.detailValue}>
            {booking.route.fromIsland.name} → {booking.route.toIsland.name}
          </Text>
        </View>
      </View>

      {booking.tripType === 'round_trip' && booking.returnRoute && (
        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <MapPin size={20} color={Colors.primary} />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Return Route</Text>
            <Text style={styles.detailValue}>
              {booking.returnRoute.fromIsland.name} →{' '}
              {booking.returnRoute.toIsland.name}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.detailRow}>
        <View style={styles.detailIcon}>
          <Users size={20} color={Colors.primary} />
        </View>
        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>Passengers</Text>
          <Text style={styles.detailValue}>{booking.passengers.length}</Text>
        </View>
      </View>
    </Card>
  );

  const renderPassengerDetails = () => (
    <Card variant='elevated' style={styles.passengersCard}>
      <Text style={styles.cardTitle}>Passenger Details</Text>

      {booking.passengers.map((passenger, index) => (
        <View key={index} style={styles.passengerItem}>
          <View style={styles.passengerHeader}>
            <Text style={styles.passengerName}>{passenger.fullName}</Text>
            <Text style={styles.seatNumber}>
              Seat: {booking.seats[index]?.number}
            </Text>
          </View>

          {passenger.idNumber && (
            <Text style={styles.passengerDetail}>ID: {passenger.idNumber}</Text>
          )}

          {passenger.specialAssistance && (
            <Text style={styles.passengerDetail}>
              Special Assistance: {passenger.specialAssistance}
            </Text>
          )}
        </View>
      ))}
    </Card>
  );

  const renderPaymentDetails = () => (
    <Card variant='elevated' style={styles.paymentCard}>
      <Text style={styles.cardTitle}>Payment Details</Text>

      {booking.payment ? (
        <>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Payment Method</Text>
            <Text style={styles.paymentValue}>
              {formatPaymentMethod(booking.payment.method)}
            </Text>
          </View>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Payment Status</Text>
            <Text
              style={[
                styles.paymentValue,
                booking.payment.status === 'completed' && styles.paymentPaid,
                booking.payment.status === 'pending' && styles.paymentPending,
                booking.payment.status === 'failed' && styles.paymentFailed,
              ]}
            >
              {booking.payment.status.toUpperCase()}
            </Text>
          </View>
        </>
      ) : (
        <Text style={styles.paymentValue}>
          No payment information available
        </Text>
      )}

      <View style={styles.paymentRow}>
        <Text style={styles.paymentLabel}>Total Amount</Text>
        <Text style={styles.totalAmount}>
          MVR {booking.totalFare.toFixed(2)}
        </Text>
      </View>
    </Card>
  );

  const renderActionButtons = () => (
    <View style={styles.actionButtons}>
      <Button
        title='Share Ticket'
        onPress={handleShareTicket}
        variant='outline'
        style={styles.actionButton}
        textStyle={styles.actionButtonText}
      />

      {(isModifiable || isCancellable) && (
        <>
          <Button
            title='Modify Booking'
            onPress={handleModifyBooking}
            variant='outline'
            style={styles.actionButton}
            textStyle={styles.modifyButtonText}
            disabled={!isModifiable}
          />

          <Button
            title='Cancel Booking'
            onPress={handleCancelBooking}
            variant='outline'
            style={styles.actionButton}
            textStyle={styles.cancelButtonText}
            disabled={!isCancellable}
          />
        </>
      )}
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={styles.bookingNumber}>
          Booking #{booking.bookingNumber}
        </Text>
        <View
          style={[
            styles.statusBadge,
            booking.status === 'confirmed' && styles.statusConfirmed,
            booking.status === 'completed' && styles.statusCompleted,
            booking.status === 'cancelled' && styles.statusCancelled,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              booking.status === 'confirmed' && styles.statusTextConfirmed,
              booking.status === 'completed' && styles.statusTextCompleted,
              booking.status === 'cancelled' && styles.statusTextCancelled,
            ]}
          >
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Text>
        </View>
      </View>

      {/* Ticket Card */}
      <TicketCard booking={booking} />

      {/* Booking Details */}
      {renderBookingDetails()}

      {/* Passenger Details */}
      {renderPassengerDetails()}

      {/* Payment Details */}
      {renderPaymentDetails()}

      {/* Action Buttons */}
      {renderActionButtons()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
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
  detailsCard: {
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
    alignItems: 'center',
    marginBottom: 16,
  },
  detailIcon: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  passengersCard: {
    marginBottom: 16,
  },
  passengerItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  passengerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  seatNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
    backgroundColor: Colors.card,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  passengerDetail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  paymentCard: {
    marginBottom: 16,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  paymentPaid: {
    color: Colors.success,
  },
  paymentPending: {
    color: Colors.warning,
  },
  paymentFailed: {
    color: Colors.error,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
  actionButtonText: {
    color: Colors.primary,
  },
  modifyButtonText: {
    color: Colors.primary,
  },
  cancelButtonText: {
    color: Colors.error,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  notFoundText: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  notFoundButton: {
    minWidth: 120,
  },
});
