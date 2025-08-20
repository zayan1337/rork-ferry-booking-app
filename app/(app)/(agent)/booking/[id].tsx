import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useAgentStore } from '@/store/agent/agentStore';
import {
  BookingDetailsHeader,
  TripDetailsCard,
  PassengerDetailsCard,
  ClientInfoCard,
  PaymentDetailsCard,
  BookingActions,
  BookingPoliciesCard,
} from '@/components/booking';
import TicketCard from '@/components/TicketCard';
import Button from '@/components/Button';
import { shareBookingTicket } from '@/utils/bookingDetailsUtils';
import Colors from '@/constants/colors';

export default function BookingDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { bookings, clients, updateBookingStatus } = useAgentStore();
  const [loading, setLoading] = useState(false);

  // Find the booking by id
  const booking = bookings.find(b => b.id === id);

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

  const handleUpdateStatus = async (status: string) => {
    try {
      setLoading(true);
      await updateBookingStatus(booking.id, status as any);
      Alert.alert('Success', `Booking marked as ${status}`);
    } catch (error) {
      console.error('Error updating booking status:', error);
      Alert.alert('Error', 'Failed to update booking status');
    } finally {
      setLoading(false);
    }
  };

  // Prepare data for components
  const ticketBookingData = {
    ...booking,
    totalFare: Number(booking.totalAmount) || 0,
    createdAt: String(booking.bookingDate || new Date().toISOString()),
    bookingNumber: String(booking.bookingNumber || booking.id || 'N/A'),
    tripType: String(booking.tripType || 'one_way'),
    departureTime: String(booking.departureTime || '00:00'),
    route:
      booking.route ||
      ({
        id: 'unknown',
        fromIsland: {
          id: 'from',
          name: String(booking.origin || 'Unknown'),
          zone: 'A',
        },
        toIsland: {
          id: 'to',
          name: String(booking.destination || 'Unknown'),
          zone: 'A',
        },
        baseFare: Number(booking.totalAmount) || 0,
      } as any),
    seats: Array.isArray(booking.seats) ? booking.seats : [],
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Booking Details',
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Header with booking number and status */}
        <BookingDetailsHeader
          bookingNumber={String(booking.bookingNumber || 'N/A')}
          status={String(booking.status || 'unknown')}
          onShare={handleShareTicket}
        />

        {/* Ticket Card with QR Code */}
        <TicketCard booking={ticketBookingData as any} />

        {/* Trip Details */}
        <TripDetailsCard
          departureDate={booking.departureDate}
          departureTime={booking.departureTime}
          returnDate={booking.returnDate}
          tripType={booking.tripType}
          route={booking.route || undefined}
          origin={booking.origin}
          destination={booking.destination}
          passengerCount={
            booking.passengers?.length || booking.passengerCount || 0
          }
          vessel={booking.vessel || undefined}
          status={booking.status}
        />

        {/* Passenger Details */}
        <PassengerDetailsCard
          passengers={booking.passengers || []}
          seats={booking.seats || []}
        />

        {/* Client Information */}
        <ClientInfoCard
          clientName={booking.clientName}
          clientEmail={booking.clientEmail}
          clientPhone={booking.clientPhone}
          clientHasAccount={booking.clientHasAccount}
          clients={clients}
        />

        {/* Payment Details */}
        <PaymentDetailsCard
          totalAmount={Number(booking.totalAmount) || 0}
          discountedAmount={
            booking.discountedAmount
              ? Number(booking.discountedAmount)
              : undefined
          }
          paymentMethod={booking.paymentMethod}
          payment={booking.payment || undefined}
          commission={
            booking.commission ? Number(booking.commission) : undefined
          }
        />

        {/* Booking Policies */}
        <BookingPoliciesCard />

        {/* Action Buttons */}
        <BookingActions
          bookingId={String(booking.id || '')}
          status={String(booking.status || '')}
          departureDate={booking.departureDate}
          tripType={booking.tripType}
          returnDate={booking.returnDate}
          loading={loading}
          onShare={handleShareTicket}
          onUpdateStatus={handleUpdateStatus}
        />

        <Text style={styles.bookingId}>
          Booking ID: {String(booking.id || 'N/A')}
        </Text>
      </ScrollView>
    </>
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
  bookingId: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
});
