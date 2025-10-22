/**
 * Seat Segment Utilities
 *
 * Helper functions for managing segment-based seat reservations in multi-stop routes.
 * This replaces the old per-trip seat reservation system with a per-segment system
 * that allows seats to be reused across non-overlapping segments.
 */

import { supabase } from './supabase';

// ============================================================================
// TYPES
// ============================================================================

export interface SeatSegmentReservation {
  id: string;
  trip_id: string;
  seat_id: string;
  booking_id: string;
  passenger_id: string | null;
  boarding_stop_id: string;
  destination_stop_id: string;
  boarding_stop_sequence: number;
  destination_stop_sequence: number;
  reserved_at: string;
  user_id: string | null;
  session_id: string | null;
  created_at: string;
}

export interface ReserveSeatParams {
  tripId: string;
  seatId: string;
  bookingId: string;
  passengerId?: string | null;
  boardingStopId: string;
  destinationStopId: string;
  boardingSequence: number;
  destinationSequence: number;
  userId?: string | null;
  sessionId?: string | null;
}

// ============================================================================
// SEAT AVAILABILITY FUNCTIONS
// ============================================================================

/**
 * Check if a seat is available for a specific segment
 * Uses the database function to detect segment overlaps
 */
export async function checkSeatAvailabilityForSegment(
  tripId: string,
  seatId: string,
  boardingSequence: number,
  destinationSequence: number
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc(
      'is_seat_available_for_segment',
      {
        p_trip_id: tripId,
        p_seat_id: seatId,
        p_boarding_sequence: boardingSequence,
        p_destination_sequence: destinationSequence,
      }
    );

    if (error) {
      console.error('Error checking seat availability:', error);
      throw error;
    }

    return data === true;
  } catch (error) {
    console.error('Failed to check seat availability:', error);
    throw error;
  }
}

/**
 * Get all available seats for a specific segment
 * Returns seats that are not reserved for any overlapping segments
 */
export async function getAvailableSeatsForSegment(
  tripId: string,
  fromStopSequence: number,
  toStopSequence: number
): Promise<any[]> {
  try {
    const { data, error } = await supabase.rpc(
      'get_available_seats_for_segment',
      {
        p_trip_id: tripId,
        p_from_stop_sequence: fromStopSequence,
        p_to_stop_sequence: toStopSequence,
      }
    );

    if (error) {
      console.error('Error getting available seats:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get available seats:', error);
    throw error;
  }
}

/**
 * Check multiple seats availability for a segment
 */
export async function checkMultipleSeatsAvailability(
  tripId: string,
  seatIds: string[],
  boardingSequence: number,
  destinationSequence: number
): Promise<Map<string, boolean>> {
  const availabilityMap = new Map<string, boolean>();

  // Check each seat in parallel
  const checks = seatIds.map(seatId =>
    checkSeatAvailabilityForSegment(
      tripId,
      seatId,
      boardingSequence,
      destinationSequence
    )
      .then(isAvailable => {
        availabilityMap.set(seatId, isAvailable);
      })
      .catch(error => {
        console.error(`Error checking seat ${seatId}:`, error);
        availabilityMap.set(seatId, false);
      })
  );

  await Promise.all(checks);
  return availabilityMap;
}

// ============================================================================
// SEAT RESERVATION FUNCTIONS
// ============================================================================

/**
 * Reserve a seat for a specific segment
 * Uses the database function which validates availability and creates reservation
 */
export async function reserveSeatForSegment(
  params: ReserveSeatParams
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('reserve_seat_for_segment', {
      p_trip_id: params.tripId,
      p_seat_id: params.seatId,
      p_booking_id: params.bookingId,
      p_passenger_id: params.passengerId || null,
      p_boarding_stop_id: params.boardingStopId,
      p_destination_stop_id: params.destinationStopId,
      p_boarding_sequence: params.boardingSequence,
      p_destination_sequence: params.destinationSequence,
      p_user_id: params.userId || null,
      p_session_id: params.sessionId || null,
    });

    if (error) {
      console.error('Error reserving seat:', error);
      throw error;
    }

    return data === true;
  } catch (error) {
    console.error('Failed to reserve seat:', error);
    throw error;
  }
}

/**
 * Reserve multiple seats for a segment
 * Returns array of successfully reserved seat IDs
 */
export async function reserveMultipleSeatsForSegment(
  tripId: string,
  seats: {
    seatId: string;
    bookingId: string;
    passengerId?: string;
    boardingStopId: string;
    destinationStopId: string;
    boardingSequence: number;
    destinationSequence: number;
  }[],
  userId?: string,
  sessionId?: string
): Promise<string[]> {
  const reservedSeats: string[] = [];

  for (const seat of seats) {
    try {
      const success = await reserveSeatForSegment({
        tripId,
        seatId: seat.seatId,
        bookingId: seat.bookingId,
        passengerId: seat.passengerId,
        boardingStopId: seat.boardingStopId,
        destinationStopId: seat.destinationStopId,
        boardingSequence: seat.boardingSequence,
        destinationSequence: seat.destinationSequence,
        userId,
        sessionId,
      });

      if (success) {
        reservedSeats.push(seat.seatId);
      }
    } catch (error) {
      console.error(`Failed to reserve seat ${seat.seatId}:`, error);
      // Continue with other seats
    }
  }

  return reservedSeats;
}

/**
 * Direct insert into seat_segment_reservations table
 * Use this when you need more control or the RPC function is not suitable
 */
export async function createSeatSegmentReservation(
  params: ReserveSeatParams
): Promise<SeatSegmentReservation | null> {
  try {
    const { data, error } = await supabase
      .from('seat_segment_reservations')
      .insert({
        trip_id: params.tripId,
        seat_id: params.seatId,
        booking_id: params.bookingId,
        passenger_id: params.passengerId || null,
        boarding_stop_id: params.boardingStopId,
        destination_stop_id: params.destinationStopId,
        boarding_stop_sequence: params.boardingSequence,
        destination_stop_sequence: params.destinationSequence,
        user_id: params.userId || null,
        session_id: params.sessionId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating seat segment reservation:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to create seat segment reservation:', error);
    return null;
  }
}

// ============================================================================
// RELEASE/UPDATE FUNCTIONS
// ============================================================================

/**
 * Release seat reservations for a specific booking
 */
export async function releaseSeatReservationsForBooking(
  bookingId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('seat_segment_reservations')
      .delete()
      .eq('booking_id', bookingId);

    if (error) {
      console.error('Error releasing seat reservations:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to release seat reservations:', error);
    return false;
  }
}

/**
 * Update passenger assignment for seat reservation
 */
export async function updateSeatReservationPassenger(
  reservationId: string,
  passengerId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('seat_segment_reservations')
      .update({ passenger_id: passengerId })
      .eq('id', reservationId);

    if (error) {
      console.error('Error updating seat reservation passenger:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to update seat reservation passenger:', error);
    return false;
  }
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get all seat reservations for a trip
 */
export async function getSeatReservationsForTrip(
  tripId: string
): Promise<SeatSegmentReservation[]> {
  try {
    const { data, error } = await supabase
      .from('seat_segment_reservations')
      .select('*')
      .eq('trip_id', tripId)
      .order('boarding_stop_sequence')
      .order('seat_id');

    if (error) {
      console.error('Error getting seat reservations:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get seat reservations:', error);
    return [];
  }
}

/**
 * Get seat reservations for a specific booking
 */
export async function getSeatReservationsForBooking(
  bookingId: string
): Promise<SeatSegmentReservation[]> {
  try {
    const { data, error } = await supabase
      .from('seat_segment_reservations')
      .select(
        `
        *,
        seat:seats (
          id,
          seat_number,
          row_number,
          is_window,
          is_aisle
        ),
        boarding_stop:route_stops!seat_segment_reservations_boarding_stop_id_fkey (
          id,
          stop_sequence,
          island:islands (name, zone)
        ),
        destination_stop:route_stops!seat_segment_reservations_destination_stop_id_fkey (
          id,
          stop_sequence,
          island:islands (name, zone)
        )
      `
      )
      .eq('booking_id', bookingId);

    if (error) {
      console.error('Error getting seat reservations for booking:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get seat reservations for booking:', error);
    return [];
  }
}

/**
 * Get seat occupancy map for a trip
 * Returns which seats are occupied for each segment
 */
export async function getTripSeatOccupancyMap(tripId: string): Promise<
  Map<
    string,
    {
      seatId: string;
      boardingSequence: number;
      destinationSequence: number;
      bookingId: string;
    }[]
  >
> {
  const reservations = await getSeatReservationsForTrip(tripId);
  const occupancyMap = new Map();

  for (const reservation of reservations) {
    if (!occupancyMap.has(reservation.seat_id)) {
      occupancyMap.set(reservation.seat_id, []);
    }

    occupancyMap.get(reservation.seat_id).push({
      seatId: reservation.seat_id,
      boardingSequence: reservation.boarding_stop_sequence,
      destinationSequence: reservation.destination_stop_sequence,
      bookingId: reservation.booking_id,
    });
  }

  return occupancyMap;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate that segments don't overlap
 * Two segments overlap if: boarding1 < destination2 AND destination1 > boarding2
 */
export function checkSegmentOverlap(
  segment1: { boarding: number; destination: number },
  segment2: { boarding: number; destination: number }
): boolean {
  return (
    segment1.boarding < segment2.destination &&
    segment1.destination > segment2.boarding
  );
}

/**
 * Find all overlapping reservations for a seat on a trip
 */
export async function findOverlappingReservations(
  tripId: string,
  seatId: string,
  boardingSequence: number,
  destinationSequence: number
): Promise<SeatSegmentReservation[]> {
  try {
    const { data, error } = await supabase
      .from('seat_segment_reservations')
      .select('*')
      .eq('trip_id', tripId)
      .eq('seat_id', seatId)
      .lt('boarding_stop_sequence', destinationSequence)
      .gt('destination_stop_sequence', boardingSequence);

    if (error) {
      console.error('Error finding overlapping reservations:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to find overlapping reservations:', error);
    return [];
  }
}

// ============================================================================
// STATISTICS FUNCTIONS
// ============================================================================

/**
 * Get segment-level statistics for a trip
 */
export async function getTripSegmentStatistics(tripId: string): Promise<{
  totalSeats: number;
  segmentOccupancy: Map<string, number>; // key: "seq1-seq2", value: occupied count
}> {
  const reservations = await getSeatReservationsForTrip(tripId);
  const segmentOccupancy = new Map<string, number>();

  for (const reservation of reservations) {
    const key = `${reservation.boarding_stop_sequence}-${reservation.destination_stop_sequence}`;
    segmentOccupancy.set(key, (segmentOccupancy.get(key) || 0) + 1);
  }

  // Get total seats from vessel
  // This would need trip → vessel → seats count query
  // Placeholder for now
  const totalSeats = 0;

  return {
    totalSeats,
    segmentOccupancy,
  };
}

/**
 * Calculate seat utilization rate for a trip
 * Shows how efficiently seats are being used across all segments
 */
export async function calculateSeatUtilizationRate(
  tripId: string,
  totalStops: number
): Promise<number> {
  const reservations = await getSeatReservationsForTrip(tripId);

  if (reservations.length === 0) return 0;

  // Calculate total segment-seats (each reservation = 1 segment-seat)
  const totalSegmentSeats = reservations.length;

  // Get vessel capacity
  // This would need a join to trips → vessel → seats
  // Placeholder calculation
  const maxPossibleSegmentSeats = 0; // capacity × number of segments

  if (maxPossibleSegmentSeats === 0) return 0;

  return (totalSegmentSeats / maxPossibleSegmentSeats) * 100;
}
