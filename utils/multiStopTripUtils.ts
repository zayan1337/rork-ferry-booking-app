/**
 * Multi-Stop Trip Utilities
 *
 * Core utility functions for managing multi-stop trips including:
 * - Fetching trip stops and segments
 * - Checking seat availability across segments
 * - Managing passenger boarding/dropoff at stops
 */

import { supabase } from './supabase';
import type {
  TripStop,
  AvailableSegment,
  StopOption,
  MultiStopTrip,
  StopPassengerInfo,
  SegmentValidationResult,
} from '@/types/multiStopTrip';

// ============================================================================
// FETCH OPERATIONS
// ============================================================================

/**
 * Get all stops for a trip in sequence
 */
export async function getTripStops(tripId: string): Promise<TripStop[]> {
  try {
    const { data, error } = await supabase
      .from('trip_stops_view')
      .select('*')
      .eq('trip_id', tripId)
      .order('stop_sequence');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching trip stops:', error);
    throw new Error('Failed to fetch trip stops');
  }
}

/**
 * Get available segments for booking
 * A segment is available if:
 * 1. Boarding stop comes before destination stop
 * 2. Stop types allow boarding/dropoff
 */
export async function getAvailableSegments(
  tripId: string
): Promise<AvailableSegment[]> {
  try {
    const stops = await getTripStops(tripId);
    const segments: AvailableSegment[] = [];

    // Get fare matrix
    const { data: fares, error: fareError } = await supabase
      .from('stop_fares')
      .select('*')
      .eq('trip_id', tripId);

    if (fareError) throw fareError;

    const fareMap = new Map<string, number>();
    fares?.forEach(fare => {
      fareMap.set(`${fare.from_stop_id}-${fare.to_stop_id}`, fare.fare);
    });

    // Create all valid segments
    for (let i = 0; i < stops.length; i++) {
      const fromStop = stops[i];

      // Skip if this stop doesn't allow boarding
      if (fromStop.stop_type === 'dropoff') continue;

      for (let j = i + 1; j < stops.length; j++) {
        const toStop = stops[j];

        // Skip if this stop doesn't allow dropoff
        if (toStop.stop_type === 'pickup') continue;

        const fareKey = `${fromStop.id}-${toStop.id}`;
        const fare = fareMap.get(fareKey) || 0;
        const stopDistance = toStop.stop_sequence - fromStop.stop_sequence;

        segments.push({
          from_stop: {
            stop_id: fromStop.id,
            island_id: fromStop.island_id,
            island_name: fromStop.island_name,
            stop_sequence: fromStop.stop_sequence,
            stop_type: fromStop.stop_type,
            estimated_time:
              fromStop.estimated_departure_time ||
              fromStop.estimated_arrival_time,
            zone: fromStop.zone,
          },
          to_stop: {
            stop_id: toStop.id,
            island_id: toStop.island_id,
            island_name: toStop.island_name,
            stop_sequence: toStop.stop_sequence,
            stop_type: toStop.stop_type,
            estimated_time:
              toStop.estimated_arrival_time || toStop.estimated_departure_time,
            zone: toStop.zone,
          },
          fare,
          available: true, // Will be validated separately
          distance: stopDistance,
        });
      }
    }

    return segments;
  } catch (error) {
    console.error('Error getting available segments:', error);
    throw new Error('Failed to get available segments');
  }
}

/**
 * Get specific segment between two stops
 */
export async function getSegment(
  tripId: string,
  fromStopId: string,
  toStopId: string
): Promise<AvailableSegment | null> {
  const segments = await getAvailableSegments(tripId);
  return (
    segments.find(
      s => s.from_stop.stop_id === fromStopId && s.to_stop.stop_id === toStopId
    ) || null
  );
}

/**
 * Calculate fare for a segment
 */
export async function getSegmentFare(
  tripId: string,
  fromStopId: string,
  toStopId: string
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('stop_fares')
      .select('fare')
      .eq('trip_id', tripId)
      .eq('from_stop_id', fromStopId)
      .eq('to_stop_id', toStopId)
      .single();

    if (error) {
      console.error('Error fetching segment fare:', error);
      return 0;
    }

    return data?.fare || 0;
  } catch (error) {
    console.error('Error in getSegmentFare:', error);
    return 0;
  }
}

// ============================================================================
// SEAT AVAILABILITY
// ============================================================================

/**
 * Check if a seat is available for a specific segment
 *
 * Complex logic: Need to check if seat is available
 * for ALL stops between boarding and destination
 *
 * A seat is unavailable if any existing booking uses it during
 * an overlapping segment
 */
export async function checkSeatAvailabilityForSegment(
  tripId: string,
  seatId: string,
  fromStopSequence: number,
  toStopSequence: number
): Promise<boolean> {
  try {
    // Get all bookings that use this seat
    const { data: passengers, error } = await supabase
      .from('passengers')
      .select(
        `
        id,
        seat_id,
        booking_id,
        bookings!inner(
          id,
          status,
          trip_id
        )
      `
      )
      .eq('seat_id', seatId)
      .eq('bookings.trip_id', tripId)
      .in('bookings.status', ['confirmed', 'checked_in', 'completed']);

    if (error) throw error;
    if (!passengers || passengers.length === 0) return true;

    // For each passenger, check if their booking has a segment that overlaps
    for (const passenger of passengers) {
      const booking = (passenger as any).bookings;
      if (!booking) continue;

      // Get booking stop info
      const { data: bookingStops, error: stopsError } = await supabase
        .from('booking_stops')
        .select(
          `
          boarding_stop_id,
          destination_stop_id,
          boarding_stop:trip_stops!booking_stops_boarding_stop_id_fkey(stop_sequence),
          destination_stop:trip_stops!booking_stops_destination_stop_id_fkey(stop_sequence)
        `
        )
        .eq('booking_id', booking.id)
        .single();

      if (stopsError || !bookingStops) {
        // If no booking stops (regular trip), assume seat is occupied for entire trip
        return false;
      }

      const existingBoarding =
        (bookingStops as any).boarding_stop?.stop_sequence || 0;
      const existingDestination =
        (bookingStops as any).destination_stop?.stop_sequence || 999;

      // Check for overlap using interval intersection logic
      // Segments overlap if: (start1 < end2) AND (start2 < end1)
      if (
        fromStopSequence < existingDestination &&
        toStopSequence > existingBoarding
      ) {
        return false; // Seat is occupied during this segment
      }
    }

    return true;
  } catch (error) {
    console.error('Error checking seat availability for segment:', error);
    return false; // Default to unavailable on error
  }
}

/**
 * Get all available seats for a segment
 */
export async function getAvailableSeatsForSegment(
  tripId: string,
  fromStopSequence: number,
  toStopSequence: number
): Promise<string[]> {
  try {
    // Get trip to find vessel
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('vessel_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip) throw new Error('Trip not found');

    // Get all seats for the vessel
    const { data: seats, error: seatsError } = await supabase
      .from('seats')
      .select('id')
      .eq('vessel_id', trip.vessel_id)
      .eq('is_disabled', false);

    if (seatsError) throw seatsError;

    // Check availability for each seat
    const availableSeats: string[] = [];
    for (const seat of seats || []) {
      const isAvailable = await checkSeatAvailabilityForSegment(
        tripId,
        seat.id,
        fromStopSequence,
        toStopSequence
      );
      if (isAvailable) {
        availableSeats.push(seat.id);
      }
    }

    return availableSeats;
  } catch (error) {
    console.error('Error getting available seats for segment:', error);
    return [];
  }
}

/**
 * Validate a segment selection
 */
export async function validateSegment(
  tripId: string,
  fromStopId: string,
  toStopId: string,
  passengerCount: number
): Promise<SegmentValidationResult> {
  const result: SegmentValidationResult = {
    isValid: true,
    isAvailable: true,
    availableSeats: 0,
    errors: [],
    warnings: [],
  };

  try {
    // Get stops to validate sequence
    const stops = await getTripStops(tripId);
    const fromStop = stops.find(s => s.id === fromStopId);
    const toStop = stops.find(s => s.id === toStopId);

    if (!fromStop || !toStop) {
      result.isValid = false;
      result.errors.push('Invalid stop selection');
      return result;
    }

    // Validate sequence
    if (fromStop.stop_sequence >= toStop.stop_sequence) {
      result.isValid = false;
      result.errors.push('Boarding stop must come before destination stop');
      return result;
    }

    // Validate stop types
    if (fromStop.stop_type === 'dropoff') {
      result.isValid = false;
      result.errors.push(
        `Cannot board at ${fromStop.island_name} (drop-off only)`
      );
      return result;
    }

    if (toStop.stop_type === 'pickup') {
      result.isValid = false;
      result.errors.push(
        `Cannot disembark at ${toStop.island_name} (pickup only)`
      );
      return result;
    }

    // Check seat availability
    const availableSeats = await getAvailableSeatsForSegment(
      tripId,
      fromStop.stop_sequence,
      toStop.stop_sequence
    );

    result.availableSeats = availableSeats.length;

    if (availableSeats.length < passengerCount) {
      result.isAvailable = false;
      result.errors.push(
        `Only ${availableSeats.length} seats available for this segment, but ${passengerCount} requested`
      );
    }

    return result;
  } catch (error) {
    result.isValid = false;
    result.errors.push('Failed to validate segment');
    return result;
  }
}

// ============================================================================
// PASSENGER OPERATIONS
// ============================================================================

/**
 * Get passengers boarding or dropping at a specific stop
 */
export async function getPassengersAtStop(
  tripId: string,
  stopId: string,
  action: 'boarding' | 'dropoff'
): Promise<any[]> {
  try {
    const stopField =
      action === 'boarding' ? 'boarding_stop_id' : 'destination_stop_id';

    const { data, error } = await supabase
      .from('bookings_with_stops_view')
      .select(
        `
        id,
        booking_number,
        user_id,
        trip_id,
        status,
        check_in_status,
        checked_in_at,
        boarding_stop_id,
        destination_stop_id,
        boarding_island_name,
        destination_island_name
      `
      )
      .eq('trip_id', tripId)
      .eq(stopField, stopId)
      .in('status', ['confirmed', 'checked_in']);

    if (error) throw error;

    // For each booking, fetch passengers
    const bookingsWithPassengers = await Promise.all(
      (data || []).map(async booking => {
        const { data: passengers, error: passError } = await supabase
          .from('passengers')
          .select(
            `
            id,
            passenger_name,
            passenger_contact_number,
            seat_id,
            special_assistance_request,
            seats(seat_number)
          `
          )
          .eq('booking_id', booking.id);

        if (passError) {
          console.error('Error fetching passengers:', passError);
          return { ...booking, passengers: [] };
        }

        return {
          ...booking,
          passengers: passengers || [],
        };
      })
    );

    return bookingsWithPassengers;
  } catch (error) {
    console.error('Error getting passengers at stop:', error);
    return [];
  }
}

/**
 * Get detailed passenger info for a stop (for captain view)
 */
export async function getStopPassengerInfo(
  tripId: string,
  stopId: string
): Promise<{ boarding: StopPassengerInfo; dropoff: StopPassengerInfo }> {
  try {
    const stop = await getStopById(stopId);
    if (!stop) {
      throw new Error('Stop not found');
    }

    // Get boarding passengers
    const boardingBookings = await getPassengersAtStop(
      tripId,
      stopId,
      'boarding'
    );
    const boardingPassengers = boardingBookings.flatMap(booking =>
      (booking.passengers || []).map((p: any) => ({
        id: p.id,
        booking_id: booking.id,
        booking_number: booking.booking_number,
        passenger_name: p.passenger_name,
        seat_number: p.seats?.seat_number || 'N/A',
        check_in_status: booking.check_in_status || false,
        special_assistance: p.special_assistance_request,
      }))
    );

    // Get dropoff passengers
    const dropoffBookings = await getPassengersAtStop(
      tripId,
      stopId,
      'dropoff'
    );
    const dropoffPassengers = dropoffBookings.flatMap(booking =>
      (booking.passengers || []).map((p: any) => ({
        id: p.id,
        booking_id: booking.id,
        booking_number: booking.booking_number,
        passenger_name: p.passenger_name,
        seat_number: p.seats?.seat_number || 'N/A',
        check_in_status: booking.check_in_status || false,
        special_assistance: p.special_assistance_request,
      }))
    );

    return {
      boarding: {
        stop_id: stopId,
        stop_name: stop.island_name,
        stop_sequence: stop.stop_sequence,
        action: 'boarding',
        passengers: boardingPassengers,
        total_count: boardingPassengers.length,
        checked_in_count: boardingPassengers.filter(p => p.check_in_status)
          .length,
      },
      dropoff: {
        stop_id: stopId,
        stop_name: stop.island_name,
        stop_sequence: stop.stop_sequence,
        action: 'dropoff',
        passengers: dropoffPassengers,
        total_count: dropoffPassengers.length,
        checked_in_count: dropoffPassengers.filter(p => p.check_in_status)
          .length,
      },
    };
  } catch (error) {
    console.error('Error getting stop passenger info:', error);
    throw error;
  }
}

/**
 * Get a single stop by ID
 */
export async function getStopById(stopId: string): Promise<TripStop | null> {
  try {
    const { data, error } = await supabase
      .from('trip_stops_view')
      .select('*')
      .eq('id', stopId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching stop by ID:', error);
    return null;
  }
}

// ============================================================================
// CAPTAIN OPERATIONS
// ============================================================================

/**
 * Mark boarding as completed at a stop
 */
export async function completeStopBoarding(
  stopId: string,
  captainId: string,
  notes?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('trip_stops')
      .update({
        boarding_completed: true,
        boarding_completed_at: new Date().toISOString(),
        boarding_completed_by: captainId,
        status: 'completed',
        notes: notes || null,
      })
      .eq('id', stopId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error completing stop boarding:', error);
    return false;
  }
}

/**
 * Move trip to the next stop
 */
export async function moveToNextStop(tripId: string): Promise<boolean> {
  try {
    // Get current stop
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('current_stop_sequence, is_multi_stop')
      .eq('id', tripId)
      .single();

    if (tripError || !trip) throw new Error('Trip not found');
    if (!trip.is_multi_stop) throw new Error('Not a multi-stop trip');

    const nextSequence = (trip.current_stop_sequence || 1) + 1;

    // Get next stop
    const { data: nextStop, error: stopError } = await supabase
      .from('trip_stops')
      .select('id')
      .eq('trip_id', tripId)
      .eq('stop_sequence', nextSequence)
      .single();

    if (stopError || !nextStop) {
      // No more stops - trip is complete
      const { error: completeError } = await supabase
        .from('trips')
        .update({ status: 'completed' })
        .eq('id', tripId);

      if (completeError) throw completeError;
      return true;
    }

    // Move to next stop
    const { error: updateError } = await supabase
      .from('trips')
      .update({
        current_stop_id: nextStop.id,
        current_stop_sequence: nextSequence,
      })
      .eq('id', tripId);

    if (updateError) throw updateError;
    return true;
  } catch (error) {
    console.error('Error moving to next stop:', error);
    return false;
  }
}

/**
 * Check if check-in is allowed at current stop for a booking
 */
export async function validateCheckInAtStop(
  bookingId: string,
  currentStopId: string
): Promise<{ allowed: boolean; message: string }> {
  try {
    // Get booking stops
    const { data: bookingStops, error } = await supabase
      .from('booking_stops')
      .select(
        `
        boarding_stop_id,
        boarding_stop:trip_stops!booking_stops_boarding_stop_id_fkey(
          id,
          island_name,
          stop_sequence
        )
      `
      )
      .eq('booking_id', bookingId)
      .single();

    if (error || !bookingStops) {
      // No booking stops means regular trip - allow check-in
      return { allowed: true, message: 'Regular trip - check-in allowed' };
    }

    // Check if current stop matches boarding stop
    if (bookingStops.boarding_stop_id === currentStopId) {
      return {
        allowed: true,
        message: `Correct boarding stop: ${(bookingStops as any).boarding_stop?.island_name}`,
      };
    }

    return {
      allowed: false,
      message: `Passenger boards at ${(bookingStops as any).boarding_stop?.island_name}, not at current stop`,
    };
  } catch (error) {
    console.error('Error validating check-in at stop:', error);
    return { allowed: false, message: 'Validation error' };
  }
}

// ============================================================================
// ADMIN OPERATIONS
// ============================================================================

/**
 * Create stops for a trip
 */
export async function createTripStops(
  tripId: string,
  stops: Partial<TripStop>[]
): Promise<TripStop[]> {
  try {
    const stopsToInsert = stops.map((stop, index) => ({
      trip_id: tripId,
      island_id: stop.island_id!,
      stop_sequence: stop.stop_sequence || index + 1,
      stop_type: stop.stop_type || 'both',
      estimated_arrival_time: stop.estimated_arrival_time,
      estimated_departure_time: stop.estimated_departure_time,
      notes: stop.notes,
    }));

    const { data, error } = await supabase
      .from('trip_stops')
      .insert(stopsToInsert)
      .select();

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error creating trip stops:', error);
    throw new Error('Failed to create trip stops');
  }
}

/**
 * Update a stop
 */
export async function updateTripStop(
  stopId: string,
  updates: Partial<TripStop>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('trip_stops')
      .update(updates)
      .eq('id', stopId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating trip stop:', error);
    return false;
  }
}

/**
 * Delete a stop
 */
export async function deleteTripStop(stopId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('trip_stops')
      .delete()
      .eq('id', stopId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting trip stop:', error);
    return false;
  }
}

/**
 * Reorder stops
 */
export async function reorderTripStops(
  tripId: string,
  stopIds: string[]
): Promise<boolean> {
  try {
    // Update each stop with new sequence
    const updates = stopIds.map((stopId, index) =>
      supabase
        .from('trip_stops')
        .update({ stop_sequence: index + 1 })
        .eq('id', stopId)
    );

    await Promise.all(updates);
    return true;
  } catch (error) {
    console.error('Error reordering stops:', error);
    return false;
  }
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

/**
 * Check if a trip is multi-stop
 */
export async function isMultiStopTrip(tripId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('is_multi_stop')
      .eq('id', tripId)
      .single();

    if (error) throw error;
    return data?.is_multi_stop || false;
  } catch (error) {
    console.error('Error checking if trip is multi-stop:', error);
    return false;
  }
}

/**
 * Get multi-stop trip by ID with all stops
 */
export async function getMultiStopTrip(
  tripId: string
): Promise<MultiStopTrip | null> {
  try {
    const { data, error } = await supabase
      .from('multi_stop_trips_view')
      .select('*')
      .eq('trip_id', tripId)
      .single();

    if (error) throw error;

    if (data) {
      return {
        id: data.trip_id,
        travel_date: data.travel_date,
        departure_time: data.departure_time,
        status: data.status,
        is_multi_stop: data.is_multi_stop,
        current_stop_sequence: data.current_stop_sequence,
        current_stop_id: data.current_stop_id,
        vessel_name: data.vessel_name,
        seating_capacity: data.seating_capacity,
        stops: data.stops || [],
        total_stops: data.stops?.length || 0,
        completed_stops:
          data.stops?.filter((s: any) => s.status === 'completed').length || 0,
        // Add other required Trip fields with defaults
        route_id: '',
        vessel_id: '',
        available_seats: 0,
        is_active: true,
        estimated_duration: data.estimated_duration || '0h',
        booked_seats: data.booked_seats || 0,
        fare_multiplier: data.fare_multiplier || 1.0,
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
      } as MultiStopTrip;
    }

    return null;
  } catch (error) {
    console.error('Error fetching multi-stop trip:', error);
    return null;
  }
}

/**
 * Get all multi-stop trips for a date
 */
export async function getMultiStopTripsForDate(
  date: string
): Promise<MultiStopTrip[]> {
  try {
    const { data, error } = await supabase
      .from('multi_stop_trips_view')
      .select('*')
      .eq('travel_date', date)
      .order('departure_time');

    if (error) throw error;

    return (data || []).map(trip => ({
      id: trip.trip_id,
      travel_date: trip.travel_date,
      departure_time: trip.departure_time,
      status: trip.status,
      is_multi_stop: trip.is_multi_stop,
      current_stop_sequence: trip.current_stop_sequence,
      current_stop_id: trip.current_stop_id,
      vessel_name: trip.vessel_name,
      seating_capacity: trip.seating_capacity,
      stops: trip.stops || [],
      total_stops: trip.stops?.length || 0,
      completed_stops:
        trip.stops?.filter((s: any) => s.status === 'completed').length || 0,
      // Add other required Trip fields with defaults
      route_id: '',
      vessel_id: '',
      available_seats: 0,
      is_active: true,
      estimated_duration: trip.estimated_duration || '0h',
      booked_seats: trip.booked_seats || 0,
      fare_multiplier: trip.fare_multiplier || 1.0,
      created_at: trip.created_at || new Date().toISOString(),
      updated_at: trip.updated_at || new Date().toISOString(),
    })) as MultiStopTrip[];
  } catch (error) {
    console.error('Error fetching multi-stop trips for date:', error);
    return [];
  }
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format stop sequence as a readable route
 * Example: "Felijhoo → Keyodhoo → Thinadhoo → Fulidhoo"
 */
export function formatStopSequence(stops: TripStop[]): string {
  return stops
    .sort((a, b) => a.stop_sequence - b.stop_sequence)
    .map(stop => stop.island_name)
    .join(' → ');
}

/**
 * Format segment as readable text
 * Example: "Felijhoo to Thinadhoo (Stop 1 to Stop 3)"
 */
export function formatSegment(segment: AvailableSegment): string {
  return `${segment.from_stop.island_name} to ${segment.to_stop.island_name} (Stop ${segment.from_stop.stop_sequence} to Stop ${segment.to_stop.stop_sequence})`;
}

/**
 * Get stop display name with sequence
 */
export function getStopDisplayName(stop: TripStop | StopOption): string {
  return `Stop ${stop.stop_sequence}: ${stop.island_name}`;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate stop sequence doesn't have gaps
 */
export function validateStopSequence(stops: TripStop[]): boolean {
  const sequences = stops.map(s => s.stop_sequence).sort((a, b) => a - b);

  for (let i = 0; i < sequences.length; i++) {
    if (sequences[i] !== i + 1) {
      return false; // Gap or duplicate found
    }
  }

  return true;
}

/**
 * Validate that at least one stop allows pickup and one allows dropoff
 */
export function validateStopTypes(stops: TripStop[]): boolean {
  const hasPickup = stops.some(
    s => s.stop_type === 'pickup' || s.stop_type === 'both'
  );
  const hasDropoff = stops.some(
    s => s.stop_type === 'dropoff' || s.stop_type === 'both'
  );

  return hasPickup && hasDropoff;
}

/**
 * Validate times are in sequence
 */
export function validateStopTimes(stops: TripStop[]): boolean {
  const sortedStops = [...stops].sort(
    (a, b) => a.stop_sequence - b.stop_sequence
  );

  for (let i = 1; i < sortedStops.length; i++) {
    const prevStop = sortedStops[i - 1];
    const currStop = sortedStops[i];

    // If both have departure/arrival times, validate sequence
    if (prevStop.estimated_departure_time && currStop.estimated_arrival_time) {
      if (
        prevStop.estimated_departure_time >= currStop.estimated_arrival_time
      ) {
        return false;
      }
    }
  }

  return true;
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export // Already exported above
 {};
