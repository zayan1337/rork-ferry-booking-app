/**
 * Multi-Stop Trip Type Definitions
 *
 * This file contains all TypeScript types for the multi-stop trip feature.
 * Multi-stop trips allow ferries to pick up and drop off passengers at
 * multiple islands along a route.
 */

import type { Trip, Booking } from './index';

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * Stop Type - defines what action can happen at a stop
 * - pickup: Only boarding allowed
 * - dropoff: Only disembarking allowed
 * - both: Both boarding and disembarking allowed
 */
export type StopType = 'pickup' | 'dropoff' | 'both';

/**
 * Stop Status - tracks the current state of a stop
 */
export type StopStatus = 'pending' | 'active' | 'completed' | 'skipped';

/**
 * Trip Stop - represents a single stop on a multi-stop trip
 */
export interface TripStop {
  id: string;
  trip_id: string;
  island_id: string;
  island_name: string;
  zone?: string;
  stop_sequence: number;
  stop_type: StopType;

  // Timing
  estimated_arrival_time?: string;
  estimated_departure_time?: string;
  actual_arrival_time?: string;
  actual_departure_time?: string;

  // Tracking
  boarding_count: number;
  dropoff_count: number;
  boarding_completed: boolean;
  boarding_completed_at?: string;
  boarding_completed_by?: string;

  // Status
  status: StopStatus;
  notes?: string;

  // Computed fields from view
  passengers_boarding?: number;
  passengers_dropping?: number;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Booking Stops - links a booking to its boarding and destination stops
 */
export interface BookingStops {
  id: string;
  booking_id: string;
  boarding_stop_id: string;
  destination_stop_id: string;
  fare_amount: number;
  created_at: string;

  // Related data (from joins)
  boarding_stop?: TripStop;
  destination_stop?: TripStop;
}

/**
 * Stop Fare - defines the fare between two stops
 */
export interface StopFare {
  id: string;
  trip_id: string;
  from_stop_id: string;
  to_stop_id: string;
  fare: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// EXTENDED TYPES
// ============================================================================

/**
 * Multi-Stop Trip - extends Trip with stop information
 */
export interface MultiStopTrip extends Trip {
  is_multi_stop: boolean;
  stops: TripStop[];
  current_stop_id?: string;
  current_stop_sequence: number;
  current_stop?: TripStop;

  // Computed fields
  total_stops?: number;
  completed_stops?: number;
}

/**
 * Multi-Stop Booking - extends Booking with stop information
 */
export interface MultiStopBooking extends Booking {
  booking_stops?: BookingStops;
  boarding_island_name?: string;
  boarding_stop_sequence?: number;
  destination_island_name?: string;
  destination_stop_sequence?: number;
  segment_fare?: number;
}

// ============================================================================
// UI/UX TYPES
// ============================================================================

/**
 * Stop Option - simplified stop info for UI selection
 */
export interface StopOption {
  stop_id: string;
  island_id: string;
  island_name: string;
  stop_sequence: number;
  stop_type: StopType;
  estimated_time?: string;
  zone?: string;
}

/**
 * Available Segment - represents a bookable segment between two stops
 */
export interface AvailableSegment {
  from_stop: StopOption;
  to_stop: StopOption;
  fare: number;
  available: boolean;
  distance?: number; // Number of stops between
  estimated_duration?: string;
}

/**
 * Segment Selection - tracks user's segment choice during booking
 */
export interface SegmentSelection {
  trip_id: string;
  boarding_stop: StopOption;
  destination_stop: StopOption;
  fare: number;
  passenger_count: number;
  total_fare: number;
}

// ============================================================================
// FORM TYPES
// ============================================================================

/**
 * Trip Stop Form Data - for creating/editing stops
 */
export interface TripStopFormData {
  island_id: string;
  stop_sequence: number;
  stop_type: StopType;
  estimated_arrival_time?: string;
  estimated_departure_time?: string;
  notes?: string;
}

/**
 * Multi-Stop Trip Form Data - for creating multi-stop trips
 */
export interface MultiStopTripFormData {
  vessel_id: string;
  travel_date: string;
  departure_time: string;
  arrival_time?: string;
  is_multi_stop: boolean;
  stops: TripStopFormData[];
  base_fare_per_stop: number;
  fare_multiplier?: number;
  captain_id?: string;
  notes?: string;
}

// ============================================================================
// STORE TYPES
// ============================================================================

/**
 * Multi-Stop Store State
 */
export interface MultiStopStoreState {
  // Trips
  multiStopTrips: MultiStopTrip[];
  selectedTrip: MultiStopTrip | null;

  // Stops
  tripStops: Map<string, TripStop[]>; // Map of trip_id to stops
  availableSegments: AvailableSegment[];

  // Selection
  selectedSegment: SegmentSelection | null;

  // Loading states
  isLoading: boolean;
  isLoadingStops: boolean;
  isLoadingSegments: boolean;

  // Errors
  error: string | null;
}

/**
 * Multi-Stop Store Actions
 */
export interface MultiStopStoreActions {
  // Fetch operations
  fetchMultiStopTrips: (date?: string) => Promise<void>;
  fetchTripStops: (tripId: string) => Promise<TripStop[]>;
  fetchAvailableSegments: (tripId: string) => Promise<AvailableSegment[]>;
  fetchStopFares: (tripId: string) => Promise<StopFare[]>;

  // Selection operations
  selectTrip: (trip: MultiStopTrip | null) => void;
  selectSegment: (segment: SegmentSelection | null) => void;

  // Captain operations
  completeBoarding: (stopId: string, captainId: string) => Promise<boolean>;
  moveToNextStop: (tripId: string) => Promise<boolean>;
  updateStopStatus: (stopId: string, status: StopStatus) => Promise<boolean>;

  // Admin operations
  createMultiStopTrip: (formData: MultiStopTripFormData) => Promise<string>;
  updateTripStop: (stopId: string, data: Partial<TripStop>) => Promise<boolean>;
  deleteTripStop: (stopId: string) => Promise<boolean>;
  reorderStops: (tripId: string, stopIds: string[]) => Promise<boolean>;
  generateStopFares: (tripId: string, baseFare: number) => Promise<boolean>;

  // Utility
  clearError: () => void;
  reset: () => void;
}

/**
 * Complete Multi-Stop Store Type
 */
export type MultiStopStore = MultiStopStoreState & MultiStopStoreActions;

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Stop Validation Result
 */
export interface StopValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Segment Validation Result
 */
export interface SegmentValidationResult {
  isValid: boolean;
  isAvailable: boolean;
  availableSeats: number;
  errors: string[];
  warnings?: string[];
}

// ============================================================================
// CAPTAIN TYPES
// ============================================================================

/**
 * Stop Passenger Info - for captain's view of passengers at a stop
 */
export interface StopPassengerInfo {
  stop_id: string;
  stop_name: string;
  stop_sequence: number;
  action: 'boarding' | 'dropoff';
  passengers: Array<{
    id: string;
    booking_id: string;
    booking_number: string;
    passenger_name: string;
    seat_number: string;
    check_in_status: boolean;
    special_assistance?: string;
  }>;
  total_count: number;
  checked_in_count: number;
}

/**
 * Captain Trip Progress - tracks progress through stops
 */
export interface CaptainTripProgress {
  trip_id: string;
  total_stops: number;
  current_stop_sequence: number;
  current_stop: TripStop;
  completed_stops: number;
  remaining_stops: number;
  stops_detail: TripStop[];
  can_proceed_to_next: boolean;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

/**
 * Stop Statistics - analytics for a single stop
 */
export interface StopStatistics {
  stop_id: string;
  island_name: string;
  total_boardings: number;
  total_dropoffs: number;
  avg_boarding_time_minutes: number;
  no_show_count: number;
  utilization_rate: number;
}

/**
 * Multi-Stop Trip Statistics
 */
export interface MultiStopTripStatistics {
  trip_id: string;
  total_segments_booked: number;
  revenue_by_segment: Array<{
    from_stop: string;
    to_stop: string;
    bookings: number;
    revenue: number;
  }>;
  most_popular_segment: {
    from_stop: string;
    to_stop: string;
    bookings: number;
  };
  avg_passengers_per_segment: number;
  total_revenue: number;
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export type {
  // Re-export for convenience
  Trip,
  Booking,
};


