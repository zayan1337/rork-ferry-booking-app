import type { Island, Route, Seat, Passenger, Booking } from './index';

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
