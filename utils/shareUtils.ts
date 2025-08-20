import { Share, Alert } from 'react-native';
import type { Booking } from '@/types';
import { formatBookingDate } from './dateUtils';

/**
 * Share booking ticket information
 * @param booking - Booking object to share
 * @returns Promise that resolves when sharing is complete
 */
export const shareBookingTicket = async (booking: Booking): Promise<void> => {
  try {
    const message = `Ferry Booking #${booking.bookingNumber}

From: ${booking.route.fromIsland.name}
To: ${booking.route.toIsland.name}
Date: ${formatBookingDate(booking.departureDate)}
Time: ${booking.departureTime}
Passengers: ${booking.passengers.length}
Seats: ${booking.seats.map(seat => seat.number).join(', ')}`;

    await Share.share({
      message,
      title: `Ferry Ticket #${booking.bookingNumber}`,
    });
  } catch (error) {
    console.error('Error sharing ticket:', error);
    Alert.alert('Error', 'Could not share the ticket');
  }
};
