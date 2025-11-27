import { BOOKING_BUFFER_MINUTES } from '@/constants/customer';

export interface ExpiryCalculationResult {
  expiresAt: Date;
  reason: 'booking_timeout' | 'departure_time';
  minutesRemaining: number;
  isExpired: boolean;
}

/**
 * Calculate the expiry time for a pending payment booking
 *
 * Logic:
 * - If booking created > 10 minutes before departure → expire 10 minutes after booking creation
 * - If booking created within 10 minutes of departure → expire at departure time
 *
 * @param bookingCreatedAt - When the booking was created
 * @param tripDeparture - When the trip departs (combine travel_date + departure_time)
 * @param bufferMinutes - Buffer time in minutes (default: 10)
 * @returns Expiry calculation result with expiry time, reason, and remaining minutes
 */
export function calculateBookingExpiry(
  bookingCreatedAt: Date | string,
  tripDeparture: Date | string,
  bufferMinutes: number = BOOKING_BUFFER_MINUTES
): ExpiryCalculationResult {
  const created =
    typeof bookingCreatedAt === 'string'
      ? new Date(bookingCreatedAt)
      : bookingCreatedAt;
  const departure =
    typeof tripDeparture === 'string' ? new Date(tripDeparture) : tripDeparture;

  const bufferMs = bufferMinutes * 60 * 1000;
  const timeUntilDeparture = departure.getTime() - created.getTime();

  let expiresAt: Date;
  let reason: 'booking_timeout' | 'departure_time';

  if (timeUntilDeparture > bufferMs) {
    // Booking created > buffer before departure → expire buffer after creation
    expiresAt = new Date(created.getTime() + bufferMs);
    reason = 'booking_timeout';
  } else {
    // Booking created within buffer of departure → expire at departure
    expiresAt = departure;
    reason = 'departure_time';
  }

  const now = Date.now();
  const minutesRemaining = Math.max(
    0,
    Math.floor((expiresAt.getTime() - now) / 60000)
  );
  const isExpired = now >= expiresAt.getTime();

  return {
    expiresAt,
    reason,
    minutesRemaining,
    isExpired,
  };
}

/**
 * Check if a booking has expired based on smart expiry logic
 *
 * @param bookingCreatedAt - When the booking was created
 * @param tripDeparture - When the trip departs
 * @param bufferMinutes - Buffer time in minutes (default: 10)
 * @returns true if booking has expired
 */
export function isBookingExpired(
  bookingCreatedAt: Date | string,
  tripDeparture: Date | string,
  bufferMinutes: number = BOOKING_BUFFER_MINUTES
): boolean {
  const { isExpired } = calculateBookingExpiry(
    bookingCreatedAt,
    tripDeparture,
    bufferMinutes
  );
  return isExpired;
}

/**
 * Combine travel date and departure time into a single Date object
 *
 * @param travelDate - Date string (YYYY-MM-DD)
 * @param departureTime - Time string (HH:MM or HH:MM:SS)
 * @returns Combined Date object
 */
export function combineTripDateTime(
  travelDate: string,
  departureTime: string
): Date {
  // Parse travel date
  const date = new Date(travelDate);

  // Parse departure time (handle both HH:MM and HH:MM:SS formats)
  const timeParts = departureTime.split(':');
  const hours = parseInt(timeParts[0], 10);
  const minutes = parseInt(timeParts[1], 10);

  // Create combined date-time
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);

  return combined;
}
