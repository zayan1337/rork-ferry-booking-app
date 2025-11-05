/**
 * Multi-Stop Route Utilities
 *
 * Helper functions for managing routes with multiple stops and segment fares
 */

import { supabase } from './supabase';
import type {
  RouteStop,
  RouteSegmentFare,
  MultiStopRoute,
  MultiStopRouteFormData,
  RouteWithStopsResponse,
  AvailableRouteSegment,
} from '@/types/multiStopRoute';

// ============================================================================
// ROUTE STOP MANAGEMENT
// ============================================================================

/**
 * Get all stops for a route
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
    estimated_travel_time_from_previous: stop.estimated_travel_time, // Map database field to TypeScript field
    island_name: stop.island?.name,
    island_zone: stop.island?.zone,
  }));
}

/**
 * Create route stops
 */
export async function createRouteStops(
  routeId: string,
  stops: {
    island_id: string;
    stop_sequence: number;
    stop_type: string;
    estimated_travel_time_from_previous: number | null;
    notes: string;
  }[]
): Promise<RouteStop[]> {
  const { data, error } = await supabase
    .from('route_stops')
    .insert(
      stops.map(stop => ({
        route_id: routeId,
        island_id: stop.island_id,
        stop_sequence: stop.stop_sequence,
        stop_type: stop.stop_type,
        estimated_travel_time: stop.estimated_travel_time_from_previous, // Map to correct column name
        notes: stop.notes,
      }))
    )
    .select();

  if (error) throw error;
  return data || [];
}

/**
 * Update a route stop
 */
export async function updateRouteStop(
  stopId: string,
  updates: Partial<RouteStop>
): Promise<RouteStop> {
  // Map estimated_travel_time_from_previous to estimated_travel_time for database
  const dbUpdates: any = { ...updates };
  if ('estimated_travel_time_from_previous' in dbUpdates) {
    dbUpdates.estimated_travel_time =
      dbUpdates.estimated_travel_time_from_previous;
    delete dbUpdates.estimated_travel_time_from_previous;
  }
  // Remove readonly/computed fields
  delete dbUpdates.island_name;
  delete dbUpdates.island_zone;

  const { data, error } = await supabase
    .from('route_stops')
    .update(dbUpdates)
    .eq('id', stopId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a route stop
 */
export async function deleteRouteStop(stopId: string): Promise<void> {
  const { error } = await supabase
    .from('route_stops')
    .delete()
    .eq('id', stopId);

  if (error) throw error;
}

/**
 * Reorder route stops
 */
export async function reorderRouteStops(
  routeId: string,
  stopIds: string[]
): Promise<void> {
  // Update sequence for each stop
  const updates = stopIds.map((stopId, index) => ({
    id: stopId,
    stop_sequence: index + 1,
  }));

  for (const update of updates) {
    await supabase
      .from('route_stops')
      .update({ stop_sequence: update.stop_sequence })
      .eq('id', update.id)
      .eq('route_id', routeId);
  }
}

// ============================================================================
// ROUTE SEGMENT FARE MANAGEMENT
// ============================================================================

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
 * Generate segment fares for all combinations
 */
export async function generateRouteSegmentFares(
  routeId: string,
  stops: RouteStop[],
  fareMatrix: Map<string, number>
): Promise<RouteSegmentFare[]> {
  const segmentFares: {
    route_id: string;
    from_stop_id: string;
    to_stop_id: string;
    fare_amount: number;
  }[] = [];

  // Generate all valid segment combinations
  for (let i = 0; i < stops.length; i++) {
    for (let j = i + 1; j < stops.length; j++) {
      const key = `${i}-${j}`;
      const fare = fareMatrix.get(key);

      if (fare && fare > 0) {
        segmentFares.push({
          route_id: routeId,
          from_stop_id: stops[i].id,
          to_stop_id: stops[j].id,
          fare_amount: fare,
        });
      }
    }
  }

  const { data, error } = await supabase
    .from('route_segment_fares')
    .insert(segmentFares)
    .select();

  if (error) throw error;
  return data || [];
}

/**
 * Update a segment fare
 */
export async function updateRouteSegmentFare(
  fareId: string,
  fareAmount: number
): Promise<RouteSegmentFare> {
  const { data, error } = await supabase
    .from('route_segment_fares')
    .update({ fare_amount: fareAmount })
    .eq('id', fareId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete segment fare
 */
export async function deleteRouteSegmentFare(fareId: string): Promise<void> {
  const { error } = await supabase
    .from('route_segment_fares')
    .delete()
    .eq('id', fareId);

  if (error) throw error;
}

/**
 * Auto-fill segment fares based on distance and base fare
 */
export function autoFillSegmentFares(
  stops: { island_id: string }[],
  baseFarePerStop: number
): Map<string, number> {
  const fareMatrix = new Map<string, number>();

  for (let i = 0; i < stops.length; i++) {
    for (let j = i + 1; j < stops.length; j++) {
      const distance = j - i;
      const fare = distance * baseFarePerStop;
      fareMatrix.set(`${i}-${j}`, fare);
    }
  }

  return fareMatrix;
}

// ============================================================================
// MULTI-STOP ROUTE OPERATIONS
// ============================================================================

/**
 * Get complete route with stops and fares
 */
export async function getMultiStopRoute(
  routeId: string
): Promise<MultiStopRoute | null> {
  // Get route details
  const { data: route, error: routeError } = await supabase
    .from('routes')
    .select('*')
    .eq('id', routeId)
    .single();

  if (routeError) throw routeError;
  if (!route) return null;

  // Get stops
  const stops = await getRouteStops(routeId);

  // Get segment fares
  const segmentFares = await getRouteSegmentFares(routeId);

  return {
    ...route,
    stops,
    segment_fares: segmentFares,
  };
}

/**
 * Get all multi-stop routes
 */
export async function getMultiStopRoutes(): Promise<RouteWithStopsResponse[]> {
  const { data, error } = await supabase
    .from('routes_with_stops_view')
    .select('*')
    .eq('is_multi_stop', true)
    .order('name');

  if (error) throw error;
  return data || [];
}

/**
 * Create a new multi-stop route
 */
export async function createMultiStopRoute(
  formData: MultiStopRouteFormData
): Promise<string> {
  // 1. Create the route
  const isMultiStop = formData.stops.length > 2;

  const routeData: any = {
    name: formData.name,
    status: formData.status,
    base_fare: formData.base_fare,
    is_multi_stop: isMultiStop,
    total_stops: formData.stops.length,
    description: formData.description,
  };

  // Set from_island_id and to_island_id from first and last stops
  if (formData.stops.length >= 2) {
    routeData.from_island_id = formData.stops[0]?.island_id;
    routeData.to_island_id =
      formData.stops[formData.stops.length - 1]?.island_id;
  }

  const { data: route, error: routeError } = await supabase
    .from('routes')
    .insert(routeData)
    .select()
    .single();

  if (routeError) throw routeError;

  try {
    // 2. Create route stops
    const createdStops = await createRouteStops(route.id, formData.stops);

    // 3. Create segment fares
    await generateRouteSegmentFares(
      route.id,
      createdStops,
      formData.segment_fares
    );

    return route.id;
  } catch (error) {
    // Rollback: delete the route if stops or fares creation fails
    await supabase.from('routes').delete().eq('id', route.id);
    throw error;
  }
}

/**
 * Update a multi-stop route
 */
export async function updateMultiStopRoute(
  routeId: string,
  formData: Partial<MultiStopRouteFormData>
): Promise<void> {
  // Update route basic info
  if (formData.name || formData.status || formData.base_fare) {
    const { error } = await supabase
      .from('routes')
      .update({
        ...(formData.name && { name: formData.name }),
        ...(formData.status && { status: formData.status }),
        ...(formData.base_fare && { base_fare: formData.base_fare }),
      })
      .eq('id', routeId);

    if (error) throw error;
  }

  // Update stops if provided
  if (formData.stops && formData.stops.length > 0) {
    // Update from_island_id and to_island_id from first and last stops
    const firstStop = formData.stops[0];
    const lastStop = formData.stops[formData.stops.length - 1];

    await supabase
      .from('routes')
      .update({
        from_island_id: firstStop?.island_id,
        to_island_id: lastStop?.island_id,
      })
      .eq('id', routeId);

    // Delete existing stops
    await supabase.from('route_stops').delete().eq('route_id', routeId);

    // Create new stops
    const createdStops = await createRouteStops(routeId, formData.stops);

    // Update segment fares if provided
    if (formData.segment_fares) {
      // Delete existing fares
      await supabase
        .from('route_segment_fares')
        .delete()
        .eq('route_id', routeId);

      // Create new fares
      await generateRouteSegmentFares(
        routeId,
        createdStops,
        formData.segment_fares
      );
    }
  }
}

/**
 * Delete a multi-stop route
 */
export async function deleteMultiStopRoute(routeId: string): Promise<void> {
  // Cascade delete will handle stops and segment fares
  const { error } = await supabase.from('routes').delete().eq('id', routeId);

  if (error) throw error;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get available segments for booking
 */
export async function getAvailableRouteSegments(
  routeId: string
): Promise<AvailableRouteSegment[]> {
  const stops = await getRouteStops(routeId);
  const fares = await getRouteSegmentFares(routeId);

  const segments: AvailableRouteSegment[] = [];

  for (const fare of fares) {
    const fromStop = stops.find(s => s.id === fare.from_stop_id);
    const toStop = stops.find(s => s.id === fare.to_stop_id);

    if (fromStop && toStop) {
      // Calculate estimated duration
      let estimatedDuration = 0;
      for (let i = fromStop.stop_sequence; i < toStop.stop_sequence; i++) {
        const stop = stops.find(s => s.stop_sequence === i + 1);
        if (stop?.estimated_travel_time_from_previous) {
          estimatedDuration += stop.estimated_travel_time_from_previous;
        }
      }

      segments.push({
        from_stop_id: fare.from_stop_id,
        to_stop_id: fare.to_stop_id,
        from_island_name: fare.from_island_name || fromStop.island_name || '',
        to_island_name: fare.to_island_name || toStop.island_name || '',
        fare_amount: fare.fare_amount,
        stops_count: toStop.stop_sequence - fromStop.stop_sequence,
        estimated_duration: estimatedDuration > 0 ? estimatedDuration : null,
      });
    }
  }

  return segments;
}

/**
 * Calculate total route distance (sum of all segments)
 */
export function calculateTotalRouteDistance(stops: RouteStop[]): string {
  const count = stops.length;
  if (count <= 1) return '0 stops';
  return `${count - 1} segment${count - 1 > 1 ? 's' : ''}`;
}

/**
 * Validate route stops
 */
export function validateRouteStops(
  stops: { island_id: string; stop_sequence: number; stop_type: string }[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check minimum stops
  if (stops.length < 2) {
    errors.push('Route must have at least 2 stops');
  }

  // Check for duplicate islands
  const islandIds = stops.map(s => s.island_id);
  const uniqueIslands = new Set(islandIds);
  if (uniqueIslands.size !== islandIds.length) {
    errors.push('Route cannot have duplicate islands');
  }

  // Check sequence numbers
  const sequences = stops.map(s => s.stop_sequence).sort((a, b) => a - b);
  for (let i = 0; i < sequences.length; i++) {
    if (sequences[i] !== i + 1) {
      errors.push('Stop sequences must be continuous (1, 2, 3, ...)');
      break;
    }
  }

  // Check at least one pickup and one dropoff
  const hasPickup = stops.some(
    s => s.stop_type === 'pickup' || s.stop_type === 'both'
  );
  const hasDropoff = stops.some(
    s => s.stop_type === 'dropoff' || s.stop_type === 'both'
  );

  if (!hasPickup) {
    errors.push('Route must have at least one pickup stop');
  }
  if (!hasDropoff) {
    errors.push('Route must have at least one dropoff stop');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate segment fares
 */
export function validateSegmentFares(
  stops: any[],
  fareMatrix: Map<string, number>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (stops.length < 2) {
    errors.push('Need at least 2 stops to set fares');
    return { isValid: false, errors };
  }

  // Calculate expected number of segments
  const totalSegments = (stops.length * (stops.length - 1)) / 2;

  // Check all segments have fares
  let configuredSegments = 0;
  for (let i = 0; i < stops.length; i++) {
    for (let j = i + 1; j < stops.length; j++) {
      const key = `${i}-${j}`;
      const fare = fareMatrix.get(key);

      if (fare === undefined || fare === null) {
        errors.push(`Missing fare for segment: Stop ${i + 1} to Stop ${j + 1}`);
      } else if (fare <= 0) {
        errors.push(
          `Invalid fare (must be > 0) for segment: Stop ${i + 1} to Stop ${j + 1}`
        );
      } else {
        configuredSegments++;
      }
    }
  }

  if (configuredSegments < totalSegments) {
    errors.push(
      `Only ${configuredSegments}/${totalSegments} segments have valid fares`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Format route stop names for display
 */
export function formatRouteStopNames(stops: RouteStop[]): string {
  if (stops.length === 0) return 'No stops';
  if (stops.length === 1) return stops[0].island_name || 'Unknown';
  if (stops.length === 2) {
    return `${stops[0].island_name} → ${stops[1].island_name}`;
  }

  const first = stops[0].island_name;
  const last = stops[stops.length - 1].island_name;
  const middle = stops.length - 2;

  return `${first} → ${middle} stop${middle > 1 ? 's' : ''} → ${last}`;
}
