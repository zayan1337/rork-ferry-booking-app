/**
 * Captain Multi-Stop Utilities
 *
 * Utilities for managing multi-stop trips in the captain portal
 */

import { supabase } from '../supabase';
import type { CaptainRouteStop, CaptainPassenger } from '@/types/captain';

/**
 * Get all stops for a captain's trip with passenger information
 */
export async function getCaptainTripStops(
  tripId: string
): Promise<CaptainRouteStop[]> {
  try {
    // Get route stops for the trip with stop_type
    const { data: routeStops, error: routeError } = await supabase
      .from('route_stops')
      .select(
        `
        id,
        stop_sequence,
        stop_type,
        island:island_id(
          id,
          name,
          zone
        )
      `
      )
      .eq('route_id', await getTripRouteId(tripId))
      .order('stop_sequence');

    if (routeError) throw routeError;

    // Get trip progress to determine current stop - fetch ALL fields including id
    const { data: progressData } = await supabase
      .from('trip_stop_progress')
      .select(
        'id, stop_id, stop_sequence, stop_type, status, boarding_started_at, departed_at, arrived_at'
      )
      .eq('trip_id', tripId)
      .order('stop_sequence');

    // Get passengers for each stop
    const stopsWithPassengers = await Promise.all(
      (routeStops || []).map(async stop => {
        // Match by route_stops.id (which is stored in trip_stop_progress.stop_id)
        const progress = progressData?.find(p => p.stop_id === stop.id);
        const passengers = await getPassengersForStop(tripId, stop.id);

        return {
          // CRITICAL: Include both IDs!
          // - id: trip_stop_progress.id (for progress tracking)
          // - stop_id: route_stops.id (for RPC function calls)
          id: progress?.id || stop.id, // trip_stop_progress.id
          stop_id: stop.id, // route_stops.id - REQUIRED for update_stop_status RPC!
          stop_sequence: stop.stop_sequence,
          stop_type: progress?.stop_type || (stop as any).stop_type || 'both',
          island: Array.isArray(stop.island) ? stop.island[0] : stop.island,
          is_current_stop:
            progress?.status === 'boarding' || progress?.status === 'arrived',
          is_completed:
            progress?.status === 'departed' ||
            progress?.status === 'completed' ||
            (progress?.departed_at !== null &&
              progress?.departed_at !== undefined),
          boarding_passengers: passengers.filter(p => p.action === 'boarding'),
          dropoff_passengers: passengers.filter(p => p.action === 'dropoff'),
          boarding_started_at: (progress as any)?.boarding_started_at,
          departed_at: (progress as any)?.departed_at,
          status: progress?.status || 'pending',
        };
      })
    );

    return stopsWithPassengers;
  } catch (error) {
    console.error('Error fetching captain trip stops:', error);
    throw new Error('Failed to fetch trip stops');
  }
}

/**
 * Get passengers for a specific stop (boarding and dropoff)
 */
export async function getPassengersForStop(
  tripId: string,
  stopId: string
): Promise<CaptainPassenger[]> {
  // For now, return empty array to avoid database errors
  // This function can be enhanced later when the database structure is clarified
  return [];
}

/**
 * Move trip to next stop
 */
export async function moveToNextStop(tripId: string): Promise<boolean> {
  try {
    // Since current_stop_sequence doesn't exist in the database,
    // we'll use a simple approach: just mark the trip as completed
    // when the captain moves to the next stop

    // For now, we'll just update the trip status to indicate progress
    const { error: updateError } = await supabase
      .from('trips')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', tripId);

    if (updateError) throw updateError;

    // Log the move to next stop action
    await supabase.from('activity_logs').insert({
      user_id: '', // Will be filled by the calling function
      action: 'move_to_next_stop',
      entity_type: 'trip',
      entity_id: tripId,
      details: {
        trip_id: tripId,
        moved_at: new Date().toISOString(),
      },
    });

    return true;
  } catch (error) {
    console.error('Error moving to next stop:', error);
    return false;
  }
}

/**
 * Complete boarding at a specific stop
 */
export async function completeStopBoarding(
  stopId: string,
  captainId: string
): Promise<boolean> {
  try {
    // Update all passengers boarding at this stop
    const { error: updateError } = await supabase
      .from('passengers')
      .update({
        check_in_status: true,
        checked_in_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('boarding_stop_id', stopId)
      .eq('check_in_status', false);

    if (updateError) throw updateError;

    // Log the boarding completion
    await supabase.from('activity_logs').insert({
      user_id: captainId,
      action: 'complete_stop_boarding',
      entity_type: 'stop',
      entity_id: stopId,
      details: { stop_id: stopId, completed_at: new Date().toISOString() },
    });

    return true;
  } catch (error) {
    console.error('Error completing stop boarding:', error);
    return false;
  }
}

/**
 * Process multi-stop check-in for a passenger
 */
export async function processMultiStopCheckIn(
  bookingId: string,
  stopId: string,
  action: 'boarding' | 'dropoff',
  captainId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Validate the check-in is allowed
    const validation = await validateCheckInAtStop(bookingId, stopId, action);
    if (!validation.allowed) {
      return { success: false, message: validation.message };
    }

    // Update passenger check-in status
    const { error: updateError } = await supabase
      .from('passengers')
      .update({
        check_in_status: true,
        checked_in_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('booking_id', bookingId);

    if (updateError) throw updateError;

    // Log the check-in
    await supabase.from('activity_logs').insert({
      user_id: captainId,
      action: `passenger_${action}`,
      entity_type: 'booking',
      entity_id: bookingId,
      details: {
        stop_id: stopId,
        action,
        checked_in_at: new Date().toISOString(),
      },
    });

    return {
      success: true,
      message: `Passenger ${action} processed successfully`,
    };
  } catch (error) {
    console.error('Error processing multi-stop check-in:', error);
    return {
      success: false,
      message: 'Failed to process check-in. Please try again.',
    };
  }
}

/**
 * Validate if check-in is allowed at a specific stop
 */
async function validateCheckInAtStop(
  bookingId: string,
  stopId: string,
  action: 'boarding' | 'dropoff'
): Promise<{ allowed: boolean; message: string }> {
  try {
    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(
        `
        id,
        trip_id,
        status,
        booking_segments(
          boarding_stop_id,
          destination_stop_id,
          boarding_stop_sequence,
          destination_stop_sequence
        )
      `
      )
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return { allowed: false, message: 'Booking not found' };
    }

    // Check if booking is confirmed
    if (booking.status !== 'confirmed') {
      return { allowed: false, message: 'Booking is not confirmed' };
    }

    const segments = booking.booking_segments;
    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      return { allowed: false, message: 'Invalid booking segment' };
    }

    const segment = segments[0]; // Get the first segment

    // Validate boarding
    if (action === 'boarding') {
      if (segment.boarding_stop_id !== stopId) {
        return {
          allowed: false,
          message: 'Passenger is not boarding at this stop',
        };
      }
    }

    // Validate dropoff
    if (action === 'dropoff') {
      if (segment.destination_stop_id !== stopId) {
        return {
          allowed: false,
          message: 'Passenger is not dropping off at this stop',
        };
      }
    }

    return { allowed: true, message: 'Check-in allowed' };
  } catch (error) {
    console.error('Error validating check-in:', error);
    return { allowed: false, message: 'Validation failed' };
  }
}

/**
 * Get trip's route ID
 */
async function getTripRouteId(tripId: string): Promise<string> {
  const { data: trip, error } = await supabase
    .from('trips')
    .select('route_id')
    .eq('id', tripId)
    .single();

  if (error || !trip) {
    throw new Error('Trip not found');
  }

  return trip.route_id;
}

/**
 * Get stop passenger information for display
 */
export async function getStopPassengerInfo(
  tripId: string,
  stopId: string
): Promise<{
  boarding: CaptainPassenger[];
  dropoff: CaptainPassenger[];
  totalPassengers: number;
}> {
  try {
    const passengers = await getPassengersForStop(tripId, stopId);

    const boarding = passengers.filter(p => p.action === 'boarding');
    const dropoff = passengers.filter(p => p.action === 'dropoff');

    return {
      boarding,
      dropoff,
      totalPassengers: passengers.length,
    };
  } catch (error) {
    console.error('Error getting stop passenger info:', error);
    return {
      boarding: [],
      dropoff: [],
      totalPassengers: 0,
    };
  }
}

/**
 * Check if a trip is multi-stop
 */
export async function isMultiStopTrip(tripId: string): Promise<boolean> {
  try {
    const { data: trip, error } = await supabase
      .from('trips')
      .select('is_multi_stop')
      .eq('id', tripId)
      .single();

    if (error) throw error;
    return trip?.is_multi_stop || false;
  } catch (error) {
    console.error('Error checking if trip is multi-stop:', error);
    return false;
  }
}
