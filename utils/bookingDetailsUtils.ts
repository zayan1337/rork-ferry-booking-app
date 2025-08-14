import { Share, Alert } from 'react-native';

// Formatting utilities
export const formatBookingDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

// Status styling utilities
export const getStatusColor = (status: string) => {
  const Colors = require('@/constants/colors').default;

  switch (status) {
    case 'confirmed':
      return Colors.success;
    case 'completed':
      return Colors.primary;
    case 'cancelled':
      return Colors.error;
    case 'modified':
      return Colors.warning;
    case 'pending':
      return Colors.inactive;
    default:
      return Colors.inactive;
  }
};

// Share functionality
export const shareBookingTicket = async (booking: any) => {
  try {
    const shareMessage =
      `Ferry Booking #${booking.bookingNumber}\n` +
      `From: ${booking.route?.fromIsland?.name || booking.origin}\n` +
      `To: ${booking.route?.toIsland?.name || booking.destination}\n` +
      `Date: ${formatBookingDate(booking.departureDate)}\n` +
      `Time: ${booking.departureTime}\n` +
      `Passengers: ${booking.passengers?.length || booking.passengerCount}\n` +
      `Client: ${booking.clientName}\n` +
      `Agent Booking`;

    await Share.share({
      message: shareMessage,
      title: `Ferry Ticket #${booking.bookingNumber}`,
    });
  } catch (error) {
    Alert.alert('Error', 'Could not share the ticket');
  }
};

// Business logic utilities
export const isBookingModifiable = (status: string) => {
  const allowedStatuses = ['confirmed'];
  return allowedStatuses.includes(status);
};

export const isBookingCancellable = (status: string) => {
  const allowedStatuses = ['confirmed'];
  return allowedStatuses.includes(status);
};

export const checkTimeRestriction = (departureDate: string) => {
  const departure = new Date(departureDate);
  const now = new Date();
  const hoursDifference =
    (departure.getTime() - now.getTime()) / (1000 * 60 * 60);

  return hoursDifference >= 72;
};
