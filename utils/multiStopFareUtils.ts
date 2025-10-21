/**
 * Multi-Stop Fare Calculation Utilities
 *
 * Utilities for calculating fares for multi-stop trips
 * Supports various pricing models:
 * - Distance-based (fare per stop)
 * - Segment-based (specific fares per segment)
 * - Zone-based (different zones have different rates)
 */

import { supabase } from './supabase';
import type { TripStop, StopFare } from '@/types/multiStopTrip';

// ============================================================================
// FARE GENERATION
// ============================================================================

/**
 * Generate fares for all possible stop combinations
 * Uses distance-based pricing: base fare × number of stops between
 *
 * @param tripId - ID of the trip
 * @param stops - Array of trip stops
 * @param baseFarePerStop - Base fare for each stop interval
 * @returns Success status
 */
export async function generateStopFares(
  tripId: string,
  stops: TripStop[],
  baseFarePerStop: number
): Promise<boolean> {
  try {
    const faresToInsert: Partial<StopFare>[] = [];

    // Generate fares for all valid combinations
    for (let i = 0; i < stops.length; i++) {
      const fromStop = stops[i];

      // Skip if this stop doesn't allow boarding
      if (fromStop.stop_type === 'dropoff') continue;

      for (let j = i + 1; j < stops.length; j++) {
        const toStop = stops[j];

        // Skip if this stop doesn't allow dropoff
        if (toStop.stop_type === 'pickup') continue;

        // Calculate fare based on distance (number of stops)
        const stopDistance = toStop.stop_sequence - fromStop.stop_sequence;
        const fare = baseFarePerStop * stopDistance;

        faresToInsert.push({
          trip_id: tripId,
          from_stop_id: fromStop.id,
          to_stop_id: toStop.id,
          fare: fare,
        });
      }
    }

    if (faresToInsert.length === 0) {
      throw new Error('No valid fare combinations generated');
    }

    const { error } = await supabase.from('stop_fares').upsert(faresToInsert, {
      onConflict: 'trip_id,from_stop_id,to_stop_id',
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error generating stop fares:', error);
    return false;
  }
}

/**
 * Generate fares with custom pricing logic
 * Allows different fares for different segments
 */
export async function generateCustomStopFares(
  tripId: string,
  fareMatrix: Map<string, number> // Key: "fromStopId-toStopId", Value: fare
): Promise<boolean> {
  try {
    const faresToInsert: Partial<StopFare>[] = [];

    fareMatrix.forEach((fare, key) => {
      const [fromStopId, toStopId] = key.split('-');
      faresToInsert.push({
        trip_id: tripId,
        from_stop_id: fromStopId,
        to_stop_id: toStopId,
        fare: fare,
      });
    });

    const { error } = await supabase.from('stop_fares').upsert(faresToInsert, {
      onConflict: 'trip_id,from_stop_id,to_stop_id',
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error generating custom stop fares:', error);
    return false;
  }
}

/**
 * Auto-generate fares with a simple callback for custom logic
 */
export async function generateStopFaresWithCallback(
  tripId: string,
  stops: TripStop[],
  fareCalculator: (fromStop: TripStop, toStop: TripStop) => number
): Promise<boolean> {
  try {
    const faresToInsert: Partial<StopFare>[] = [];

    for (let i = 0; i < stops.length; i++) {
      const fromStop = stops[i];
      if (fromStop.stop_type === 'dropoff') continue;

      for (let j = i + 1; j < stops.length; j++) {
        const toStop = stops[j];
        if (toStop.stop_type === 'pickup') continue;

        const fare = fareCalculator(fromStop, toStop);

        faresToInsert.push({
          trip_id: tripId,
          from_stop_id: fromStop.id,
          to_stop_id: toStop.id,
          fare: fare,
        });
      }
    }

    const { error } = await supabase.from('stop_fares').upsert(faresToInsert, {
      onConflict: 'trip_id,from_stop_id,to_stop_id',
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error generating fares with callback:', error);
    return false;
  }
}

// ============================================================================
// FARE CALCULATION
// ============================================================================

/**
 * Calculate total fare for a booking with segment
 */
export async function calculateSegmentFare(
  tripId: string,
  boardingStopId: string,
  destinationStopId: string,
  passengerCount: number,
  fareMultiplier: number = 1.0
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('stop_fares')
      .select('fare')
      .eq('trip_id', tripId)
      .eq('from_stop_id', boardingStopId)
      .eq('to_stop_id', destinationStopId)
      .single();

    if (error) throw error;

    const baseFare = data?.fare || 0;
    return baseFare * passengerCount * fareMultiplier;
  } catch (error) {
    console.error('Error calculating segment fare:', error);
    return 0;
  }
}

/**
 * Get fare for a specific segment
 */
export async function getStopFare(
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
      console.error('Error fetching stop fare:', error);
      return 0;
    }

    return data?.fare || 0;
  } catch (error) {
    console.error('Error in getStopFare:', error);
    return 0;
  }
}

/**
 * Update fare for a specific segment
 */
export async function updateStopFare(
  tripId: string,
  fromStopId: string,
  toStopId: string,
  newFare: number
): Promise<boolean> {
  try {
    const { error } = await supabase.from('stop_fares').upsert(
      {
        trip_id: tripId,
        from_stop_id: fromStopId,
        to_stop_id: toStopId,
        fare: newFare,
      },
      {
        onConflict: 'trip_id,from_stop_id,to_stop_id',
      }
    );

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating stop fare:', error);
    return false;
  }
}

// ============================================================================
// PRICING STRATEGIES
// ============================================================================

/**
 * Linear pricing: Fare increases linearly with distance
 */
export function linearPricingStrategy(
  baseFarePerStop: number
): (fromStop: TripStop, toStop: TripStop) => number {
  return (fromStop, toStop) => {
    const distance = toStop.stop_sequence - fromStop.stop_sequence;
    return baseFarePerStop * distance;
  };
}

/**
 * Tiered pricing: Discounts for longer journeys
 */
export function tieredPricingStrategy(
  baseFarePerStop: number,
  tiers: { minStops: number; discountPercent: number }[]
): (fromStop: TripStop, toStop: TripStop) => number {
  return (fromStop, toStop) => {
    const distance = toStop.stop_sequence - fromStop.stop_sequence;
    const baseFare = baseFarePerStop * distance;

    // Find applicable tier
    const applicableTier = [...tiers]
      .sort((a, b) => b.minStops - a.minStops)
      .find(tier => distance >= tier.minStops);

    if (applicableTier) {
      const discount = baseFare * (applicableTier.discountPercent / 100);
      return baseFare - discount;
    }

    return baseFare;
  };
}

/**
 * Zone-based pricing: Different rates for cross-zone travel
 */
export function zonePricingStrategy(
  sameZoneFare: number,
  crossZoneFare: number
): (fromStop: TripStop, toStop: TripStop) => number {
  return (fromStop, toStop) => {
    const distance = toStop.stop_sequence - fromStop.stop_sequence;

    // Check if crossing zones
    const isCrossZone = fromStop.zone !== toStop.zone;

    if (isCrossZone) {
      return crossZoneFare * distance;
    }

    return sameZoneFare * distance;
  };
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Update all fares for a trip
 */
export async function updateAllStopFares(
  tripId: string,
  baseFarePerStop: number
): Promise<boolean> {
  try {
    // Get all stops
    const stops = await getTripStopsForFareCalculation(tripId);

    // Regenerate fares
    return await generateStopFares(tripId, stops, baseFarePerStop);
  } catch (error) {
    console.error('Error updating all stop fares:', error);
    return false;
  }
}

/**
 * Helper to get stops for fare calculation
 */
async function getTripStopsForFareCalculation(
  tripId: string
): Promise<TripStop[]> {
  const { data, error } = await supabase
    .from('trip_stops_view')
    .select('*')
    .eq('trip_id', tripId)
    .order('stop_sequence');

  if (error) throw error;
  return data || [];
}

/**
 * Delete all fares for a trip
 */
export async function deleteAllStopFares(tripId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('stop_fares')
      .delete()
      .eq('trip_id', tripId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting stop fares:', error);
    return false;
  }
}

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * Get revenue breakdown by segment
 */
export async function getSegmentRevenue(tripId: string): Promise<
  {
    from_stop: string;
    to_stop: string;
    bookings: number;
    revenue: number;
  }[]
> {
  try {
    const { data, error } = await supabase.rpc('get_segment_revenue', {
      p_trip_id: tripId,
    });

    if (error) {
      // Fallback if RPC doesn't exist
      return await getSegmentRevenueManual(tripId);
    }

    return data || [];
  } catch (error) {
    console.error('Error getting segment revenue:', error);
    return [];
  }
}

/**
 * Manual segment revenue calculation (fallback)
 */
async function getSegmentRevenueManual(tripId: string): Promise<
  {
    from_stop: string;
    to_stop: string;
    bookings: number;
    revenue: number;
  }[]
> {
  try {
    const { data: bookings, error } = await supabase
      .from('bookings_with_stops_view')
      .select('*')
      .eq('trip_id', tripId)
      .in('status', ['confirmed', 'checked_in', 'completed']);

    if (error) throw error;

    // Group by segment
    const segmentMap = new Map<
      string,
      { bookings: number; revenue: number; from: string; to: string }
    >();

    bookings?.forEach(booking => {
      const key = `${booking.boarding_stop_id}-${booking.destination_stop_id}`;
      const existing = segmentMap.get(key) || {
        bookings: 0,
        revenue: 0,
        from: booking.boarding_island_name || '',
        to: booking.destination_island_name || '',
      };

      segmentMap.set(key, {
        ...existing,
        bookings: existing.bookings + 1,
        revenue:
          existing.revenue + (booking.segment_fare || booking.total_fare || 0),
      });
    });

    return Array.from(segmentMap.values()).map(v => ({
      from_stop: v.from,
      to_stop: v.to,
      bookings: v.bookings,
      revenue: v.revenue,
    }));
  } catch (error) {
    console.error('Error in manual segment revenue calculation:', error);
    return [];
  }
}

/**
 * Get most popular segment for a trip
 */
export async function getMostPopularSegment(tripId: string): Promise<{
  from_stop: string;
  to_stop: string;
  bookings: number;
} | null> {
  try {
    const segments = await getSegmentRevenue(tripId);

    if (segments.length === 0) return null;

    return segments.reduce((max, segment) =>
      segment.bookings > max.bookings ? segment : max
    );
  } catch (error) {
    console.error('Error getting most popular segment:', error);
    return null;
  }
}

// ============================================================================
// FARE UTILITIES
// ============================================================================

/**
 * Validate fare is within acceptable range
 */
export function validateFare(
  fare: number,
  minFare: number = 0,
  maxFare: number = 10000
): boolean {
  return fare >= minFare && fare <= maxFare;
}

/**
 * Format fare for display
 */
export function formatFare(fare: number, currency: string = 'MVR'): string {
  return `${currency} ${fare.toFixed(2)}`;
}

/**
 * Calculate average fare for a trip
 */
export async function getAverageFareForTrip(tripId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('stop_fares')
      .select('fare')
      .eq('trip_id', tripId);

    if (error) throw error;
    if (!data || data.length === 0) return 0;

    const total = data.reduce((sum, fare) => sum + fare.fare, 0);
    return total / data.length;
  } catch (error) {
    console.error('Error calculating average fare:', error);
    return 0;
  }
}

/**
 * Get fare range for a trip (min and max)
 */
export async function getFareRange(
  tripId: string
): Promise<{ min: number; max: number }> {
  try {
    const { data, error } = await supabase
      .from('stop_fares')
      .select('fare')
      .eq('trip_id', tripId);

    if (error) throw error;
    if (!data || data.length === 0) return { min: 0, max: 0 };

    const fares = data.map(f => f.fare);
    return {
      min: Math.min(...fares),
      max: Math.max(...fares),
    };
  } catch (error) {
    console.error('Error getting fare range:', error);
    return { min: 0, max: 0 };
  }
}

// ============================================================================
// FARE MATRIX OPERATIONS
// ============================================================================

/**
 * Get complete fare matrix for a trip
 */
export async function getFareMatrix(
  tripId: string
): Promise<Map<string, number>> {
  try {
    const { data, error } = await supabase
      .from('stop_fares')
      .select('from_stop_id, to_stop_id, fare')
      .eq('trip_id', tripId);

    if (error) throw error;

    const fareMap = new Map<string, number>();
    data?.forEach(fare => {
      fareMap.set(`${fare.from_stop_id}-${fare.to_stop_id}`, fare.fare);
    });

    return fareMap;
  } catch (error) {
    console.error('Error getting fare matrix:', error);
    return new Map();
  }
}

/**
 * Export fare matrix as 2D array for display
 */
export async function exportFareMatrixAsArray(
  tripId: string,
  stops: TripStop[]
): Promise<number[][]> {
  try {
    const fareMap = await getFareMatrix(tripId);
    const sortedStops = [...stops].sort(
      (a, b) => a.stop_sequence - b.stop_sequence
    );

    const matrix: number[][] = [];

    for (let i = 0; i < sortedStops.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < sortedStops.length; j++) {
        if (i >= j) {
          matrix[i][j] = 0; // No fare for same stop or backwards
        } else {
          const key = `${sortedStops[i].id}-${sortedStops[j].id}`;
          matrix[i][j] = fareMap.get(key) || 0;
        }
      }
    }

    return matrix;
  } catch (error) {
    console.error('Error exporting fare matrix:', error);
    return [];
  }
}

// ============================================================================
// DISCOUNT CALCULATIONS
// ============================================================================

/**
 * Apply discount to all fares
 */
export async function applyDiscountToAllFares(
  tripId: string,
  discountPercent: number
): Promise<boolean> {
  try {
    const { data: fares, error: fetchError } = await supabase
      .from('stop_fares')
      .select('*')
      .eq('trip_id', tripId);

    if (fetchError) throw fetchError;

    const updatedFares = fares?.map(fare => ({
      ...fare,
      fare: fare.fare * (1 - discountPercent / 100),
    }));

    if (!updatedFares || updatedFares.length === 0) return false;

    const { error: updateError } = await supabase
      .from('stop_fares')
      .upsert(updatedFares, {
        onConflict: 'trip_id,from_stop_id,to_stop_id',
      });

    if (updateError) throw updateError;
    return true;
  } catch (error) {
    console.error('Error applying discount:', error);
    return false;
  }
}

/**
 * Calculate fare with agent discount
 */
export function applyAgentDiscount(
  fare: number,
  discountPercent: number
): number {
  return fare * (1 - discountPercent / 100);
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export // All functions are already exported above
 {};
