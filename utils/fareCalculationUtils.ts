/**
 * Fare Calculation Utilities
 *
 * Helper functions for calculating fares in multi-stop route system.
 * Handles segment-based fares, route defaults, and trip-specific overrides.
 */

import { supabase } from './supabase';
import type {
  RouteSegmentFare,
  TripFareOverride,
} from '@/types/multiStopRoute';

// ============================================================================
// TYPES
// ============================================================================

export interface FareCalculationResult {
  baseFare: number;
  overrideFare: number | null;
  tripMultiplier: number;
  finalFare: number;
  isOverridden: boolean;
}

export interface SegmentFareInfo {
  fromStopId: string;
  toStopId: string;
  fromIslandName?: string;
  toIslandName?: string;
  fromSequence: number;
  toSequence: number;
  baseFare: number;
  overrideFare: number | null;
  finalFare: number;
  segmentCount: number;
}

// ============================================================================
// CORE FARE CALCULATION
// ============================================================================

/**
 * Get effective fare for a segment, considering trip overrides
 * Uses database function that handles route fares + trip overrides + multipliers
 */
export async function getEffectiveFare(
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

    if (error) {
      console.error('Error getting effective fare:', error);
      throw error;
    }

    return data || 0;
  } catch (error) {
    console.error('Failed to get effective fare:', error);
    throw error;
  }
}

/**
 * Get detailed fare calculation breakdown
 */
export async function getFareBreakdown(
  tripId: string,
  fromStopId: string,
  toStopId: string
): Promise<FareCalculationResult> {
  try {
    // Get trip details
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('route_id, fare_multiplier')
      .eq('id', tripId)
      .single();

    if (tripError) throw tripError;

    // Get base fare from route_segment_fares
    const { data: segmentFare, error: fareError } = await supabase
      .from('route_segment_fares')
      .select('fare_amount')
      .eq('route_id', trip.route_id)
      .eq('from_stop_id', fromStopId)
      .eq('to_stop_id', toStopId)
      .single();

    if (fareError) throw fareError;

    // Check for trip override
    const { data: override } = await supabase
      .from('trip_fare_overrides')
      .select('override_fare_amount')
      .eq('trip_id', tripId)
      .eq('from_stop_id', fromStopId)
      .eq('to_stop_id', toStopId)
      .single();

    const baseFare = segmentFare.fare_amount;
    const overrideFare = override?.override_fare_amount || null;
    const tripMultiplier = trip.fare_multiplier || 1.0;
    const effectiveFare = overrideFare || baseFare;
    const finalFare = effectiveFare * tripMultiplier;

    return {
      baseFare,
      overrideFare,
      tripMultiplier,
      finalFare,
      isOverridden: overrideFare !== null,
    };
  } catch (error) {
    console.error('Failed to get fare breakdown:', error);
    throw error;
  }
}

// ============================================================================
// ROUTE SEGMENT FARES
// ============================================================================

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

    if (error) {
      console.error('Error getting route segment fares:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get route segment fares:', error);
    return [];
  }
}

/**
 * Get fare for a specific route segment
 */
export async function getRouteSegmentFare(
  routeId: string,
  fromStopId: string,
  toStopId: string
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('route_segment_fares')
      .select('fare_amount')
      .eq('route_id', routeId)
      .eq('from_stop_id', fromStopId)
      .eq('to_stop_id', toStopId)
      .single();

    if (error) {
      console.error('Error getting route segment fare:', error);
      throw error;
    }

    return data?.fare_amount || 0;
  } catch (error) {
    console.error('Failed to get route segment fare:', error);
    return 0;
  }
}

/**
 * Update segment fare for a route
 */
export async function updateRouteSegmentFare(
  fareId: string,
  newFareAmount: number
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('route_segment_fares')
      .update({ fare_amount: newFareAmount })
      .eq('id', fareId);

    if (error) {
      console.error('Error updating route segment fare:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to update route segment fare:', error);
    return false;
  }
}

// ============================================================================
// TRIP FARE OVERRIDES
// ============================================================================

/**
 * Get all fare overrides for a trip
 */
export async function getTripFareOverrides(
  tripId: string
): Promise<TripFareOverride[]> {
  try {
    const { data, error } = await supabase
      .from('trip_fare_overrides')
      .select('*')
      .eq('trip_id', tripId);

    if (error) {
      console.error('Error getting trip fare overrides:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get trip fare overrides:', error);
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
  overrideFareAmount: number,
  reason: string
): Promise<TripFareOverride | null> {
  try {
    const { data, error } = await supabase
      .from('trip_fare_overrides')
      .upsert(
        {
          trip_id: tripId,
          from_stop_id: fromStopId,
          to_stop_id: toStopId,
          override_fare_amount: overrideFareAmount,
          reason,
        },
        {
          onConflict: 'trip_id,from_stop_id,to_stop_id',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error setting trip fare override:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to set trip fare override:', error);
    return null;
  }
}

/**
 * Delete trip fare override
 */
export async function deleteTripFareOverride(
  overrideId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('trip_fare_overrides')
      .delete()
      .eq('id', overrideId);

    if (error) {
      console.error('Error deleting trip fare override:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete trip fare override:', error);
    return false;
  }
}

/**
 * Delete all fare overrides for a trip
 */
export async function clearTripFareOverrides(tripId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('trip_fare_overrides')
      .delete()
      .eq('trip_id', tripId);

    if (error) {
      console.error('Error clearing trip fare overrides:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to clear trip fare overrides:', error);
    return false;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate total fare for multiple segments
 * Useful for bookings that span multiple segments
 */
export async function calculateMultiSegmentFare(
  tripId: string,
  segments: { fromStopId: string; toStopId: string }[]
): Promise<number> {
  let totalFare = 0;

  for (const segment of segments) {
    const fare = await getEffectiveFare(
      tripId,
      segment.fromStopId,
      segment.toStopId
    );
    totalFare += fare;
  }

  return totalFare;
}

/**
 * Get all bookable segments with fares for a trip
 */
export async function getBookableSegmentsWithFares(
  tripId: string
): Promise<SegmentFareInfo[]> {
  try {
    // Get trip and route info
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('route_id, fare_multiplier')
      .eq('id', tripId)
      .single();

    if (tripError) throw tripError;

    // Get route segment fares
    const { data: segmentFares, error: faresError } = await supabase
      .from('route_segment_fares_view')
      .select('*')
      .eq('route_id', trip.route_id);

    if (faresError) throw faresError;

    // Get trip overrides
    const overrides = await getTripFareOverrides(tripId);
    const overrideMap = new Map(
      overrides.map(o => [`${o.from_stop_id}-${o.to_stop_id}`, o])
    );

    // Build result with effective fares
    const tripMultiplier = trip.fare_multiplier || 1.0;
    const result: SegmentFareInfo[] = segmentFares.map(fare => {
      const overrideKey = `${fare.from_stop_id}-${fare.to_stop_id}`;
      const override = overrideMap.get(overrideKey);
      const effectiveFare = override?.override_fare_amount || fare.fare_amount;
      const finalFare = effectiveFare * tripMultiplier;

      return {
        fromStopId: fare.from_stop_id,
        toStopId: fare.to_stop_id,
        fromIslandName: fare.from_island_name,
        toIslandName: fare.to_island_name,
        fromSequence: fare.from_stop_sequence || 0,
        toSequence: fare.to_stop_sequence || 0,
        baseFare: fare.fare_amount,
        overrideFare: override?.override_fare_amount || null,
        finalFare,
        segmentCount:
          (fare.to_stop_sequence || 0) - (fare.from_stop_sequence || 0),
      };
    });

    return result;
  } catch (error) {
    console.error('Failed to get bookable segments with fares:', error);
    return [];
  }
}

/**
 * Auto-generate segment fares for a route based on base fare
 * Uses database function to create all combinations
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

    if (error) {
      console.error('Error auto-generating segment fares:', error);
      throw error;
    }

    return data || 0; // Returns count of fares generated
  } catch (error) {
    console.error('Failed to auto-generate segment fares:', error);
    throw error;
  }
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate that a fare amount is reasonable
 */
export function validateFareAmount(
  fareAmount: number,
  options?: {
    minFare?: number;
    maxFare?: number;
    baseFare?: number;
    maxMultiplier?: number;
  }
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const minFare = options?.minFare || 0;
  const maxFare = options?.maxFare || 10000;

  if (fareAmount < minFare) {
    errors.push(`Fare must be at least ${minFare}`);
  }

  if (fareAmount > maxFare) {
    errors.push(`Fare cannot exceed ${maxFare}`);
  }

  if (options?.baseFare && options?.maxMultiplier) {
    const maxAllowedFare = options.baseFare * options.maxMultiplier;
    if (fareAmount > maxAllowedFare) {
      errors.push(
        `Fare exceeds maximum allowed (${maxAllowedFare}) based on ${options.maxMultiplier}x multiplier`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Compare fare against route base fare
 */
export function compareFareToBase(
  fareAmount: number,
  baseFare: number
): {
  difference: number;
  percentChange: number;
  isIncrease: boolean;
} {
  const difference = fareAmount - baseFare;
  const percentChange = (difference / baseFare) * 100;

  return {
    difference,
    percentChange,
    isIncrease: difference > 0,
  };
}

// ============================================================================
// STATISTICS FUNCTIONS
// ============================================================================

/**
 * Get fare statistics for a route
 */
export async function getRouteFareStatistics(routeId: string): Promise<{
  minFare: number;
  maxFare: number;
  avgFare: number;
  totalSegments: number;
}> {
  try {
    const fares = await getRouteSegmentFares(routeId);

    if (fares.length === 0) {
      return { minFare: 0, maxFare: 0, avgFare: 0, totalSegments: 0 };
    }

    const fareAmounts = fares.map(f => f.fare_amount);
    const minFare = Math.min(...fareAmounts);
    const maxFare = Math.max(...fareAmounts);
    const avgFare = fareAmounts.reduce((a, b) => a + b, 0) / fareAmounts.length;

    return {
      minFare,
      maxFare,
      avgFare,
      totalSegments: fares.length,
    };
  } catch (error) {
    console.error('Failed to get route fare statistics:', error);
    return { minFare: 0, maxFare: 0, avgFare: 0, totalSegments: 0 };
  }
}

/**
 * Get fare override statistics for a trip
 */
export async function getTripFareOverrideStatistics(tripId: string): Promise<{
  totalOverrides: number;
  increasedFares: number;
  decreasedFares: number;
  avgPercentChange: number;
}> {
  try {
    const overrides = await getTripFareOverrides(tripId);

    if (overrides.length === 0) {
      return {
        totalOverrides: 0,
        increasedFares: 0,
        decreasedFares: 0,
        avgPercentChange: 0,
      };
    }

    // Get corresponding base fares
    const { data: trip } = await supabase
      .from('trips')
      .select('route_id')
      .eq('id', tripId)
      .single();

    if (!trip) throw new Error('Trip not found');

    let increasedFares = 0;
    let decreasedFares = 0;
    let totalPercentChange = 0;

    for (const override of overrides) {
      const baseFare = await getRouteSegmentFare(
        trip.route_id,
        override.from_stop_id,
        override.to_stop_id
      );

      const comparison = compareFareToBase(
        override.override_fare_amount,
        baseFare
      );

      if (comparison.isIncrease) {
        increasedFares++;
      } else {
        decreasedFares++;
      }

      totalPercentChange += comparison.percentChange;
    }

    return {
      totalOverrides: overrides.length,
      increasedFares,
      decreasedFares,
      avgPercentChange: totalPercentChange / overrides.length,
    };
  } catch (error) {
    console.error('Failed to get trip fare override statistics:', error);
    return {
      totalOverrides: 0,
      increasedFares: 0,
      decreasedFares: 0,
      avgPercentChange: 0,
    };
  }
}
