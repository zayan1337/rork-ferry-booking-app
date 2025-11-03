import type { Island, Route, Seat, Passenger, Booking } from './index';
import type { RouteStop } from './multiStopRoute';

export interface Vessel {
  id: string;
  name: string;
  seating_capacity: number;
  is_active: boolean;
}

export interface Trip {
  id: string;
  route_id: string;
  travel_date: string;
  departure_time: string;
  vessel_id: string;
  vessel_name: string;
  available_seats: number;
  is_active: boolean;
  base_fare?: number; // Kept for backwards compatibility
  fare_multiplier?: number;
  route?: {
    base_fare: number; // Nested route data for proper fare calculation
  };
}

// Trip with segment information for multi-stop bookings
export interface TripWithSegment extends Trip {
  boarding_stop_id: string;
  destination_stop_id: string;
  boarding_stop_sequence: number;
  destination_stop_sequence: number;
  boarding_island_name: string;
  destination_island_name: string;
  segment_fare: number;
  available_seats_for_segment: number;
  seating_capacity?: number;
  total_stops: number;
  route_name?: string;
}

export interface SeatReservation {
  id: string;
  trip_id: string;
  seat_id: string;
  booking_id?: string;
  is_available: boolean;
  is_reserved: boolean;
  reservation_expiry?: string;
}

export type TripType = 'one_way' | 'round_trip';

export interface BookingData {
  tripType: TripType;
  route: Route | null;
  trip: Trip | null;
  departureDate: string | null;
  returnDate: string | null;
  returnTrip: Trip | null;
  passengers: Passenger[];
  selectedSeats: Seat[];
  returnSelectedSeats: Seat[];
  totalFare: number;
}

export interface CurrentBooking extends BookingData {
  returnRoute: Route | null;
  // Multi-stop route segment information (island selection)
  boardingIslandId: string | null;
  boardingIslandName: string | null;
  destinationIslandId: string | null;
  destinationIslandName: string | null;
  returnBoardingIslandId: string | null;
  returnBoardingIslandName: string | null;
  returnDestinationIslandId: string | null;
  returnDestinationIslandName: string | null;
  // Stop information (determined after selecting trip)
  boardingStop: RouteStop | null;
  destinationStop: RouteStop | null;
  returnBoardingStop: RouteStop | null;
  returnDestinationStop: RouteStop | null;
  segmentFare: number | null;
  returnSegmentFare: number | null;
}

// Store interfaces
export interface BookingStoreState {
  currentBooking: CurrentBooking;
  currentStep: number;
  isLoading: boolean;
  error: string | null;
}

export interface RouteStoreState {
  routes: Route[];
  availableIslands: Island[];
  availableRoutes: Route[];
  isLoading: boolean;
  error: string | null;
}

export interface TripStoreState {
  trips: Trip[];
  returnTrips: Trip[];
  isLoading: boolean;
  error: string | null;
}

export interface SeatStoreState {
  availableSeats: Seat[];
  availableReturnSeats: Seat[];
  seats: Seat[];
  seatSubscriptions: Map<string, any>;
  isLoading: boolean;
  error: string | null;
}

export interface UserBookingsStoreState {
  bookings: Booking[];
  isLoading: boolean;
  error: string | null;
}

export interface TicketStoreState {
  isLoading: boolean;
  error: string | null;
}
