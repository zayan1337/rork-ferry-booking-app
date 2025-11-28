import { supabase } from './supabase';

/**
 * Rollback operations for booking creation cleanup
 */
export interface RollbackOperation {
  execute: () => Promise<void>;
  description: string;
}

/**
 * Execute rollback operations in reverse order
 */
export async function executeRollback(
  rollbackStack: RollbackOperation[]
): Promise<void> {
  // Execute rollback in reverse order
  const errors: string[] = [];

  for (const operation of rollbackStack.reverse()) {
    try {
      await operation.execute();
    } catch (error: any) {
      console.error(
        `[Rollback] Failed to execute: ${operation.description}`,
        error
      );
      errors.push(`${operation.description}: ${error.message}`);
      // Continue with other rollback operations even if one fails
    }
  }

  if (errors.length > 0) {
    console.error('[Rollback] Some cleanup operations failed:', errors);
    // Log to monitoring service if available
  }
}

/**
 * Create rollback operation for booking deletion
 * IMPORTANT: This automatically releases seat reservations before deleting
 * to avoid foreign key constraint violations
 */
export function createBookingRollback(bookingId: string): RollbackOperation {
  return {
    description: `Delete booking ${bookingId}`,
    execute: async () => {
      // First, ensure all seat reservations are released (booking_id set to NULL)
      // This prevents foreign key constraint violations
      // Also release passengers' seat references
      const { error: seatError } = await supabase
        .from('seat_reservations')
        .update({
          booking_id: null,
          is_reserved: false,
          is_available: true,
          last_activity: new Date().toISOString(),
          reservation_expiry: null,
          temp_reserved_at: null,
          temp_reservation_expiry: null,
        })
        .eq('booking_id', bookingId);

      if (seatError) {
        console.warn(
          `[Rollback] Warning: Failed to release seat reservations before deleting booking: ${seatError.message}`
        );
        // Continue anyway - try to delete booking
      }

      // Now delete the booking
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId);

      if (error) {
        throw new Error(`Failed to delete booking: ${error.message}`);
      }
    },
  };
}

/**
 * Create rollback operation for passengers deletion
 */
export function createPassengersRollback(bookingId: string): RollbackOperation {
  return {
    description: `Delete passengers for booking ${bookingId}`,
    execute: async () => {
      const { error } = await supabase
        .from('passengers')
        .delete()
        .eq('booking_id', bookingId);

      if (error) {
        throw new Error(`Failed to delete passengers: ${error.message}`);
      }
    },
  };
}

/**
 * Create rollback operation for seat reservations release by booking_id
 * This is more reliable than using trip_id and seat_ids
 */
export function createSeatReservationsByBookingRollback(
  bookingId: string
): RollbackOperation {
  return {
    description: `Release seat reservations for booking ${bookingId}`,
    execute: async () => {
      // Release seats by setting them back to available
      // IMPORTANT: Must set booking_id to NULL first to avoid foreign key constraint violations
      // The seat_reservations table uses last_activity, not updated_at
      const { error } = await supabase
        .from('seat_reservations')
        .update({
          is_available: true,
          is_reserved: false,
          booking_id: null,
          last_activity: new Date().toISOString(),
          reservation_expiry: null,
          temp_reserved_at: null,
          temp_reservation_expiry: null,
        })
        .eq('booking_id', bookingId);

      if (error) {
        throw new Error(
          `Failed to release seat reservations: ${error.message}`
        );
      }
    },
  };
}

/**
 * Create rollback operation for seat reservations release by trip_id and seat_ids
 * @deprecated Use createSeatReservationsByBookingRollback instead for better reliability
 */
export function createSeatReservationsRollback(
  tripId: string,
  seatIds: string[]
): RollbackOperation {
  return {
    description: `Release seat reservations for trip ${tripId}`,
    execute: async () => {
      // Release seats by setting them back to available
      // IMPORTANT: Must set booking_id to NULL first to avoid foreign key constraint violations
      // The seat_reservations table uses last_activity, not updated_at
      const { error } = await supabase
        .from('seat_reservations')
        .update({
          is_available: true,
          is_reserved: false,
          booking_id: null,
          last_activity: new Date().toISOString(),
          reservation_expiry: null,
          temp_reserved_at: null,
          temp_reservation_expiry: null,
        })
        .eq('trip_id', tripId)
        .in('seat_id', seatIds);

      if (error) {
        throw new Error(
          `Failed to release seat reservations: ${error.message}`
        );
      }
    },
  };
}

/**
 * Create rollback operation for payment deletion
 */
export function createPaymentRollback(bookingId: string): RollbackOperation {
  return {
    description: `Delete payment for booking ${bookingId}`,
    execute: async () => {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('booking_id', bookingId);

      if (error) {
        // Payment deletion is non-critical, log but don't throw
        console.warn(
          `[Rollback] Failed to delete payment (non-critical): ${error.message}`
        );
      }
    },
  };
}

/**
 * Create rollback operation for booking segment deletion
 */
export function createBookingSegmentRollback(
  bookingId: string
): RollbackOperation {
  return {
    description: `Delete booking segments for booking ${bookingId}`,
    execute: async () => {
      const { error } = await supabase
        .from('booking_segments')
        .delete()
        .eq('booking_id', bookingId);

      if (error) {
        throw new Error(`Failed to delete booking segments: ${error.message}`);
      }
    },
  };
}

/**
 * Comprehensive cleanup for a booking and all related records
 * IMPORTANT: Order matters - seat reservations must be released before deleting booking
 */
export async function cleanupBookingCompletely(
  bookingId: string,
  tripId?: string,
  seatIds?: string[]
): Promise<void> {
  const rollbackStack: RollbackOperation[] = [];

  // Add rollback operations in order (will be executed in reverse)
  // Order: Payments -> Passengers -> Seat Reservations -> Booking Segments -> Booking
  // When reversed: Booking -> Booking Segments -> Seat Reservations -> Passengers -> Payments
  rollbackStack.push(createPaymentRollback(bookingId));
  rollbackStack.push(createPassengersRollback(bookingId));

  // Seat reservations must be released BEFORE deleting booking to avoid FK constraint violations
  if (tripId && seatIds && seatIds.length > 0) {
    rollbackStack.push(createSeatReservationsRollback(tripId, seatIds));
  }

  rollbackStack.push(createBookingSegmentRollback(bookingId));
  rollbackStack.push(createBookingRollback(bookingId));

  await executeRollback(rollbackStack);
}
