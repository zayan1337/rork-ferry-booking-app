import { Booking } from '@/types/agent';
import {
  BOOKING_BUFFER_MINUTES,
  ALLOWED_TRIP_STATUSES,
} from '@/constants/customer';
import {
  parseMaldivesDateTime,
  isMaldivesDateInPast,
  getMinutesUntilMaldivesDateTime,
} from './timezoneUtils';

/**
 * Check if a booking is expired based on its departure date.
 * Uses Maldives timezone for accurate comparison.
 *
 * @param booking - The booking object to check
 * @returns true if the booking's departure date has passed, false otherwise
 */
export const isBookingExpired = (booking: Booking | any): boolean => {
  if (!booking.departureDate) return false;

  // Extract just the date part if it's an ISO string
  const dateStr = booking.departureDate.split('T')[0];

  // Compare in Maldives timezone
  return isMaldivesDateInPast(dateStr);
};

/**
 * Check if a booking is considered active (confirmed/pending and not expired)
 * @param booking - The booking object to check
 * @returns true if the booking is active, false otherwise
 */
export const isBookingActive = (booking: Booking | any): boolean => {
  const activeStatuses = ['confirmed', 'pending'];
  return activeStatuses.includes(booking.status) && !isBookingExpired(booking);
};

/**
 * Check if a booking is considered inactive (cancelled, modified, or expired)
 * @param booking - The booking object to check
 * @returns true if the booking is inactive, false otherwise
 */
export const isBookingInactive = (booking: Booking | any): boolean => {
  const inactiveStatuses = ['cancelled', 'modified'];
  return inactiveStatuses.includes(booking.status) || isBookingExpired(booking);
};

/**
 * Filter bookings to get only active ones
 * @param bookings - Array of bookings to filter
 * @returns Array of active bookings
 */
export const getActiveBookings = (
  bookings: Booking[] | any[]
): (Booking | any)[] => {
  return bookings.filter(isBookingActive);
};

/**
 * Filter bookings to get only inactive ones
 * @param bookings - Array of bookings to filter
 * @returns Array of inactive bookings
 */
export const getInactiveBookings = (
  bookings: Booking[] | any[]
): (Booking | any)[] => {
  return bookings.filter(isBookingInactive);
};

/**
 * Calculate total fare for a booking using trip data (includes fare multiplier)
 * Note: base_fare is in route, fare_multiplier is in trip
 * @param trip - Departure trip (must include route with base_fare)
 * @param returnTrip - Return trip (optional)
 * @param selectedSeats - Selected departure seats
 * @param returnSelectedSeats - Selected return seats (optional)
 * @param tripType - Type of trip (one_way or round_trip)
 * @returns Object with calculated fares and validation status
 */
export const calculateBookingFare = (
  trip: any,
  returnTrip?: any,
  selectedSeats: any[] = [],
  returnSelectedSeats: any[] = [],
  tripType: 'one_way' | 'round_trip' = 'one_way'
) => {
  try {
    // Validate departure trip
    if (!trip) {
      return {
        departureFare: 0,
        returnFare: 0,
        totalFare: 0,
        isValid: false,
        errors: ['Departure trip is required'],
      };
    }

    // Calculate fare: route.base_fare × trip.fare_multiplier
    // base_fare comes from route, fare_multiplier comes from trip
    const baseFare = Number(trip.route?.base_fare || trip.base_fare) || 0;
    const fareMultiplier = Number(trip.fare_multiplier) || 1.0;
    const tripFare = baseFare * fareMultiplier;

    if (tripFare < 0) {
      return {
        departureFare: 0,
        returnFare: 0,
        totalFare: 0,
        isValid: false,
        errors: [`Invalid departure fare: ${tripFare}`],
      };
    }

    // Calculate departure fare
    const departureSeatCount = selectedSeats.length;
    const departureFare = departureSeatCount * tripFare;

    // Calculate return fare for round trips
    let returnFare = 0;
    const errors: string[] = [];

    if (tripType === 'round_trip') {
      if (!returnTrip) {
        errors.push('Return trip is required for round trips');
      } else {
        // Calculate return fare: route.base_fare × trip.fare_multiplier
        const returnBaseFare =
          Number(returnTrip.route?.base_fare || returnTrip.base_fare) || 0;
        const returnFareMultiplier = Number(returnTrip.fare_multiplier) || 1.0;
        const returnTripFare = returnBaseFare * returnFareMultiplier;

        if (returnTripFare < 0) {
          errors.push(`Invalid return fare: ${returnTripFare}`);
        } else {
          const returnSeatCount = returnSelectedSeats.length;
          returnFare = returnSeatCount * returnTripFare;
        }
      }
    }

    // Calculate total fare
    const totalFare = departureFare + returnFare;

    // Validate total fare
    if (isNaN(totalFare) || totalFare < 0) {
      errors.push(`Invalid total fare calculated: ${totalFare}`);
    }

    return {
      departureFare,
      returnFare,
      totalFare: errors.length > 0 ? 0 : totalFare,
      isValid: errors.length === 0,
      errors,
    };
  } catch (error) {
    console.error('Error calculating booking fare:', error);
    return {
      departureFare: 0,
      returnFare: 0,
      totalFare: 0,
      isValid: false,
      errors: ['Error calculating fare'],
    };
  }
};

/**
 * Calculate agent discounted fare
 * @param totalFare - Base total fare
 * @param discountRate - Agent discount rate (percentage)
 * @returns Object with discounted fare and validation status
 */
export const calculateDiscountedFare = (
  totalFare: number,
  discountRate: number
) => {
  try {
    // Validate inputs
    if (isNaN(totalFare) || totalFare < 0) {
      return {
        discountedFare: 0,
        isValid: false,
        errors: [`Invalid total fare: ${totalFare}`],
      };
    }

    const rate = Number(discountRate) || 0;
    if (rate < 0 || rate > 100) {
      return {
        discountedFare: 0,
        isValid: false,
        errors: [`Invalid discount rate: ${discountRate}%`],
      };
    }

    const discountedFare = totalFare * (1 - rate / 100);

    if (isNaN(discountedFare) || discountedFare < 0) {
      return {
        discountedFare: 0,
        isValid: false,
        errors: [`Invalid discounted fare calculated: ${discountedFare}`],
      };
    }

    return {
      discountedFare,
      isValid: true,
      errors: [],
    };
  } catch (error) {
    console.error('Error calculating discounted fare:', error);
    return {
      discountedFare: 0,
      isValid: false,
      errors: ['Error calculating discounted fare'],
    };
  }
};

/**
 * Validate booking data consistency
 * @param booking - Booking data to validate
 * @returns Object with validation status and errors
 */
export const validateBookingData = (booking: any) => {
  const errors: string[] = [];

  try {
    // Validate route exists
    if (!booking.route) {
      errors.push('Departure route is required');
    }

    // Validate departure date
    if (!booking.departureDate) {
      errors.push('Departure date is required');
    }

    // Validate trip exists
    if (!booking.trip) {
      errors.push('Departure trip is required');
    }

    // Validate round trip data
    if (booking.tripType === 'round_trip') {
      if (!booking.returnRoute) {
        errors.push('Return route is required for round trips');
      }
      if (!booking.returnDate) {
        errors.push('Return date is required for round trips');
      }
      if (!booking.returnTrip) {
        errors.push('Return trip is required for round trips');
      }
    }

    // Validate seat selection
    if (!booking.selectedSeats || booking.selectedSeats.length === 0) {
      errors.push('At least one departure seat must be selected');
    }

    // Validate round trip seat selection
    if (booking.tripType === 'round_trip') {
      if (
        !booking.returnSelectedSeats ||
        booking.returnSelectedSeats.length === 0
      ) {
        errors.push('At least one return seat must be selected');
      }

      // Validate seat count consistency
      if (booking.selectedSeats.length !== booking.returnSelectedSeats.length) {
        errors.push('Number of departure and return seats must match');
      }
    }

    // Validate passengers
    if (!booking.passengers || booking.passengers.length === 0) {
      errors.push('At least one passenger is required');
    }

    // Validate seat count matches passenger count
    if (booking.selectedSeats.length !== booking.passengers.length) {
      errors.push('Number of selected seats must match number of passengers');
    }

    // Validate round trip passenger consistency
    if (
      booking.tripType === 'round_trip' &&
      booking.returnSelectedSeats.length !== booking.passengers.length
    ) {
      errors.push('Number of return seats must match number of passengers');
    }

    // Validate passenger data
    if (booking.passengers) {
      booking.passengers.forEach((passenger: any, index: number) => {
        if (!passenger.fullName || passenger.fullName.trim() === '') {
          errors.push(`Passenger ${index + 1} name is required`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  } catch (error) {
    console.error('Error validating booking data:', error);
    return {
      isValid: false,
      errors: ['Error validating booking data'],
    };
  }
};

/**
 * Format fare for display
 * @param fare - Fare amount
 * @param currency - Currency code (default: MVR)
 * @returns Formatted fare string
 */
export const formatFare = (fare: number, currency: string = 'MVR'): string => {
  try {
    if (isNaN(fare) || fare < 0) {
      return `${currency} 0.00`;
    }
    return `${currency} ${fare.toFixed(2)}`;
  } catch (error) {
    console.error('Error formatting fare:', error);
    return `${currency} 0.00`;
  }
};

/**
 * Check if a trip has departed or is about to depart.
 * Uses Maldives timezone for accurate comparison since trip times are in Maldives local time.
 *
 * @param travelDate - Trip travel date (YYYY-MM-DD) - Maldives local date
 * @param departureTime - Trip departure time (HH:MM or HH:MM:SS) - Maldives local time
 * @param bufferMinutes - Buffer time before departure to prevent booking (default: BOOKING_BUFFER_MINUTES)
 * @returns true if trip is still bookable, false if departed or within buffer time
 */
export const isTripBookable = (
  travelDate: string,
  departureTime: string,
  bufferMinutes: number = BOOKING_BUFFER_MINUTES
): boolean => {
  try {
    if (!travelDate || !departureTime) {
      return false;
    }

    // Parse the trip datetime in Maldives timezone
    const tripDateTime = parseMaldivesDateTime(travelDate, departureTime);

    // Check if date parsing was successful
    if (isNaN(tripDateTime.getTime())) {
      console.error('Invalid trip date/time:', travelDate, departureTime);
      return false;
    }

    // Calculate cutoff time (trip time minus buffer)
    const bufferMs = bufferMinutes * 60 * 1000;
    const cutoffTime = tripDateTime.getTime() - bufferMs;

    // Compare with current time
    return Date.now() < cutoffTime;
  } catch (error) {
    console.error('Error checking if trip is bookable:', error);
    return false;
  }
};

/**
 * Get user-friendly message for why a trip cannot be booked.
 * Uses Maldives timezone for accurate comparison.
 *
 * @param travelDate - Trip travel date (YYYY-MM-DD) - Maldives local date
 * @param departureTime - Trip departure time (HH:MM or HH:MM:SS) - Maldives local time
 * @param bufferMinutes - Buffer time before departure (default: BOOKING_BUFFER_MINUTES)
 * @returns User-friendly error message
 */
export const getTripUnavailableMessage = (
  travelDate: string,
  departureTime: string,
  bufferMinutes: number = BOOKING_BUFFER_MINUTES
): string => {
  try {
    if (!travelDate || !departureTime) {
      return 'Trip information is incomplete.';
    }

    // Parse the trip datetime in Maldives timezone
    const tripDateTime = parseMaldivesDateTime(travelDate, departureTime);

    if (isNaN(tripDateTime.getTime())) {
      return 'Trip information is invalid.';
    }

    const now = Date.now();
    const bufferMs = bufferMinutes * 60 * 1000;
    const cutoffTime = tripDateTime.getTime() - bufferMs;

    if (tripDateTime.getTime() < now) {
      return 'This trip has already departed and is no longer available for booking.';
    } else if (now >= cutoffTime) {
      return `Booking closes ${bufferMinutes} minutes before departure. This trip is no longer available.`;
    } else {
      return 'This trip is no longer available for booking.';
    }
  } catch (error) {
    console.error('Error getting trip unavailable message:', error);
    return 'This trip is no longer available for booking.';
  }
};

/**
 * Calculate minutes until trip departure.
 * Uses Maldives timezone for accurate comparison.
 *
 * @param travelDate - Trip travel date (YYYY-MM-DD) - Maldives local date
 * @param departureTime - Trip departure time (HH:MM or HH:MM:SS) - Maldives local time
 * @returns Minutes until departure (negative if past departure)
 */
export const getMinutesUntilDeparture = (
  travelDate: string,
  departureTime: string
): number => {
  try {
    if (!travelDate || !departureTime) {
      return -1;
    }

    // Use timezone-aware calculation
    const minutes = getMinutesUntilMaldivesDateTime(travelDate, departureTime);

    // Check for invalid date parsing
    if (isNaN(minutes)) {
      return -1;
    }

    return minutes;
  } catch (error) {
    console.error('Error calculating minutes until departure:', error);
    return -1;
  }
};

/**
 * Check if trip status allows booking
 * @param status - Trip status (e.g., 'scheduled', 'boarding', 'departed')
 * @returns true if status allows booking, false otherwise
 */
export const isTripStatusBookable = (
  status: string | null | undefined
): boolean => {
  if (!status) return false;
  const normalizedStatus = status.toLowerCase();
  return ALLOWED_TRIP_STATUSES.some(
    allowedStatus => allowedStatus.toLowerCase() === normalizedStatus
  );
};

/**
 * Get user-friendly error message for trip status
 * @param status - Trip status
 * @returns Error message explaining why trip cannot be booked
 */
export const getTripStatusErrorMessage = (
  status: string | null | undefined
): string => {
  if (!status) {
    return 'Trip status is unknown. This trip cannot be booked.';
  }

  const normalizedStatus = status.toLowerCase();

  // Check if status is allowed
  if (
    ALLOWED_TRIP_STATUSES.some(
      allowedStatus => allowedStatus.toLowerCase() === normalizedStatus
    )
  ) {
    return ''; // No error, status is valid
  }

  switch (normalizedStatus) {
    case 'boarding':
      return 'This trip is currently boarding and cannot be booked.';
    case 'departed':
      return 'This trip has already departed and cannot be booked.';
    case 'completed':
      return 'This trip has been completed and cannot be booked.';
    case 'cancelled':
      return 'This trip has been cancelled and cannot be booked.';
    case 'arrived':
      return 'This trip has already arrived and cannot be booked.';
    case 'delayed':
      return 'This trip is delayed. Please contact support for booking assistance.';
    default:
      return `This trip status (${status}) does not allow booking. Only scheduled trips can be booked.`;
  }
};

/**
 * Comprehensive validation for trip booking eligibility
 * @param trip - Trip object with travel_date, departure_time, and status
 * @param bufferMinutes - Buffer time before departure (default: BOOKING_BUFFER_MINUTES)
 * @returns Object with validation result and error message
 */
export const validateTripForBooking = (
  trip: {
    travel_date: string;
    departure_time: string;
    status?: string | null;
    computed_status?: string | null;
  },
  bufferMinutes: number = BOOKING_BUFFER_MINUTES
): { isValid: boolean; error?: string } => {
  // Check status first
  const tripStatus = trip.status || trip.computed_status;
  if (!isTripStatusBookable(tripStatus)) {
    return {
      isValid: false,
      error: getTripStatusErrorMessage(tripStatus),
    };
  }

  // Check if trip is bookable based on time
  if (!isTripBookable(trip.travel_date, trip.departure_time, bufferMinutes)) {
    return {
      isValid: false,
      error: getTripUnavailableMessage(
        trip.travel_date,
        trip.departure_time,
        bufferMinutes
      ),
    };
  }

  return { isValid: true };
};
