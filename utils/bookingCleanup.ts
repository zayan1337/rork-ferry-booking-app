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
 */
export function createBookingRollback(bookingId: string): RollbackOperation {
  return {
    description: `Delete booking ${bookingId}`,
    execute: async () => {
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
 * Create rollback operation for seat reservations release
 */
export function createSeatReservationsRollback(
  tripId: string,
  seatIds: string[]
): RollbackOperation {
  return {
    description: `Release seat reservations for trip ${tripId}`,
    execute: async () => {
      // Release seats by setting them back to available
      const { error } = await supabase
        .from('seat_reservations')
        .update({
          is_available: true,
          booking_id: null,
          updated_at: new Date().toISOString(),
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
 */
export async function cleanupBookingCompletely(
  bookingId: string,
  tripId?: string,
  seatIds?: string[]
): Promise<void> {
  const rollbackStack: RollbackOperation[] = [];

  // Add rollback operations in order (will be executed in reverse)
  rollbackStack.push(createPaymentRollback(bookingId));
  rollbackStack.push(createPassengersRollback(bookingId));
  if (tripId && seatIds && seatIds.length > 0) {
    rollbackStack.push(createSeatReservationsRollback(tripId, seatIds));
  }
  rollbackStack.push(createBookingSegmentRollback(bookingId));
  rollbackStack.push(createBookingRollback(bookingId));

  await executeRollback(rollbackStack);
}
