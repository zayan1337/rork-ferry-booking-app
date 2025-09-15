import { Share, Alert, Platform } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { File } from 'expo-file-system';
import type { Booking } from '@/types';
import { formatBookingDate } from './dateUtils';

/**
 * Share booking ticket as an image
 * @param booking - Booking object to share
 * @param ticketRef - Reference to the TicketDesign component
 * @returns Promise that resolves when sharing is complete
 */
export const shareBookingTicketAsImage = async (
  booking: Booking,
  ticketRef: React.RefObject<any>
): Promise<void> => {
  try {
    if (!ticketRef.current) {
      await shareBookingTicketAsText(booking);
      return;
    }

    // Small delay to ensure component is fully rendered
    await new Promise(resolve => setTimeout(resolve, 100));

    // Capture the ticket as image
    const uri = await captureRef(ticketRef, {
      format: 'png',
      quality: 1.0,
      result: 'tmpfile',
    });

    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      await shareBookingTicketAsText(booking);
      return;
    }

    // Share the image
    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle: `Ferry Ticket #${booking.bookingNumber}`,
      UTI: 'public.png',
    });

    // Clean up temporary file
    try {
      const file = new File(uri);
      await file.delete();
    } catch (cleanupError) {
      // Silent cleanup failure
    }
  } catch (error) {
    // Fallback to text sharing
    await shareBookingTicketAsText(booking);
  }
};

/**
 * Share booking ticket information as text (fallback)
 * @param booking - Booking object to share
 * @returns Promise that resolves when sharing is complete
 */
export const shareBookingTicketAsText = async (
  booking: Booking
): Promise<void> => {
  try {
    const message = `Crystal Transfer Vaavu Booking #${booking.bookingNumber}

From: ${booking.route.fromIsland.name}
To: ${booking.route.toIsland.name}
Date: ${formatBookingDate(booking.departureDate)}
Time: ${booking.departureTime}
Passengers: ${booking.passengers.length}
Seats: ${booking.seats.map(seat => seat.number).join(', ')}

${booking.qrCodeUrl ? `QR Code: ${booking.qrCodeUrl}` : ''}`;

    const shareOptions = {
      message,
      title: `Ferry Ticket #${booking.bookingNumber}`,
      ...(Platform.OS === 'ios' && { url: booking.qrCodeUrl }),
    };

    await Share.share(shareOptions);
  } catch (error) {
    Alert.alert('Error', 'Could not share the ticket');
  }
};

/**
 * Main share function - attempts image share first, falls back to text
 * @param booking - Booking object to share
 * @param ticketRef - Optional reference to the TicketDesign component
 * @returns Promise that resolves when sharing is complete
 */
export const shareBookingTicket = async (
  booking: Booking,
  ticketRef?: React.RefObject<any>
): Promise<void> => {
  if (ticketRef?.current) {
    await shareBookingTicketAsImage(booking, ticketRef);
  } else {
    await shareBookingTicketAsText(booking);
  }
};
