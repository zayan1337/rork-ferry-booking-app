import { useMemo } from 'react';
import type { Booking } from '@/types';
import type { BookingEligibility } from '@/types/pages/booking';

interface UseBookingEligibilityProps {
  booking: Booking | null;
  minimumHours?: number;
}

export const useBookingEligibility = ({ 
  booking, 
  minimumHours = 72 
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

    if (booking.status !== 'confirmed') {
      return {
        isModifiable: false,
        isCancellable: false,
        message: 'Only confirmed bookings can be modified or cancelled',
        hoursUntilDeparture: 0,
      };
    }

    const departureDate = new Date(booking.departureDate);
    const now = new Date();
    const hoursUntilDeparture = (departureDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    const isEligible = hoursUntilDeparture >= minimumHours;

    return {
      isModifiable: isEligible,
      isCancellable: isEligible,
      message: isEligible 
        ? undefined 
        : `Bookings can only be modified or cancelled at least ${minimumHours} hours before departure`,
      hoursUntilDeparture,
    };
  }, [booking, minimumHours]);
}; 