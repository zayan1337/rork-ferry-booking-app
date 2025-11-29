import { supabase } from './supabase';

/**
 * Cancellation details structure
 */
export interface CancellationDetails {
  refund_amount: number;
  status: string;
  created_at: string;
}

/**
 * Booking structure for revenue calculation
 */
export interface BookingForRevenue {
  id: string;
  status: string;
  total_fare: number;
}

/**
 * Revenue statuses that count as full revenue
 */
const REVENUE_STATUSES = ['confirmed', 'checked_in', 'completed'];

/**
 * Calculate net revenue for a booking accounting for partial refunds
 *
 * Business Logic:
 * - Confirmed/checked_in/completed bookings: Full total_fare as revenue
 * - Cancelled bookings with refund: Net revenue = total_fare - refund_amount (remaining amount kept)
 * - Cancelled bookings without payment: 0 revenue (no payment was made)
 * - Other statuses (reserved, pending_payment): 0 revenue (payment not completed)
 *
 * @param booking - Booking object with status and total_fare
 * @param cancellationMap - Map of booking_id to cancellation details (refund_amount, status, created_at)
 * @returns Net revenue amount
 */
export const calculateNetRevenue = (
  booking: BookingForRevenue,
  cancellationMap: Map<string, CancellationDetails>
): number => {
  const totalFare = Number(booking.total_fare || 0);

  if (booking.status === 'cancelled') {
    const cancellation = cancellationMap.get(booking.id);
    if (!cancellation) {
      // No cancellation record - no payment was made, no revenue
      return 0;
    }

    // If refund_amount is 0, no refund was given (no payment was made), so no revenue
    if (cancellation.refund_amount === 0) {
      return 0;
    }

    // Calculate net revenue = total_fare - refund_amount (amount kept after partial refund)
    // Example: Booking MVR 1000, refund MVR 500 → Revenue = MVR 500 (amount kept)
    return Math.max(0, totalFare - cancellation.refund_amount);
  } else if (REVENUE_STATUSES.includes(booking.status)) {
    // For confirmed/checked_in/completed: full revenue
    return totalFare;
  }
  // For other statuses (reserved, pending_payment): no revenue
  return 0;
};

/**
 * Fetch cancellation records for bookings
 *
 * @param bookingIds - Array of booking IDs
 * @returns Map of booking_id to cancellation details
 */
export const fetchCancellationDetails = async (
  bookingIds: string[]
): Promise<Map<string, CancellationDetails>> => {
  if (!bookingIds || bookingIds.length === 0) {
    return new Map();
  }

  try {
    const { data: allCancellations, error: cancellationsError } = await supabase
      .from('cancellations')
      .select('booking_id, refund_amount, cancellation_fee, status, created_at')
      .in('booking_id', bookingIds);

    if (cancellationsError) {
      console.error(
        '[Revenue Calculation] Error fetching cancellations:',
        cancellationsError
      );
      return new Map();
    }

    const cancellationMap = new Map<string, CancellationDetails>();

    if (allCancellations && allCancellations.length > 0) {
      allCancellations.forEach(cancellation => {
        cancellationMap.set(cancellation.booking_id, {
          refund_amount: Number(cancellation.refund_amount || 0),
          status: cancellation.status || 'pending',
          created_at: cancellation.created_at || new Date().toISOString(),
        });
      });
    }

    return cancellationMap;
  } catch (error) {
    console.error(
      '[Revenue Calculation] Error in fetchCancellationDetails:',
      error
    );
    return new Map();
  }
};

/**
 * Calculate total revenue for multiple bookings
 *
 * @param bookings - Array of bookings
 * @param cancellationMap - Map of cancellation details
 * @returns Total net revenue
 */
export const calculateTotalRevenue = (
  bookings: BookingForRevenue[],
  cancellationMap: Map<string, CancellationDetails>
): number => {
  return bookings.reduce((sum, booking) => {
    const netRevenue = calculateNetRevenue(booking, cancellationMap);
    return sum + netRevenue;
  }, 0);
};

/**
 * Calculate total revenue for multiple bookings (with async cancellation fetching)
 *
 * @param bookings - Array of bookings
 * @returns Total net revenue
 */
export const calculateTotalRevenueAsync = async (
  bookings: BookingForRevenue[]
): Promise<number> => {
  if (!bookings || bookings.length === 0) {
    return 0;
  }

  const bookingIds = bookings.map(b => b.id);
  const cancellationMap = await fetchCancellationDetails(bookingIds);
  return calculateTotalRevenue(bookings, cancellationMap);
};
