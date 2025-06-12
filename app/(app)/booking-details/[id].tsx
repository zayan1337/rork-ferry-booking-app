import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Share2,
  Edit,
  XCircle
} from 'lucide-react-native';
import { useBookingStore } from '@/store/bookingStore';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';
import TicketCard from '@/components/TicketCard';

export default function BookingDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { bookings } = useBookingStore();

  // Find the booking by id
  const booking = bookings.find(b => b.id === id);

  if (!booking) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>Booking not found</Text>
        <Button
          title="Go Back"
          onPress={() => router.back()}
          style={styles.notFoundButton}
        />
      </View>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleShareTicket = async () => {
    try {
      await Share.share({
        message: `Ferry Booking #${booking.bookingNumber}\n
From: ${booking.route.fromIsland.name}
To: ${booking.route.toIsland.name}
Date: ${formatDate(booking.departureDate)}
Time: ${booking.departureTime}
Passengers: ${booking.passengers.length}
Seats: ${booking.seats.map(seat => seat.number).join(', ')}`,
        title: `Ferry Ticket #${booking.bookingNumber}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share the ticket');
    }
  };

  const handleModifyBooking = () => {
    // Check if booking is eligible for modification (72 hours rule)
    const departureDate = new Date(booking.departureDate);
    const now = new Date();
    const hoursDifference = (departureDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursDifference < 72) {
      Alert.alert(
        "Cannot Modify",
        "Bookings can only be modified at least 72 hours before departure."
      );
      return;
    }

    router.push(`/modify-booking/${booking.id}`);
  };

  const handleCancelBooking = () => {
    // Check if booking is eligible for cancellation (72 hours rule)
    const departureDate = new Date(booking.departureDate);
    const now = new Date();
    const hoursDifference = (departureDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursDifference < 72) {
      Alert.alert(
        "Cannot Cancel",
        "Bookings can only be cancelled at least 72 hours before departure."
      );
      return;
    }

    router.push(`/cancel-booking/${booking.id}`);
  };

  const isModifiable = () => {
    // Check if booking is eligible for modification (72 hours rule and status)
    if (booking.status !== 'confirmed') return false;

    const departureDate = new Date(booking.departureDate);
    const now = new Date();
    const hoursDifference = (departureDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    return hoursDifference >= 72;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={styles.bookingNumber}>Booking #{booking.bookingNumber}</Text>
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
      <Card variant="elevated" style={styles.detailsCard}>
        <Text style={styles.cardTitle}>Booking Details</Text>

        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Calendar size={20} color={Colors.primary} />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Departure Date</Text>
            <Text style={styles.detailValue}>{formatDate(booking.departureDate)}</Text>
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
                <Text style={styles.detailValue}>{formatDate(booking.returnDate)}</Text>
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
                {booking.returnRoute.fromIsland.name} → {booking.returnRoute.toIsland.name}
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

      {/* Passenger Details */}
      <Card variant="elevated" style={styles.passengersCard}>
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

      {/* Payment Details */}
      <Card variant="elevated" style={styles.paymentCard}>
        <Text style={styles.cardTitle}>Payment Details</Text>

        {booking.payment ? (
          <>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Payment Method</Text>
              <Text style={styles.paymentValue}>
                {booking.payment.method.split('_').map(word =>
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
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
          <Text style={styles.paymentValue}>No payment information available</Text>
        )}

        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>MVR {booking.totalFare.toFixed(2)}</Text>
        </View>
      </Card>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          title="Share Ticket"
          onPress={handleShareTicket}
          variant="outline"
          style={styles.actionButton}
          textStyle={styles.actionButtonText}
          fullWidth
        />

        {isModifiable() && (
          <>
            <Button
              title="Modify Booking"
              onPress={handleModifyBooking}
              variant="outline"
              style={styles.actionButton}
              textStyle={styles.modifyButtonText}
              fullWidth
            />

            <Button
              title="Cancel Booking"
              onPress={handleCancelBooking}
              variant="outline"
              style={styles.actionButton}
              textStyle={styles.cancelButtonText}
              fullWidth
            />
          </>
        )}
      </View>
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
    marginBottom: 16,
  },
  detailIcon: {
    width: 40,
    alignItems: 'center',
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
    color: Colors.text,
  },
  passengersCard: {
    marginBottom: 16,
  },
  passengerItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  passengerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  seatNumber: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  passengerDetail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  paymentCard: {
    marginBottom: 24,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '600',
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
    color: Colors.primary,
  },
  actionButtons: {
    marginBottom: 16,
  },
  actionButton: {
    marginBottom: 12,
  },
  actionButtonText: {
    color: Colors.primary,
  },
  modifyButton: {
    borderColor: Colors.secondary,
  },
  modifyButtonText: {
    color: Colors.secondary,
  },
  cancelButton: {
    borderColor: Colors.error,
  },
  cancelButtonText: {
    color: Colors.error,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notFoundText: {
    fontSize: 18,
    color: Colors.text,
    marginBottom: 20,
  },
  notFoundButton: {
    minWidth: 120,
  },
});