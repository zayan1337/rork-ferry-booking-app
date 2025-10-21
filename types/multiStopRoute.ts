/**
 * Multi-Stop Route Types
 *
 * Types for routes with multiple connected islands and segment-based fares
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export interface RouteStop {
  id: string;
  route_id: string;
  island_id: string;
  island_name?: string;
  island_zone?: string;
  stop_sequence: number;
  stop_type: 'pickup' | 'dropoff' | 'both';
  estimated_travel_time_from_previous: number | null; // minutes
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RouteSegmentFare {
  id: string;
  route_id: string;
  from_stop_id: string;
  to_stop_id: string;
  fare_amount: number;
  from_island_name?: string;
  to_island_name?: string;
  from_stop_sequence?: number;
  to_stop_sequence?: number;
  stops_between?: number;
  created_at: string;
  updated_at: string;
}

export interface TripFareOverride {
  id: string;
  trip_id: string;
  from_stop_id: string;
  to_stop_id: string;
  override_fare_amount: number;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface MultiStopRoute {
  id: string;
  name: string;
  is_multi_stop: boolean;
  total_stops: number;
  base_fare: number;
  status: 'active' | 'inactive';
  stops: RouteStop[];
  segment_fares: RouteSegmentFare[];
  created_at: string;
  updated_at: string;
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface RouteStopFormData {
  island_id: string;
  stop_sequence: number;
  stop_type: 'pickup' | 'dropoff' | 'both';
  estimated_travel_time_from_previous: number | null;
  notes: string;
}

export interface RouteSegmentFareFormData {
  from_stop_index: number;
  to_stop_index: number;
  fare_amount: number;
}

export interface MultiStopRouteFormData {
  name: string;
  status: 'active' | 'inactive';
  base_fare: number;
  stops: RouteStopFormData[];
  segment_fares: Map<string, number>; // key: "fromIndex-toIndex", value: fare
  description?: string;
}

export interface TripFareOverrideFormData {
  trip_id: string;
  from_stop_id: string;
  to_stop_id: string;
  override_fare_amount: number;
  reason: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface RouteSegment {
  from_stop: RouteStop;
  to_stop: RouteStop;
  fare: number;
  distance: number; // number of stops between
  is_custom_fare: boolean;
}

export interface AvailableRouteSegment {
  from_stop_id: string;
  to_stop_id: string;
  from_island_name: string;
  to_island_name: string;
  fare_amount: number;
  stops_count: number;
  estimated_duration: number | null; // minutes
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface RouteWithStopsResponse {
  route_id: string;
  name: string;
  is_multi_stop: boolean;
  total_stops: number;
  base_fare: number;
  status: string;
  created_at: string;
  stops: {
    id: string;
    island_id: string;
    island_name: string;
    island_zone: string;
    stop_sequence: number;
    stop_type: string;
    estimated_travel_time: number | null;
  }[];
}

export interface RouteSegmentFaresResponse {
  id: string;
  route_id: string;
  from_stop_id: string;
  to_stop_id: string;
  fare_amount: number;
  route_name: string;
  from_island_name: string;
  from_stop_sequence: number;
  to_island_name: string;
  to_stop_sequence: number;
  stops_between: number;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface FareMatrix {
  [key: string]: number; // key: "fromIndex-toIndex"
}

export interface StopOption {
  id: string;
  island_id: string;
  island_name: string;
  stop_sequence: number;
  stop_type: string;
}

// StopType is already defined in multiStopTrip.ts to avoid conflicts

export interface RouteStopValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// FARE CALCULATION TYPES
// ============================================================================

export interface FareCalculationOptions {
  use_base_fare: boolean;
  base_fare_per_stop: number;
  custom_fares?: Map<string, number>;
  apply_multiplier?: number;
}

export interface CalculatedSegmentFare {
  from_stop_index: number;
  to_stop_index: number;
  from_island_name: string;
  to_island_name: string;
  calculated_fare: number;
  base_fare: number;
  custom_fare: number | null;
  is_custom: boolean;
}

// ============================================================================
// TRIP INTEGRATION TYPES
// ============================================================================

export interface TripWithRouteStops {
  id: string;
  route_id: string;
  route_name: string;
  is_multi_stop_route: boolean;
  stops: RouteStop[];
  segment_fares: RouteSegmentFare[];
  fare_overrides: TripFareOverride[];
  travel_date: string;
  departure_time: string;
  status: string;
}

export interface BookingSegmentInfo {
  booking_id: string;
  from_stop_id: string;
  to_stop_id: string;
  from_island_name: string;
  to_island_name: string;
  fare_paid: number;
  is_overridden_fare: boolean;
}
