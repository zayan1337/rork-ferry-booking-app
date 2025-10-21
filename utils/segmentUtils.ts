/**
 * Segment Utilities
 *
 * Helper functions for multi-stop route segment operations
 */

import { supabase } from './supabase';
import type { RouteStop, RouteSegmentFare } from '@/types/multiStopRoute';

// ============================================================================
// SEGMENT AVAILABILITY
// ============================================================================

/**
 * Check if a seat is available for a specific segment
 */
export async function isSeatAvailableForSegment(
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
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error in isSeatAvailableForSegment:', error);
    return false;
  }
}

/**
 * Get all available seats for a segment
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

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting available seats for segment:', error);
    return [];
  }
}

/**
 * Get effective fare for a segment (includes overrides and multipliers)
 */
export async function getEffectiveSegmentFare(
  tripId: string,
  fromStopId: string,
  toStopId: string
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_effective_segment_fare', {
      p_trip_id: tripId,
      p_from_stop_id: fromStopId,
      p_to_stop_id: toStopId,
    });

    if (error) throw error;

    return data || 0;
  } catch (error) {
    console.error('Error getting effective segment fare:', error);
    return 0;
  }
}

// ============================================================================
// ROUTE SEGMENTS
// ============================================================================

/**
 * Get all stops for a route
 */
export async function getRouteStops(routeId: string): Promise<RouteStop[]> {
  try {
    const { data, error } = await supabase
      .from('route_stops')
      .select(
        `
        *,
        island:islands!route_stops_island_id_fkey (
          id,
          name,
          zone
        )
      `
      )
      .eq('route_id', routeId)
      .order('stop_sequence');

    if (error) throw error;

    return (
      (data || []).map((stop: any) => ({
        ...stop,
        island_name: stop.island?.name,
        island_zone: stop.island?.zone,
      })) || []
    );
  } catch (error) {
    console.error('Error fetching route stops:', error);
    throw error;
  }
}

/**
 * Get all segment fares for a route
 */
export async function getRouteSegmentFares(
  routeId: string
): Promise<RouteSegmentFare[]> {
  try {
    const { data, error } = await supabase
      .from('route_segment_fares_view')
      .select('*')
      .eq('route_id', routeId)
      .order('from_stop_sequence')
      .order('to_stop_sequence');

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching route segment fares:', error);
    throw error;
  }
}

/**
 * Auto-generate segment fares for a route
 */
export async function autoGenerateSegmentFares(
  routeId: string,
  baseFarePerSegment?: number
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('auto_generate_segment_fares', {
      p_route_id: routeId,
      p_base_fare_per_segment: baseFarePerSegment || null,
    });

    if (error) throw error;

    return data || 0;
  } catch (error) {
    console.error('Error auto-generating segment fares:', error);
    throw error;
  }
}

/**
 * Update a specific segment fare
 */
export async function updateSegmentFare(
  fareId: string,
  newAmount: number
): Promise<void> {
  try {
    const { error } = await supabase
      .from('route_segment_fares')
      .update({ fare_amount: newAmount, updated_at: new Date().toISOString() })
      .eq('id', fareId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating segment fare:', error);
    throw error;
  }
}

// ============================================================================
// TRIP FARE OVERRIDES
// ============================================================================

/**
 * Get fare overrides for a trip
 */
export async function getTripFareOverrides(tripId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('trip_fare_overrides')
      .select('*')
      .eq('trip_id', tripId);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching trip fare overrides:', error);
    return [];
  }
}

/**
 * Create or update trip fare override
 */
export async function setTripFareOverride(
  tripId: string,
  fromStopId: string,
  toStopId: string,
  overrideFare: number,
  reason?: string
): Promise<void> {
  try {
    const { error } = await supabase.from('trip_fare_overrides').upsert(
      {
        trip_id: tripId,
        from_stop_id: fromStopId,
        to_stop_id: toStopId,
        override_fare_amount: overrideFare,
        reason: reason || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'trip_id,from_stop_id,to_stop_id',
      }
    );

    if (error) throw error;
  } catch (error) {
    console.error('Error setting trip fare override:', error);
    throw error;
  }
}

/**
 * Delete trip fare override
 */
export async function deleteTripFareOverride(
  tripId: string,
  fromStopId: string,
  toStopId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('trip_fare_overrides')
      .delete()
      .eq('trip_id', tripId)
      .eq('from_stop_id', fromStopId)
      .eq('to_stop_id', toStopId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting trip fare override:', error);
    throw error;
  }
}

// ============================================================================
// BOOKING SEGMENTS
// ============================================================================

/**
 * Create booking segment entry
 */
export async function createBookingSegment(
  bookingId: string,
  boardingStopId: string,
  destinationStopId: string,
  boardingSequence: number,
  destinationSequence: number,
  fareAmount: number
): Promise<void> {
  try {
    const { error } = await supabase.from('booking_segments').insert({
      booking_id: bookingId,
      boarding_stop_id: boardingStopId,
      destination_stop_id: destinationStopId,
      boarding_stop_sequence: boardingSequence,
      destination_stop_sequence: destinationSequence,
      fare_amount: fareAmount,
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error creating booking segment:', error);
    throw error;
  }
}

/**
 * Reserve seat for a segment
 */
export async function reserveSeatForSegment(
  tripId: string,
  seatId: string,
  bookingId: string,
  passengerId: string,
  boardingStopId: string,
  destinationStopId: string,
  boardingSequence: number,
  destinationSequence: number,
  userId: string,
  sessionId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('reserve_seat_for_segment', {
      p_trip_id: tripId,
      p_seat_id: seatId,
      p_booking_id: bookingId,
      p_passenger_id: passengerId,
      p_boarding_stop_id: boardingStopId,
      p_destination_stop_id: destinationStopId,
      p_boarding_sequence: boardingSequence,
      p_destination_sequence: destinationSequence,
      p_user_id: userId,
      p_session_id: sessionId,
    });

    if (error) throw error;

    return data === true;
  } catch (error) {
    console.error('Error reserving seat for segment:', error);
    return false;
  }
}

/**
 * Get booking segment information
 */
export async function getBookingSegment(bookingId: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('bookings_with_segments_view')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error fetching booking segment:', error);
    return null;
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate segment selection
 */
export function validateSegmentSelection(
  stops: RouteStop[],
  fromSequence: number,
  toSequence: number
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (fromSequence >= toSequence) {
    errors.push('Destination must be after boarding point');
  }

  if (fromSequence < 1 || toSequence < 1) {
    errors.push('Invalid stop sequence numbers');
  }

  if (fromSequence > stops.length || toSequence > stops.length) {
    errors.push('Stop sequence out of range');
  }

  const fromStop = stops.find(s => s.stop_sequence === fromSequence);
  const toStop = stops.find(s => s.stop_sequence === toSequence);

  if (!fromStop) {
    errors.push('Boarding stop not found');
  } else if (fromStop.stop_type === 'dropoff') {
    errors.push('Cannot board at dropoff-only stop');
  }

  if (!toStop) {
    errors.push('Destination stop not found');
  } else if (toStop.stop_type === 'pickup') {
    errors.push('Cannot exit at pickup-only stop');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate total segments between two stops
 */
export function calculateSegmentCount(
  fromSequence: number,
  toSequence: number
): number {
  return Math.max(0, toSequence - fromSequence);
}

/**
 * Format segment description
 */
export function formatSegmentDescription(
  fromIsland: string,
  toIsland: string,
  segmentCount: number
): string {
  return `${fromIsland} → ${toIsland} (${segmentCount} segment${
    segmentCount !== 1 ? 's' : ''
  })`;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get all valid segments for a route
 */
export function getValidSegments(stops: RouteStop[]): Array<{
  fromStop: RouteStop;
  toStop: RouteStop;
  segmentCount: number;
}> {
  const segments: Array<{
    fromStop: RouteStop;
    toStop: RouteStop;
    segmentCount: number;
  }> = [];

  for (let i = 0; i < stops.length; i++) {
    const fromStop = stops[i];
    if (fromStop.stop_type === 'dropoff') continue;

    for (let j = i + 1; j < stops.length; j++) {
      const toStop = stops[j];
      if (toStop.stop_type === 'pickup') continue;

      segments.push({
        fromStop,
        toStop,
        segmentCount: toStop.stop_sequence - fromStop.stop_sequence,
      });
    }
  }

  return segments;
}

/**
 * Generate expected segment fare based on base fare and distance
 */
export function calculateExpectedFare(
  baseFare: number,
  segmentCount: number
): number {
  return baseFare * segmentCount;
}

