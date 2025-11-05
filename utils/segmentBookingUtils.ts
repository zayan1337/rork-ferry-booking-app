/**
 * Segment Booking Utilities
 *
 * Helper functions for booking with multi-stop routes and segment-based operations
 */

import { supabase } from './supabase';
import type { RouteStop, RouteSegmentFare } from '@/types/multiStopRoute';

// ============================================================================
// ISLAND/STOP DISCOVERY
// ============================================================================

/**
 * Get all islands that can be used as boarding locations
 */
export async function getAllBoardingIslands(): Promise<any[]> {
  const { data, error } = await supabase
    .from('route_stops')
    .select(
      `
      island_id,
      island:islands!route_stops_island_id_fkey (
        id,
        name,
        zone
      )
    `
    )
    .in('stop_type', ['pickup', 'both']);

  if (error) throw error;

  // Deduplicate islands
  const uniqueIslands = new Map();
  (data || []).forEach((stop: any) => {
    if (stop.island && !uniqueIslands.has(stop.island.id)) {
      uniqueIslands.set(stop.island.id, stop.island);
    }
  });

  // Convert to array and sort by name
  return Array.from(uniqueIslands.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

/**
 * Get all islands that can be destinations from a specific boarding island
 */
export async function getDestinationIslandsFromBoarding(
  boardingIslandId: string
): Promise<any[]> {
  // Find all routes that have this island as a boarding stop
  const { data: boardingStops, error: boardingError } = await supabase
    .from('route_stops')
    .select('id, route_id, stop_sequence')
    .eq('island_id', boardingIslandId)
    .in('stop_type', ['pickup', 'both']);

  if (boardingError) throw boardingError;

  if (!boardingStops || boardingStops.length === 0) {
    return [];
  }

  // For each boarding stop, get all possible destination stops on the same route
  const destinationIslandIds = new Set();
  const destinationIslands: any[] = [];

  for (const boardingStop of boardingStops) {
    const { data: destStops, error: destError } = await supabase
      .from('route_stops')
      .select(
        `
        island_id,
        island:islands!route_stops_island_id_fkey (
          id,
          name,
          zone
        )
      `
      )
      .eq('route_id', boardingStop.route_id)
      .gt('stop_sequence', boardingStop.stop_sequence)
      .in('stop_type', ['dropoff', 'both']);

    if (!destError && destStops) {
      destStops.forEach((stop: any) => {
        if (stop.island && !destinationIslandIds.has(stop.island.id)) {
          destinationIslandIds.add(stop.island.id);
          destinationIslands.push(stop.island);
        }
      });
    }
  }

  // Sort by island name before returning
  return destinationIslands.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Find routes that serve a specific segment (boarding island to destination island)
 */
export async function findRoutesServingSegment(
  boardingIslandId: string,
  destinationIslandId: string
): Promise<
  {
    route_id: string;
    route_name: string;
    boarding_stop_id: string;
    boarding_stop_sequence: number;
    destination_stop_id: string;
    destination_stop_sequence: number;
    base_fare: number;
  }[]
> {
  // Find all boarding stops for this island
  const { data: boardingStops, error: boardingError } = await supabase
    .from('route_stops')
    .select(
      `
      id,
      route_id,
      stop_sequence,
      routes!inner (
        id,
        name,
        base_fare,
        is_active
      )
    `
    )
    .eq('island_id', boardingIslandId)
    .in('stop_type', ['pickup', 'both']);

  if (boardingError) throw boardingError;

  if (!boardingStops || boardingStops.length === 0) {
    return [];
  }

  const routeSegments: {
    route_id: string;
    route_name: string;
    boarding_stop_id: string;
    boarding_stop_sequence: number;
    destination_stop_id: string;
    destination_stop_sequence: number;
    base_fare: number;
  }[] = [];

  // For each boarding stop, check if there's a valid destination stop on the same route
  for (const boardingStop of boardingStops as any[]) {
    const { data: destStops, error: destError } = await supabase
      .from('route_stops')
      .select('id, stop_sequence')
      .eq('route_id', boardingStop.route_id)
      .eq('island_id', destinationIslandId)
      .gt('stop_sequence', boardingStop.stop_sequence)
      .in('stop_type', ['dropoff', 'both']);

    if (!destError && destStops && destStops.length > 0) {
      // Take the first valid destination stop
      const destStop = destStops[0];
      routeSegments.push({
        route_id: boardingStop.route_id,
        route_name: boardingStop.routes.name,
        boarding_stop_id: boardingStop.id,
        boarding_stop_sequence: boardingStop.stop_sequence,
        destination_stop_id: destStop.id,
        destination_stop_sequence: destStop.stop_sequence,
        base_fare: boardingStop.routes.base_fare,
      });
    }
  }

  return routeSegments;
}

/**
 * Get trips for a specific segment with calculated segment fares
 */
export async function getTripsForSegment(
  boardingIslandId: string,
  destinationIslandId: string,
  travelDate: string
): Promise<
  {
    trip_id: string;
    route_id: string;
    route_name: string;
    travel_date: string;
    departure_time: string;
    vessel_id: string;
    vessel_name: string;
    boarding_stop_id: string;
    destination_stop_id: string;
    boarding_stop_sequence: number;
    destination_stop_sequence: number;
    boarding_island_name: string;
    destination_island_name: string;
    segment_fare: number;
    available_seats_for_segment: number;
    seating_capacity: number;
    is_active: boolean;
    fare_multiplier: number;
    total_stops: number;
  }[]
> {
  // First, find all routes serving this segment
  const routeSegments = await findRoutesServingSegment(
    boardingIslandId,
    destinationIslandId
  );

  if (routeSegments.length === 0) {
    return [];
  }

  // Get island names in parallel
  const [{ data: boardingIsland }, { data: destinationIsland }] =
    await Promise.all([
      supabase
        .from('islands')
        .select('id, name')
        .eq('id', boardingIslandId)
        .single(),
      supabase
        .from('islands')
        .select('id, name')
        .eq('id', destinationIslandId)
        .single(),
    ]);

  const boardingIslandName = boardingIsland?.name || 'Unknown';
  const destinationIslandName = destinationIsland?.name || 'Unknown';

  // Process all route segments in parallel
  const segmentPromises = routeSegments.map(async segment => {
    // Get route stops and trips in parallel
    const [
      { data: routeStops, error: stopsError },
      { data: tripData, error: tripError },
    ] = await Promise.all([
      supabase
        .from('route_stops')
        .select('id')
        .eq('route_id', segment.route_id),
      supabase
        .from('trips')
        .select(
          `
        id,
        route_id,
        travel_date,
        departure_time,
        vessel_id,
        is_active,
        fare_multiplier,
        available_seats,
        vessels!inner (
          id,
          name,
          seating_capacity
        )
      `
        )
        .eq('route_id', segment.route_id)
        .eq('travel_date', travelDate)
        .eq('is_active', true)
        .order('departure_time'),
    ]);

    const totalStops = !stopsError && routeStops ? routeStops.length : 0;

    if (!tripError && tripData && tripData.length > 0) {
      // Process all trips in parallel for this segment
      const tripPromises = (tripData as any[]).map(async trip => {
        // Run all queries for this trip in parallel
        const [
          { data: fareData, error: fareError },
          { count: bookedSeatCount, error: bookedError },
          { count: adminBlockedCount, error: adminBlockedError },
        ] = await Promise.all([
          // Get segment fare
          supabase.rpc('get_effective_segment_fare', {
            p_trip_id: trip.id,
            p_from_stop_id: segment.boarding_stop_id,
            p_to_stop_id: segment.destination_stop_id,
          }),
          // Count booked seats
          supabase
            .from('seat_reservations')
            .select('id', { count: 'exact', head: true })
            .eq('trip_id', trip.id)
            .not('booking_id', 'is', null),
          // Count admin-blocked seats
          supabase
            .from('seat_reservations')
            .select('id', { count: 'exact', head: true })
            .eq('trip_id', trip.id)
            .eq('is_admin_blocked', true),
        ]);

        const segmentFare = fareError ? 0 : fareData || 0;
        const vesselCapacity = trip.vessels.seating_capacity;
        const bookedSeats = bookedError ? 0 : bookedSeatCount || 0;
        const adminBlockedSeats = adminBlockedError
          ? 0
          : adminBlockedCount || 0;

        // Available seats = total capacity - booked seats - admin blocked seats
        const availableSeats = Math.max(
          0,
          vesselCapacity - bookedSeats - adminBlockedSeats
        );

        return {
          trip_id: trip.id,
          route_id: segment.route_id,
          route_name: segment.route_name,
          travel_date: trip.travel_date,
          departure_time: trip.departure_time,
          vessel_id: trip.vessel_id,
          vessel_name: trip.vessels.name,
          boarding_stop_id: segment.boarding_stop_id,
          destination_stop_id: segment.destination_stop_id,
          boarding_stop_sequence: segment.boarding_stop_sequence,
          destination_stop_sequence: segment.destination_stop_sequence,
          boarding_island_name: boardingIslandName,
          destination_island_name: destinationIslandName,
          segment_fare: segmentFare,
          available_seats_for_segment: availableSeats,
          seating_capacity: vesselCapacity,
          is_active: trip.is_active,
          fare_multiplier: trip.fare_multiplier || 1.0,
          total_stops: totalStops,
        };
      });

      // Wait for all trips to be processed
      return await Promise.all(tripPromises);
    }
    return [];
  });

  // Wait for all segments to be processed and flatten results
  const allTrips = await Promise.all(segmentPromises);
  const trips = allTrips.flat();

  // Sort by departure time
  trips.sort((a, b) => a.departure_time.localeCompare(b.departure_time));

  return trips;
}

// ============================================================================
// ROUTE STOPS
// ============================================================================

/**
 * Get all stops for a route ordered by sequence
 */
export async function getRouteStops(routeId: string): Promise<RouteStop[]> {
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

  return (data || []).map((stop: any) => ({
    ...stop,
    estimated_travel_time_from_previous: stop.estimated_travel_time,
    island_name: stop.island?.name,
    island_zone: stop.island?.zone,
  }));
}

/**
 * Get boarding stops for a route (pickup or both)
 */
export async function getBoardingStops(routeId: string): Promise<RouteStop[]> {
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
    .in('stop_type', ['pickup', 'both'])
    .order('stop_sequence');

  if (error) throw error;

  return (data || []).map((stop: any) => ({
    ...stop,
    estimated_travel_time_from_previous: stop.estimated_travel_time,
    island_name: stop.island?.name,
    island_zone: stop.island?.zone,
  }));
}

/**
 * Get destination stops for a route after a specific stop sequence (dropoff or both)
 */
export async function getDestinationStops(
  routeId: string,
  afterStopSequence: number
): Promise<RouteStop[]> {
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
    .in('stop_type', ['dropoff', 'both'])
    .gt('stop_sequence', afterStopSequence)
    .order('stop_sequence');

  if (error) throw error;

  return (data || []).map((stop: any) => ({
    ...stop,
    estimated_travel_time_from_previous: stop.estimated_travel_time,
    island_name: stop.island?.name,
    island_zone: stop.island?.zone,
  }));
}

// ============================================================================
// SEGMENT FARES
// ============================================================================

/**
 * Get segment fare between two stops
 */
export async function getSegmentFare(
  routeId: string,
  fromStopId: string,
  toStopId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('route_segment_fares')
    .select('fare_amount')
    .eq('route_id', routeId)
    .eq('from_stop_id', fromStopId)
    .eq('to_stop_id', toStopId)
    .single();

  if (error) throw error;

  return data?.fare_amount || 0;
}

/**
 * Get all segment fares for a route
 */
export async function getRouteSegmentFares(
  routeId: string
): Promise<RouteSegmentFare[]> {
  const { data, error } = await supabase
    .from('route_segment_fares_view')
    .select('*')
    .eq('route_id', routeId);

  if (error) throw error;

  return data || [];
}

/**
 * Get effective fare for a segment with trip fare multiplier
 */
export async function getEffectiveSegmentFare(
  tripId: string,
  fromStopId: string,
  toStopId: string
): Promise<number> {
  const { data, error } = await supabase.rpc('get_effective_segment_fare', {
    p_trip_id: tripId,
    p_from_stop_id: fromStopId,
    p_to_stop_id: toStopId,
  });

  if (error) throw error;

  return data || 0;
}

// ============================================================================
// SEAT AVAILABILITY
// ============================================================================

/**
 * Get available seats for a specific segment
 */
export async function getAvailableSeatsForSegment(
  tripId: string,
  fromStopSequence: number,
  toStopSequence: number
): Promise<any[]> {
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
}

/**
 * Check if a seat is available for a specific segment
 */
export async function isSeatAvailableForSegment(
  tripId: string,
  seatId: string,
  fromStopSequence: number,
  toStopSequence: number
): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_seat_available_for_segment', {
    p_trip_id: tripId,
    p_seat_id: seatId,
    p_boarding_sequence: fromStopSequence,
    p_destination_sequence: toStopSequence,
  });

  if (error) throw error;

  return data || false;
}

// ============================================================================
// SEAT RESERVATIONS (SEGMENT-BASED)
// ============================================================================

/**
 * Reserve a seat for a specific segment
 */
export async function reserveSeatForSegment(
  tripId: string,
  seatId: string,
  bookingId: string,
  passengerId: string | null,
  boardingStopId: string,
  destinationStopId: string,
  boardingSequence: number,
  destinationSequence: number,
  userId: string,
  sessionId: string
): Promise<boolean> {
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

  return data || false;
}

/**
 * Create temporary seat reservation for a segment (before booking confirmation)
 */
export async function createTempSeatReservationForSegment(
  tripId: string,
  seatId: string,
  boardingStopId: string,
  destinationStopId: string,
  boardingSequence: number,
  destinationSequence: number,
  userId: string,
  sessionId: string
): Promise<boolean> {
  try {
    // Check if seat is available first
    const isAvailable = await isSeatAvailableForSegment(
      tripId,
      seatId,
      boardingSequence,
      destinationSequence
    );

    if (!isAvailable) {
      return false;
    }

    // Create temporary reservation (expires in 5 minutes)
    const expiryTime = new Date(Date.now() + 5 * 60 * 1000);

    const { error } = await supabase.from('seat_segment_reservations').insert({
      trip_id: tripId,
      seat_id: seatId,
      booking_id: null, // Temporary reservation has no booking_id
      passenger_id: null,
      boarding_stop_id: boardingStopId,
      destination_stop_id: destinationStopId,
      boarding_stop_sequence: boardingSequence,
      destination_stop_sequence: destinationSequence,
      user_id: userId,
      session_id: sessionId,
      reserved_at: new Date().toISOString(),
    });

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Failed to create temporary seat reservation:', error);
    return false;
  }
}

/**
 * Cleanup temporary seat reservations for a user session
 */
export async function cleanupTempSeatReservationsForSegment(
  tripId: string,
  userId: string,
  sessionId: string
): Promise<void> {
  try {
    await supabase
      .from('seat_segment_reservations')
      .delete()
      .eq('trip_id', tripId)
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .is('booking_id', null);
  } catch (error) {
    console.error('Failed to cleanup temporary seat reservations:', error);
  }
}

// ============================================================================
// BOOKING SEGMENTS
// ============================================================================

/**
 * Create a booking segment record
 */
export async function createBookingSegment(
  bookingId: string,
  boardingStopId: string,
  destinationStopId: string,
  boardingSequence: number,
  destinationSequence: number,
  fareAmount: number
): Promise<any> {
  const { data, error } = await supabase
    .from('booking_segments')
    .insert({
      booking_id: bookingId,
      boarding_stop_id: boardingStopId,
      destination_stop_id: destinationStopId,
      boarding_stop_sequence: boardingSequence,
      destination_stop_sequence: destinationSequence,
      fare_amount: fareAmount,
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Get booking segment information
 */
export async function getBookingSegment(bookingId: string): Promise<any> {
  const { data, error } = await supabase
    .from('booking_segments')
    .select(
      `
      *,
      boarding_stop:route_stops!booking_segments_boarding_stop_id_fkey (
        *,
        island:islands (name, zone)
      ),
      destination_stop:route_stops!booking_segments_destination_stop_id_fkey (
        *,
        island:islands (name, zone)
      )
    `
    )
    .eq('booking_id', bookingId)
    .single();

  if (error) throw error;

  return data;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate fare for a segment with seat price multipliers
 */
export function calculateSegmentFareWithSeats(
  baseFare: number,
  seats: any[],
  fareMultiplier: number = 1.0
): number {
  const totalFare = seats.reduce((total, seat) => {
    const seatMultiplier = seat.priceMultiplier || seat.price_multiplier || 1.0;
    return total + baseFare * fareMultiplier * seatMultiplier;
  }, 0);

  return totalFare;
}

/**
 * Validate segment selection
 */
export function validateSegmentSelection(
  boardingStop: any,
  destinationStop: any
): { isValid: boolean; error?: string } {
  if (!boardingStop) {
    return { isValid: false, error: 'Please select a boarding stop' };
  }

  if (!destinationStop) {
    return { isValid: false, error: 'Please select a destination stop' };
  }

  if (boardingStop.id === destinationStop.id) {
    return {
      isValid: false,
      error: 'Boarding and destination stops must be different',
    };
  }

  if (boardingStop.stop_sequence >= destinationStop.stop_sequence) {
    return {
      isValid: false,
      error: 'Destination stop must be after boarding stop',
    };
  }

  return { isValid: true };
}
