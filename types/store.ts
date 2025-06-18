import type { Island, Route, Seat, Passenger, Booking } from './index';
import type { Trip, BookingData } from './booking';

export interface BookingState {
    bookingData: BookingData;
    routes: Route[];
    trips: Trip[];
    returnTrips: Trip[];
    availableSeats: Seat[];
    availableReturnSeats: Seat[];
    seats: Seat[];
    isLoading: boolean;
    error: string | null;
    currentStep: number;
    bookings: Booking[];
    currentBooking: BookingData;
    availableIslands: Island[];
    availableRoutes: Route[];

    // Actions
    setTripType: (tripType: 'one_way' | 'round_trip') => void;
    setDepartureDate: (date: string) => void;
    setReturnDate: (date: string) => void;
    setRoute: (route: Route) => void;
    setReturnRoute: (route: Route) => void;
    toggleSeatSelection: (seat: Seat, isReturn?: boolean) => void;
    updatePassengers: (passengers: Passenger[]) => void;
    fetchAvailableIslands: () => Promise<void>;
    fetchAvailableRoutes: () => Promise<void>;
    fetchRoutes: () => Promise<void>;
    fetchTrips: (routeId: string, date: string, isReturn?: boolean) => Promise<void>;
    fetchAvailableSeats: (tripId: string, isReturn?: boolean) => Promise<void>;
    confirmBooking: (paymentMethod: string) => Promise<any>;
    setError: (error: string | null) => void;
    setLoading: (isLoading: boolean) => void;
    resetBooking: () => void;
    calculateTotalFare: () => void;
    setTrip: (trip: Trip | null) => void;
    setReturnTrip: (trip: Trip | null) => void;
    setPassengers: (passengers: Passenger[]) => void;
    setCurrentStep: (currentStep: number) => void;
    fetchSeats: (vesselId: string) => Promise<void>;
    fetchUserBookings: () => Promise<void>;
} 