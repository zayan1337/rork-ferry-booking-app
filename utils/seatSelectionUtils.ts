import { Seat } from '@/types';

export interface SeatSelectionResult {
  selectedSeats: Seat[];
  returnSelectedSeats: Seat[];
}

export interface SeatSelectionCallbacks {
  onSeatsChange: (seats: Seat[], isReturn?: boolean) => void;
  onError?: (error: string) => void;
  maxSeats?: number;
}

/**
 * Common seat selection utility function
 * This avoids the complex store-to-store communication that was causing app crashes
 */
export const toggleSeatSelection = (
  seat: Seat,
  currentSelectedSeats: Seat[],
  callbacks: SeatSelectionCallbacks,
  isReturn: boolean = false
): Seat[] => {
  try {
    const { onSeatsChange, onError, maxSeats } = callbacks;

    // Check if seat is already selected
    const isSelected = currentSelectedSeats.some(s => s.id === seat.id);

    let newSelectedSeats: Seat[];

    if (isSelected) {
      // Remove seat from selection
      newSelectedSeats = currentSelectedSeats.filter(s => s.id !== seat.id);
    } else {
      // Add seat to selection (if within limits)
      if (maxSeats && currentSelectedSeats.length >= maxSeats) {
        onError?.(`You can only select up to ${maxSeats} seats`);
        return currentSelectedSeats;
      }

      newSelectedSeats = [
        ...currentSelectedSeats,
        { ...seat, isSelected: true },
      ];
    }

    // Call the callback to update parent state
    onSeatsChange(newSelectedSeats, isReturn);

    return newSelectedSeats;
  } catch (error) {
    console.error('Error in seat selection:', error);
    callbacks.onError?.('Failed to select seat. Please try again.');
    return currentSelectedSeats;
  }
};

/**
 * Validate seat selection
 */
export const validateSeatSelection = (
  selectedSeats: Seat[],
  returnSelectedSeats: Seat[],
  passengerCount: number,
  isRoundTrip: boolean = false
): { isValid: boolean; error?: string } => {
  if (selectedSeats.length === 0) {
    return { isValid: false, error: 'Please select at least one seat' };
  }

  if (selectedSeats.length !== passengerCount) {
    return {
      isValid: false,
      error: `Please select exactly ${passengerCount} seat(s)`,
    };
  }

  if (isRoundTrip) {
    if (returnSelectedSeats.length === 0) {
      return { isValid: false, error: 'Please select return seats' };
    }

    if (returnSelectedSeats.length !== passengerCount) {
      return {
        isValid: false,
        error: `Please select exactly ${passengerCount} return seat(s)`,
      };
    }

    if (selectedSeats.length !== returnSelectedSeats.length) {
      return {
        isValid: false,
        error: 'Number of departure and return seats must match',
      };
    }
  }

  return { isValid: true };
};

/**
 * Update passengers array based on seat count
 */
export const updatePassengersForSeats = (
  currentPassengers: {
    fullName: string;
    idNumber?: string;
    specialAssistance?: string;
  }[],
  seatCount: number
): {
  fullName: string;
  idNumber?: string;
  specialAssistance?: string;
}[] => {
  const newPassengers = [];

  for (let i = 0; i < seatCount; i++) {
    newPassengers.push({
      fullName: currentPassengers[i]?.fullName || '',
      idNumber: currentPassengers[i]?.idNumber || '',
      specialAssistance: currentPassengers[i]?.specialAssistance || '',
    });
  }

  return newPassengers;
};
