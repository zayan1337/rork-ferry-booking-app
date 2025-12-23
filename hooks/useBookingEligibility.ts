import { useMemo } from 'react';
import type { Booking } from '@/types';
import type { BookingEligibility } from '@/types/pages/booking';
import { parseMaldivesDateTime } from '@/utils/timezoneUtils';

interface UseBookingEligibilityProps {
  booking: Booking | null;
  minimumCancellationHours?: number;
  minimumModificationHours?: number;
  isFromModification?: boolean; // Indicates if booking was created from a modification
}

export const useBookingEligibility = ({
  booking,
  minimumCancellationHours = 48, // As per ticket policy: 48+ hours for cancellation
  minimumModificationHours = 72, // As per ticket policy: 72+ hours for modification
  isFromModification = false, // Flag to indicate if booking is from modification
}: UseBookingEligibilityProps): BookingEligibility => {
  return useMemo(() => {
    if (!booking) {
      return {
        isModifiable: false,
        isCancellable: false,
        message: 'Booking not found',
        hoursUntilDeparture: 0,
      };
    }

    // Check if booking is modified (old booking)
    if (booking.status === 'modified') {
      return {
        isModifiable: false,
        isCancellable: false,
        message:
          'This booking has been modified. Modified bookings cannot be cancelled or modified again.',
        hoursUntilDeparture: 0,
      };
    }

    // Check if booking is a new booking created from modification
    if (isFromModification) {
      return {
        isModifiable: false,
        isCancellable: false,
        message:
          'This booking was created from a modification. Modified bookings cannot be cancelled or modified again.',
        hoursUntilDeparture: 0,
      };
    }

    if (booking.status !== 'confirmed') {
      return {
        isModifiable: false,
        isCancellable: false,
        message: 'Only confirmed bookings can be modified or cancelled',
        hoursUntilDeparture: 0,
      };
    }

    // Parse departure in Maldives timezone for accurate comparison
    const departureDateTime = parseMaldivesDateTime(
      booking.departureDate,
      booking.departureTime || '00:00'
    );
    const now = Date.now();
    const hoursUntilDeparture =
      (departureDateTime.getTime() - now) / (1000 * 60 * 60);

    const isModifiable = hoursUntilDeparture >= minimumModificationHours;
    const isCancellable = hoursUntilDeparture >= minimumCancellationHours;

    let message: string | undefined;
    if (!isModifiable && !isCancellable) {
      message = `Bookings can only be modified at least ${minimumModificationHours} hours before departure and cancelled at least ${minimumCancellationHours} hours before departure`;
    } else if (!isModifiable) {
      message = `Bookings can only be modified at least ${minimumModificationHours} hours before departure`;
    } else if (!isCancellable) {
      message = `Bookings can only be cancelled at least ${minimumCancellationHours} hours before departure`;
    }

    return {
      isModifiable,
      isCancellable,
      message,
      hoursUntilDeparture,
    };
  }, [
    booking,
    minimumCancellationHours,
    minimumModificationHours,
    isFromModification,
  ]);
};
