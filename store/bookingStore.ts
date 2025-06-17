import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import type {
  Island,
  Route,
  Seat,
  Passenger,
  Booking,
  PaymentMethod,
  PaymentStatus,
  BookingStatus
} from '@/types';
import type { DBBooking, DBPassenger, DBTrip } from '@/types/database';
import type { BookingData } from '@/types/store';

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

const initialBookingData: BookingData = {
  tripType: 'one_way',
  route: null,
  trip: null,
  departureDate: null,
  returnDate: null,
  returnTrip: null,
  passengers: [],
  selectedSeats: [],
  returnSelectedSeats: [],
  totalFare: 0,
};

// Helper functions for data conversion
const convertDBPassengerToPassenger = (dbPassenger: DBPassenger): Passenger => ({
  id: dbPassenger.id,
  fullName: dbPassenger.passenger_name,
  idNumber: dbPassenger.passenger_contact_number,
  specialAssistance: dbPassenger.special_assistance_request,
});

const convertPassengerToDBPassenger = (passenger: Passenger): Omit<DBPassenger, 'id'> => ({
  passenger_name: passenger.fullName,
  passenger_contact_number: passenger.idNumber || '',
  special_assistance_request: passenger.specialAssistance || '',
});

export interface CurrentBooking extends BookingData {
  returnRoute: Route | null;
}

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
  currentBooking: BookingData & { returnRoute: Route | null };
  availableIslands: Island[];
  availableRoutes: Route[];
  seatSubscriptions: Map<string, any>; // Store active subscriptions

  setTripType: (tripType: 'one_way' | 'round_trip') => void;
  setDepartureDate: (date: string) => void;
  setReturnDate: (date: string) => void;
  setRoute: (route: Route) => void;
  setReturnRoute: (route: Route) => void;
  toggleSeatSelection: (seat: Seat, isReturn?: boolean) => Promise<void>;
  updatePassengers: (passengers: Passenger[]) => void;
  setTrip: (trip: Trip | null) => void;
  setReturnTrip: (trip: Trip | null) => void;
  setPassengers: (passengers: Passenger[]) => void;
  calculateTotalFare: () => void;
  setCurrentStep: (currentStep: number) => void;
  fetchRoutes: () => Promise<void>;
  fetchTrips: (routeId: string, date: string, isReturn?: boolean) => Promise<void>;
  fetchAvailableSeats: (tripId: string, isReturn?: boolean) => Promise<void>;
  refreshAvailableSeatsSilently: (tripId: string, isReturn?: boolean) => Promise<void>;
  fetchAvailableIslands: () => Promise<void>;
  fetchAvailableRoutes: () => Promise<void>;
  fetchSeats: (vesselId: string) => Promise<void>;
  confirmBooking: (paymentMethod: string) => Promise<any>;
  resetBooking: () => void;
  setError: (error: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  fetchUserBookings: () => Promise<void>;
  resetCurrentBooking: () => void;
  cancelBooking: (bookingId: string, reason: string, bankDetails: { accountNumber: string; accountName: string; bankName: string }) => Promise<void>;
  modifyBooking: (bookingId: string, { newDepartureDate, newReturnDate, selectedSeats, returnSelectedSeats, modificationReason, fareDifference }: any) => Promise<void>;
  validateTicket: (bookingNumber: string) => Promise<{ isValid: boolean; booking: Booking | null; message: string }>;
  setQuickBookingData: (route: Route, departureDate: string) => void;
  ensureSeatReservations: (tripId: string) => Promise<void>;
  initializeAllSeatReservations: () => Promise<void>;
  subscribeSeatUpdates: (tripId: string, isReturn?: boolean) => void;
  unsubscribeSeatUpdates: (tripId: string) => void;
  cleanupAllSeatSubscriptions: () => void;
  createSeatReservationsForTrip: (tripId: string) => Promise<void>;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  // State
  bookingData: { ...initialBookingData },
  routes: [],
  trips: [],
  returnTrips: [],
  availableSeats: [],
  availableReturnSeats: [],
  isLoading: false,
  error: null,
  currentStep: 0,
  bookings: [],
  currentBooking: {
    tripType: 'one_way',
    route: null,
    returnRoute: null,
    departureDate: null,
    returnDate: null,
    trip: null,
    returnTrip: null,
    passengers: [],
    selectedSeats: [],
    returnSelectedSeats: [],
    totalFare: 0,
  },
  availableIslands: [],
  availableRoutes: [],
  seats: [],
  seatSubscriptions: new Map(),

  // Actions
  resetCurrentBooking: () => {
    set((state) => ({
      currentBooking: {
        tripType: 'one_way',
        route: null,
        returnRoute: null,
        departureDate: null,
        returnDate: null,
        trip: null,
        returnTrip: null,
        passengers: [],
        selectedSeats: [],
        returnSelectedSeats: [],
        totalFare: 0,
      }
    }));
  },

  setQuickBookingData: (route: Route, departureDate: string) => {
    set((state) => ({
      currentBooking: {
        tripType: 'one_way',
        route,
        returnRoute: null,
        departureDate,
        returnDate: null,
        trip: null,
        returnTrip: null,
        passengers: [],
        selectedSeats: [],
        returnSelectedSeats: [],
        totalFare: 0,
      }
    }));
  },

  setTripType: (tripType: 'one_way' | 'round_trip') => {
    set((state) => ({
      currentBooking: {
        ...state.currentBooking,
        tripType,
        returnDate: tripType === 'one_way' ? null : state.currentBooking.returnDate,
        returnTrip: tripType === 'one_way' ? null : state.currentBooking.returnTrip,
        returnSelectedSeats: tripType === 'one_way' ? [] : state.currentBooking.returnSelectedSeats,
      }
    }));
  },

  setDepartureDate: (date: string) => {
    set((state) => ({
      currentBooking: {
        ...state.currentBooking,
        departureDate: date
      }
    }));
  },

  setReturnDate: (date: string) => {
    set((state) => ({
      currentBooking: {
        ...state.currentBooking,
        returnDate: date
      }
    }));
  },

  setRoute: (route: Route) => {
    set((state) => ({
      currentBooking: {
        ...state.currentBooking,
        route
      }
    }));
  },

  setReturnRoute: (route: Route) => {
    set((state) => ({
      currentBooking: {
        ...state.currentBooking,
        returnRoute: route
      }
    }));
  },

  toggleSeatSelection: async (seat: Seat, isReturn: boolean = false): Promise<void> => {
    const { currentBooking } = get();
    const tripId = isReturn ? currentBooking.returnTrip?.id : currentBooking.trip?.id;

    if (!tripId) {
      console.error('No trip selected for seat selection');
      return;
    }

    // First check if the seat is still available in real-time
    const { data: seatReservation, error } = await supabase
      .from('seat_reservations')
      .select('is_available, booking_id, is_reserved, reservation_expiry')
      .eq('trip_id', tripId)
      .eq('seat_id', seat.id)
      .single();

    if (error) {
      console.error('Error checking seat availability:', error);
      // Refresh seat availability to show current state
      get().fetchAvailableSeats(tripId, isReturn);
      return;
    }

    // Check if seat is still available
    let isCurrentlyAvailable = seatReservation.is_available && !seatReservation.booking_id;

    // If temporarily reserved, check if reservation has expired
    if (seatReservation.is_reserved && seatReservation.reservation_expiry) {
      const expiryTime = new Date(seatReservation.reservation_expiry);
      const currentTime = new Date();
      if (currentTime <= expiryTime) {
        isCurrentlyAvailable = false; // Still reserved
      }
    }

    if (!isCurrentlyAvailable) {
      // Refresh seat availability to show current state
      get().fetchAvailableSeats(tripId, isReturn);
      return;
    }

    set((state) => {
      const selectedSeatsKey = isReturn ? 'returnSelectedSeats' : 'selectedSeats';
      const currentSeats = state.currentBooking[selectedSeatsKey];
      const isSeatSelected = currentSeats.find(s => s.id === seat.id);

      const updatedSeats = isSeatSelected
        ? currentSeats.filter(s => s.id !== seat.id)
        : [...currentSeats, seat];

      // Update passengers array to match selected seats
      const updatedPassengers = updatedSeats.map((_, index) => {
        const existingPassenger = state.currentBooking.passengers[index];
        return existingPassenger || {
          fullName: '',
          idNumber: '',
          specialAssistance: ''
        };
      });

      const updatedBooking: BookingData & { returnRoute: Route | null } = {
        ...state.currentBooking,
        [selectedSeatsKey]: updatedSeats,
        passengers: updatedPassengers
      };

      // Calculate new total fare
      const baseFare = updatedBooking.route?.baseFare || 0;
      const returnBaseFare = updatedBooking.returnRoute?.baseFare || 0;
      const totalFare = (updatedBooking.selectedSeats.length * baseFare) +
        (updatedBooking.returnSelectedSeats.length * returnBaseFare);

      return {
        currentBooking: {
          ...updatedBooking,
          totalFare
        }
      };
    });
  },

  updatePassengers: (passengers: Passenger[]) => {
    set((state) => ({
      currentBooking: {
        ...state.currentBooking,
        passengers
      }
    }));
  },

  // Trip selection
  setTrip: (trip: Trip | null) => {
    set((state) => ({
      currentBooking: {
        ...state.currentBooking,
        trip
      }
    }));
  },

  setReturnTrip: (trip: Trip | null) => {
    set((state) => ({
      currentBooking: {
        ...state.currentBooking,
        returnTrip: trip
      }
    }));
  },

  // Passenger management
  setPassengers: (passengers: Passenger[]) => {
    set((state) => ({
      bookingData: { ...state.bookingData, passengers },
    }));
    get().calculateTotalFare();
  },

  // Fare calculation
  calculateTotalFare: () => {
    const { bookingData } = get();
    if (!bookingData.route || bookingData.passengers.length === 0) {
      set((state) => ({
        bookingData: { ...state.bookingData, totalFare: 0 },
      }));
      return;
    }

    let totalFare = bookingData.passengers.length * bookingData.route.baseFare;

    // Add return trip fare if applicable
    if (bookingData.tripType === 'round_trip' && bookingData.returnTrip && bookingData.returnSelectedSeats.length > 0) {
      totalFare += bookingData.returnSelectedSeats.length * bookingData.route.baseFare;
    }

    set((state) => ({
      bookingData: { ...state.bookingData, totalFare },
    }));
  },

  // Step management
  setCurrentStep: (currentStep: number) => {
    set({ currentStep });
  },

  // Data fetching
  fetchRoutes: async () => {
    const { setError, setLoading } = get();
    setLoading(true);
    setError(null);

    try {
      const { data: routesData, error: routesError } = await supabase
        .from('routes')
        .select(`
          id,
          base_fare,
          duration,
          is_active,
          from_island:from_island_id(
            id,
            name,
            zone
          ),
          to_island:to_island_id(
            id,
            name,
            zone
          )
        `)
        .eq('is_active', true);

      if (routesError) throw routesError;

      const formattedRoutes: Route[] = routesData.map((route: any) => ({
        id: route.id,
        fromIsland: {
          id: route.from_island.id,
          name: route.from_island.name,
          zone: route.from_island.zone,
        },
        toIsland: {
          id: route.to_island.id,
          name: route.to_island.name,
          zone: route.to_island.zone,
        },
        baseFare: route.base_fare,
        duration: route.duration,
      }));

      set({ routes: formattedRoutes });
    } catch (error) {
      console.error('Error fetching routes:', error);
      setError('Failed to fetch routes');
    } finally {
      setLoading(false);
    }
  },

  fetchTrips: async (routeId: string, date: string, isReturn = false) => {
    const { setError, setLoading } = get();
    setLoading(true);
    setError(null);

    try {
      const { data: trips, error } = await supabase
        .from('trips')
        .select(`
          id,
          route_id,
          travel_date,
          departure_time,
          available_seats,
          vessel:vessel_id(
            id,
            name,
            seating_capacity
          )
        `)
        .eq('route_id', routeId)
        .eq('travel_date', date)
        .eq('is_active', true)
        .order('departure_time');

      if (error) throw error;

      // Filter trips that might have actual seat availability
      const formattedTrips = trips.map((trip: any) => ({
        id: trip.id,
        route_id: trip.route_id,
        travel_date: trip.travel_date,
        departure_time: trip.departure_time,
        available_seats: trip.available_seats,
        vessel_id: trip.vessel.id,
        vessel_name: trip.vessel.name
      }));

      // Show all active trips, seat availability will be checked when seats are fetched
      set(state => ({
        currentBooking: {
          ...state.currentBooking,
          [isReturn ? 'returnTrip' : 'trip']: null // Reset selected trip
        },
        [isReturn ? 'returnTrips' : 'trips']: formattedTrips
      }));
    } catch (error) {
      console.error('Error fetching trips:', error);
      setError('Failed to fetch trips');
    } finally {
      setLoading(false);
    }
  },

  fetchAvailableSeats: async (tripId: string, isReturn = false) => {
    const { setError, setLoading } = get();
    setLoading(true);
    setError(null);

    try {
      await get().refreshAvailableSeatsSilently(tripId, isReturn);
    } catch (error: any) {
      console.error('Error fetching available seats:', error);
      setError('Failed to fetch seats. Please try again.');
    } finally {
      setLoading(false);
    }
  },

  // New function to refresh seats without loading state - used for real-time updates and periodic refresh
  refreshAvailableSeatsSilently: async (tripId: string, isReturn = false) => {
    try {
      // First, get the trip details to find the vessel
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('vessel_id')
        .eq('id', tripId)
        .single();

      if (tripError) throw tripError;

      // Get all seats for this vessel
      const { data: allVesselSeats, error: seatsError } = await supabase
        .from('seats')
        .select('*')
        .eq('vessel_id', tripData.vessel_id)
        .order('row_number', { ascending: true })
        .order('seat_number', { ascending: true });

      if (seatsError) throw seatsError;

      if (!allVesselSeats || allVesselSeats.length === 0) {
        console.warn(`No seats found for vessel ${tripData.vessel_id}`);
        set(state => ({
          [isReturn ? 'availableReturnSeats' : 'availableSeats']: []
        }));
        return;
      }

      // Ensure seat reservations exist for this trip
      await get().createSeatReservationsForTrip(tripId);

      // Get seat reservations with seat details for this trip
      let { data: seatReservations, error } = await supabase
        .from('seat_reservations')
        .select(`
          id,
          trip_id,
          seat_id,
          is_available,
          is_reserved,
          booking_id,
          reservation_expiry,
          seat:seat_id(
            id,
            vessel_id,
            seat_number,
            row_number,
            is_window,
            is_aisle
          )
        `)
        .eq('trip_id', tripId)
        .order('seat(row_number)', { ascending: true })
        .order('seat(seat_number)', { ascending: true });

      if (error) throw error;

      // If still no seat reservations, create a fallback using all vessel seats
      if (!seatReservations || seatReservations.length === 0) {
        console.warn(`No seat reservations found for trip ${tripId}, using vessel seats as fallback`);

        const fallbackSeats: Seat[] = allVesselSeats.map(seat => ({
          id: seat.id,
          number: seat.seat_number,
          rowNumber: seat.row_number,
          isWindow: seat.is_window,
          isAisle: seat.is_aisle,
          isAvailable: true, // Default to available since no reservations exist
          isSelected: false
        }));

        set(state => ({
          [isReturn ? 'availableReturnSeats' : 'availableSeats']: fallbackSeats
        }));
        return;
      }

      // Create a map of seat reservations for quick lookup
      const reservationMap = new Map();
      seatReservations.forEach(reservation => {
        if (reservation.seat && typeof reservation.seat === 'object' && 'id' in reservation.seat) {
          reservationMap.set((reservation.seat as any).id, reservation);
        }
      });

      // Process all vessel seats and match with reservations
      const allSeats: Seat[] = allVesselSeats.map(vesselSeat => {
        const reservation = reservationMap.get(vesselSeat.id);

        let isAvailable = true; // Default to available

        if (reservation) {
          // A seat is available if:
          // 1. is_available is true
          // 2. booking_id is null (not booked)
          // 3. If temporarily reserved, check if reservation has expired
          isAvailable = reservation.is_available && !reservation.booking_id;

          // Handle temporary reservations
          if (reservation.is_reserved && reservation.reservation_expiry) {
            const expiryTime = new Date(reservation.reservation_expiry);
            const currentTime = new Date();

            if (currentTime > expiryTime) {
              // Reservation has expired, seat becomes available if no booking_id
              isAvailable = reservation.is_available && !reservation.booking_id;

              // Clean up expired reservation
              supabase
                .from('seat_reservations')
                .update({
                  is_reserved: false,
                  reservation_expiry: null
                })
                .eq('id', reservation.id)
                .then(({ error }) => {
                  if (error) console.error('Error cleaning up expired reservation:', error);
                });
            } else {
              // Reservation is still active, seat is not available
              isAvailable = false;
            }
          }
        }

        const seat: Seat = {
          id: vesselSeat.id,
          number: vesselSeat.seat_number,
          rowNumber: vesselSeat.row_number,
          isWindow: vesselSeat.is_window,
          isAisle: vesselSeat.is_aisle,
          isAvailable: isAvailable,
          isSelected: false
        };

        return seat;
      });

      // Update state with all seats
      set(state => ({
        [isReturn ? 'availableReturnSeats' : 'availableSeats']: allSeats
      }));

    } catch (error: any) {
      console.error('Error refreshing available seats silently:', error);
      // Don't set global error state for silent refresh
    }
  },

  fetchAvailableIslands: async () => {
    const { setError, setLoading } = get();
    setLoading(true);
    setError(null);

    try {
      const { data: islands, error } = await supabase
        .from('islands')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      set({ availableIslands: islands });
    } catch (error) {
      console.error('Error fetching islands:', error);
      setError('Failed to fetch islands');
    } finally {
      setLoading(false);
    }
  },

  fetchAvailableRoutes: async () => {
    const { setError, setLoading } = get();
    setLoading(true);
    setError(null);

    try {
      const { data: routes, error } = await supabase
        .from('routes')
        .select(`
          id,
          base_fare,
          is_active,
          from_island:from_island_id(
            id,
            name,
            zone
          ),
          to_island:to_island_id(
            id,
            name,
            zone
          )
        `)
        .eq('is_active', true);

      if (error) throw error;

      const formattedRoutes = routes.map((route: any) => ({
        id: route.id,
        fromIsland: {
          id: route.from_island.id,
          name: route.from_island.name,
          zone: route.from_island.zone,
        },
        toIsland: {
          id: route.to_island.id,
          name: route.to_island.name,
          zone: route.to_island.zone,
        },
        baseFare: route.base_fare,
        // Since duration is not in the DB, we'll calculate an estimated duration
        // This should be replaced with actual duration logic based on your requirements
        duration: '2h' // Default duration
      }));

      set({ availableRoutes: formattedRoutes });
    } catch (error) {
      console.error('Error fetching routes:', error);
      setError('Failed to fetch routes');
    } finally {
      setLoading(false);
    }
  },

  confirmBooking: async (paymentMethod: string) => {
    const { currentBooking, setError, setLoading } = get();
    setLoading(true);
    setError(null);

    let bookingId: string | null = null;
    let returnBookingId: string | null = null;

    try {
      // Validate required data
      if (!currentBooking.trip?.id) {
        throw new Error('No trip selected');
      }

      if (!currentBooking.selectedSeats.length) {
        throw new Error('No seats selected');
      }

      if (currentBooking.tripType === 'round_trip' && (!currentBooking.returnTrip?.id || !currentBooking.returnSelectedSeats.length)) {
        throw new Error('Round trip selected but return trip or seats not selected');
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user?.id) {
        throw new Error('User not authenticated');
      }

      // Create the booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          trip_id: currentBooking.trip.id,
          total_fare: currentBooking.totalFare,
          is_round_trip: currentBooking.tripType === 'round_trip',
          status: 'pending_payment',
          user_id: user.id,
          check_in_status: false
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      bookingId = booking.id;

      // Generate QR code data
      const qrCodeData = JSON.stringify({
        bookingNumber: booking.booking_number,
        bookingId: booking.id,
        tripId: currentBooking.trip.id,
        departureDate: currentBooking.trip.travel_date || currentBooking.departureDate,
        departureTime: currentBooking.trip.departure_time,
        passengers: currentBooking.passengers.length,
        seats: currentBooking.selectedSeats.map(seat => seat.number),
        totalFare: currentBooking.totalFare,
        timestamp: new Date().toISOString()
      });

      // Update booking with QR code data
      const { error: qrUpdateError } = await supabase
        .from('bookings')
        .update({ qr_code_url: qrCodeData })
        .eq('id', booking.id);

      if (qrUpdateError) throw qrUpdateError;

      // Create payment record with user_id
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          booking_id: booking.id,
          payment_method: paymentMethod as PaymentMethod,
          amount: currentBooking.totalFare,
          status: 'pending'
        });

      if (paymentError) throw paymentError;

      // Create passengers
      const passengerInserts = currentBooking.passengers.map((passenger, index) => ({
        booking_id: booking.id,
        seat_id: currentBooking.selectedSeats[index].id,
        passenger_name: passenger.fullName,
        passenger_contact_number: passenger.idNumber || '',
        special_assistance_request: passenger.specialAssistance || ''
      }));
      const { error: passengersError } = await supabase
        .from('passengers')
        .insert(passengerInserts);

      if (passengersError) throw passengersError;

      // Update seat reservations - this is the critical part
      // First, verify that all selected seats are still available for this trip
      const { data: currentReservations, error: checkError } = await supabase
        .from('seat_reservations')
        .select('id, seat_id, is_available, booking_id, is_reserved, reservation_expiry')
        .eq('trip_id', currentBooking.trip.id)
        .in('seat_id', currentBooking.selectedSeats.map(seat => seat.id));

      if (checkError) throw checkError;

      if (!currentReservations || currentReservations.length !== currentBooking.selectedSeats.length) {
        throw new Error('Seat reservation records not found. Please contact administrator.');
      }

      // Check if any seats are no longer available
      const unavailableSeats = currentReservations.filter(res => {
        // Seat is unavailable if:
        // 1. is_available is false, OR
        // 2. booking_id is not null (already booked by someone else), OR  
        // 3. is_reserved is true and reservation hasn't expired
        if (!res.is_available || res.booking_id) {
          return true;
        }

        if (res.is_reserved && res.reservation_expiry) {
          const expiryTime = new Date(res.reservation_expiry);
          const currentTime = new Date();
          if (currentTime <= expiryTime) {
            return true; // Still reserved
          }
        }

        return false;
      });

      if (unavailableSeats.length > 0) {
        const unavailableSeatIds = unavailableSeats.map(res => res.seat_id);
        const unavailableSeatNumbers = currentBooking.selectedSeats
          .filter(seat => unavailableSeatIds.includes(seat.id))
          .map(seat => seat.number);

        throw new Error(`Seats ${unavailableSeatNumbers.join(', ')} are no longer available. Please refresh and select different seats.`);
      }

      // Get existing seat reservation records for the selected seats
      const { data: existingRecords, error: checkExistingError } = await supabase
        .from('seat_reservations')
        .select('*')
        .eq('trip_id', currentBooking.trip.id)
        .in('seat_id', currentBooking.selectedSeats.map(seat => seat.id));

      if (checkExistingError || !existingRecords || existingRecords.length === 0) {
        throw new Error('No seat reservation records found for selected seats. The seat_reservations table may not be properly populated for this trip.');
      }

      // Update seat reservations to mark them as booked
      const updateResults = [];

      for (const record of existingRecords) {
        const { data: updateResult, error: updateError } = await supabase
          .from('seat_reservations')
          .update({
            is_available: false,
            booking_id: booking.id,
            is_reserved: false,
            reservation_expiry: null
          })
          .eq('id', record.id)
          .select();

        if (updateError) {
          throw new Error(`Failed to update seat reservation: ${updateError.message}`);
        }

        if (updateResult && updateResult.length > 0) {
          updateResults.push(updateResult[0]);
        } else {
          throw new Error(`Failed to update seat reservation ${record.id}. Record exists but update had no effect.`);
        }
      }

      if (updateResults.length !== currentBooking.selectedSeats.length) {
        throw new Error(`Failed to update all seat reservations. Expected ${currentBooking.selectedSeats.length}, updated ${updateResults.length}`);
      }

      // Handle round trip booking if applicable
      if (currentBooking.tripType === 'round_trip' && currentBooking.returnTrip) {
        const { data: returnBooking, error: returnBookingError } = await supabase
          .from('bookings')
          .insert({
            trip_id: currentBooking.returnTrip.id,
            total_fare: currentBooking.totalFare,
            is_round_trip: true,
            return_booking_id: booking.id,
            status: 'pending_payment',
            user_id: user.id,
            check_in_status: false
          })
          .select()
          .single();

        if (returnBookingError) throw returnBookingError;

        returnBookingId = returnBooking.id;

        // Generate QR code data for return booking
        const returnQrCodeData = JSON.stringify({
          bookingNumber: returnBooking.booking_number,
          bookingId: returnBooking.id,
          tripId: currentBooking.returnTrip.id,
          departureDate: currentBooking.returnTrip.travel_date || currentBooking.returnDate,
          departureTime: currentBooking.returnTrip.departure_time,
          passengers: currentBooking.passengers.length,
          seats: currentBooking.returnSelectedSeats.map(seat => seat.number),
          totalFare: currentBooking.totalFare,
          isReturn: true,
          timestamp: new Date().toISOString()
        });

        // Update return booking with QR code data
        const { error: returnQrUpdateError } = await supabase
          .from('bookings')
          .update({ qr_code_url: returnQrCodeData })
          .eq('id', returnBooking.id);

        if (returnQrUpdateError) throw returnQrUpdateError;

        // Create return payment record
        const { error: returnPaymentError } = await supabase
          .from('payments')
          .insert({
            booking_id: returnBooking.id,
            payment_method: paymentMethod as PaymentMethod,
            amount: currentBooking.totalFare,
            status: 'pending'
          });

        if (returnPaymentError) throw returnPaymentError;

        // Update original booking with return booking reference
        const { error: updateError } = await supabase
          .from('bookings')
          .update({ return_booking_id: returnBooking.id })
          .eq('id', booking.id);

        if (updateError) throw updateError;

        // Create return passengers
        const returnPassengerInserts = currentBooking.passengers.map((passenger, index) => ({
          booking_id: returnBooking.id,
          seat_id: currentBooking.returnSelectedSeats[index].id,
          passenger_name: passenger.fullName,
          passenger_contact_number: passenger.idNumber || '',
          special_assistance_request: passenger.specialAssistance || ''
        }));

        const { error: returnPassengersError } = await supabase
          .from('passengers')
          .insert(returnPassengerInserts);

        if (returnPassengersError) throw returnPassengersError;

        // Verify return seats are still available
        const { data: returnReservations, error: returnCheckError } = await supabase
          .from('seat_reservations')
          .select('seat_id, is_available, booking_id, is_reserved')
          .eq('trip_id', currentBooking.returnTrip.id)
          .in('seat_id', currentBooking.returnSelectedSeats.map(seat => seat.id));

        if (returnCheckError) throw returnCheckError;

        // Check if any return seats are no longer available
        const unavailableReturnSeats = returnReservations?.filter(res =>
          !res.is_available || (res.booking_id && res.booking_id !== returnBooking.id)
        ) || [];

        if (unavailableReturnSeats.length > 0) {
          throw new Error(`Some selected return seats are no longer available. Please refresh and select different seats.`);
        }

        // Update return seat reservations
        const { data: updatedReturnReservations, error: returnSeatsError } = await supabase
          .from('seat_reservations')
          .update({
            is_available: false,
            booking_id: returnBooking.id,
            is_reserved: false,
            reservation_expiry: null
          })
          .eq('trip_id', currentBooking.returnTrip.id)
          .in('seat_id', currentBooking.returnSelectedSeats.map(seat => seat.id))
          .select();

        if (returnSeatsError) {
          throw returnSeatsError;
        }
      }

      // Refresh seat availability immediately after successful booking
      // This ensures other users see updated seat status
      if (currentBooking.trip?.id) {
        try {
          await get().fetchAvailableSeats(currentBooking.trip.id, false);
        } catch (refreshError) {
          console.error('Error refreshing departure seats:', refreshError);
        }
      }

      if (currentBooking.returnTrip?.id) {
        try {
          await get().fetchAvailableSeats(currentBooking.returnTrip.id, true);
        } catch (refreshError) {
          console.error('Error refreshing return seats:', refreshError);
        }
      }

      return booking;
    } catch (error) {
      console.error('Error confirming booking:', error);

      // Clean up any failed bookings
      if (bookingId) {
        try {
          // Release any seats that were reserved
          await supabase
            .from('seat_reservations')
            .update({
              is_available: true,
              booking_id: null,
              is_reserved: false,
              reservation_expiry: null
            })
            .eq('booking_id', bookingId);

          // Delete the booking record
          await supabase
            .from('bookings')
            .delete()
            .eq('id', bookingId);
        } catch (cleanupError) {
          console.error('Error during cleanup:', cleanupError);
        }
      }

      if (returnBookingId) {
        try {
          // Release any return seats that were reserved
          await supabase
            .from('seat_reservations')
            .update({
              is_available: true,
              booking_id: null,
              is_reserved: false,
              reservation_expiry: null
            })
            .eq('booking_id', returnBookingId);

          // Delete the return booking record
          await supabase
            .from('bookings')
            .delete()
            .eq('id', returnBookingId);
        } catch (cleanupError) {
          console.error('Error during return booking cleanup:', cleanupError);
        }
      }

      setError('Failed to confirm booking. Please try again.');

      // Refresh seat availability to show current status
      if (currentBooking.trip?.id) {
        try {
          await get().fetchAvailableSeats(currentBooking.trip.id, false);
        } catch (refreshError) {
          console.error('Error refreshing departure seats after booking error:', refreshError);
        }
      }

      if (currentBooking.returnTrip?.id) {
        try {
          await get().fetchAvailableSeats(currentBooking.returnTrip.id, true);
        } catch (refreshError) {
          console.error('Error refreshing return seats after booking error:', refreshError);
        }
      }

      throw error;
    } finally {
      setLoading(false);
    }
  },

  resetBooking: () => {
    set({
      bookingData: { ...initialBookingData },
      error: null,
      currentStep: 0,
    });
  },

  setError: (error) => set({ error }),
  setLoading: (isLoading) => set({ isLoading }),

  // Fetch user bookings
  fetchUserBookings: async () => {
    const { setError, setLoading } = get();
    setLoading(true);
    setError(null);

    try {
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_number,
          trip:trip_id(
            id,
            route:route_id(
              id,
              from_island:from_island_id(
                id,
                name,
                zone
              ),
              to_island:to_island_id(
                id,
                name,
                zone
              ),
              base_fare
            ),
            travel_date,
            departure_time,
            vessel:vessel_id(
              id,
              name
            )
          ),
          is_round_trip,
          return_booking_id,
          status,
          total_fare,
          qr_code_url,
          check_in_status,
          passengers!inner(
            id,
            passenger_name,
            passenger_contact_number,
            special_assistance_request,
            seat:seat_id(
              id,
              seat_number,
              row_number,
              is_window,
              is_aisle
            )
          ),
          payments(
            payment_method,
            status
          ),
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      const formattedBookings: Booking[] = bookingsData.map((booking: any) => {
        // Format route data
        const route: Route = {
          id: booking.trip.route.id,
          fromIsland: {
            id: booking.trip.route.from_island.id,
            name: booking.trip.route.from_island.name,
            zone: booking.trip.route.from_island.zone,
          },
          toIsland: {
            id: booking.trip.route.to_island.id,
            name: booking.trip.route.to_island.name,
            zone: booking.trip.route.to_island.zone,
          },
          baseFare: booking.trip.route.base_fare,
          duration: '2h' // Default duration since it's not in the database
        };

        // Format passengers data with their seats
        const passengers: Passenger[] = booking.passengers.map((p: any) => ({
          id: p.id,
          fullName: p.passenger_name,
          idNumber: p.passenger_contact_number,
          specialAssistance: p.special_assistance_request,
        }));

        // Format seats data
        const seats: Seat[] = booking.passengers.map((p: any) => ({
          id: p.seat.id,
          number: p.seat.seat_number,
          rowNumber: p.seat.row_number,
          isWindow: p.seat.is_window,
          isAisle: p.seat.is_aisle,
          isAvailable: false,
          isSelected: true
        }));

        // Get payment information
        const payment = booking.payments?.[0] ? {
          method: booking.payments[0].payment_method,
          status: booking.payments[0].status
        } : undefined;

        // Format the booking
        return {
          id: booking.id,
          bookingNumber: booking.booking_number,
          tripType: booking.is_round_trip ? 'round_trip' : 'one_way',
          departureDate: booking.trip.travel_date,
          departureTime: booking.trip.departure_time,
          route,
          seats,
          passengers,
          totalFare: booking.total_fare,
          status: booking.status,
          qrCodeUrl: booking.qr_code_url,
          checkInStatus: booking.check_in_status,
          createdAt: booking.created_at,
          updatedAt: booking.updated_at,
          vessel: {
            id: booking.trip.vessel.id,
            name: booking.trip.vessel.name
          },
          payment
        };
      });

      set({ bookings: formattedBookings });
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      setError('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  },

  fetchSeats: async (vesselId: string) => {
    const { setError, setLoading } = get();
    setLoading(true);
    setError(null);

    try {
      const { data: seatsData, error } = await supabase
        .from('seats')
        .select('*')
        .eq('vessel_id', vesselId)
        .order('row_number')
        .order('seat_number');

      if (error) throw error;

      // Transform the Supabase seat data to match our Seat interface
      const formattedSeats: Seat[] = seatsData.map(seat => ({
        id: seat.id,
        number: seat.seat_number,
        rowNumber: seat.row_number,
        isWindow: seat.is_window,
        isAisle: seat.is_aisle,
        isAvailable: true, // This will be updated when we check reservations
        isSelected: false
      }));

      set({ seats: formattedSeats });
    } catch (error) {
      console.error('Error fetching seats:', error);
      setError('Failed to fetch seats');
    } finally {
      setLoading(false);
    }
  },

  // New function to ensure seat reservations exist for a trip
  ensureSeatReservations: async (tripId: string) => {
    try {
      // Get the trip to find the vessel
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('vessel_id')
        .eq('id', tripId)
        .single();

      if (tripError) {
        console.error('Error fetching trip data:', tripError);
        return; // Don't throw, just return
      }

      // Get all seats for this vessel
      const { data: allSeats, error: seatsError } = await supabase
        .from('seats')
        .select('id')
        .eq('vessel_id', tripData.vessel_id);

      if (seatsError) {
        console.error('Error fetching seats:', seatsError);
        return; // Don't throw, just return
      }

      if (!allSeats || allSeats.length === 0) {
        console.warn(`No seats found for vessel ${tripData.vessel_id}`);
        return;
      }

      // Check which seat reservations already exist
      const { data: existingReservations, error: existingError } = await supabase
        .from('seat_reservations')
        .select('seat_id')
        .eq('trip_id', tripId);

      if (existingError) {
        console.error('Error checking existing reservations:', existingError);
        return; // Don't throw, just return
      }

      const existingSeatIds = new Set(existingReservations?.map(r => r.seat_id) || []);
      const missingSeats = allSeats.filter(seat => !existingSeatIds.has(seat.id));

      if (missingSeats.length === 0) {
        return; // All seat reservations already exist
      }


      // Create missing seat reservations in batches to avoid overwhelming the database
      const BATCH_SIZE = 50;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < missingSeats.length; i += BATCH_SIZE) {
        const batch = missingSeats.slice(i, i + BATCH_SIZE);
        const seatReservationsToCreate = batch.map(seat => ({
          trip_id: tripId,
          seat_id: seat.id,
          is_available: true,
          is_reserved: false,
          booking_id: null
        }));

        try {
          const { error: insertError } = await supabase
            .from('seat_reservations')
            .insert(seatReservationsToCreate);

          if (insertError) {
            console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, insertError);
            errorCount += batch.length;
          } else {
            successCount += batch.length;
          }
        } catch (batchError) {
          console.error(`Exception inserting batch ${i / BATCH_SIZE + 1}:`, batchError);
          errorCount += batch.length;
        }

        // Add a small delay between batches to avoid overwhelming the database
        if (i + BATCH_SIZE < missingSeats.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }


    } catch (error: any) {
      console.error('Error creating seat reservations:', error);
      // Don't throw the error, just log it to prevent breaking the seat fetching process
    }
  },

  // Utility function to initialize all missing seat reservations in bulk
  initializeAllSeatReservations: async () => {
    const { setError, setLoading } = get();
    setLoading(true);
    setError(null);

    try {
      // Get all active trips
      const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select('id, vessel_id')
        .eq('is_active', true);

      if (tripsError) throw tripsError;


      // Process trips in batches to avoid overwhelming the database
      const BATCH_SIZE = 10;
      for (let i = 0; i < trips.length; i += BATCH_SIZE) {
        const batch = trips.slice(i, i + BATCH_SIZE);

        await Promise.all(batch.map(async (trip) => {
          try {
            // Get all seats for this vessel
            const { data: allSeats, error: seatsError } = await supabase
              .from('seats')
              .select('id')
              .eq('vessel_id', trip.vessel_id);

            if (seatsError) throw seatsError;

            // Get existing reservations for this trip
            const { data: existingReservations, error: reservationError } = await supabase
              .from('seat_reservations')
              .select('seat_id')
              .eq('trip_id', trip.id);

            if (reservationError) throw reservationError;

            // Find seats that don't have reservations for this trip
            const existingSeatIds = new Set(existingReservations.map(r => r.seat_id));
            const missingSeats = allSeats
              .filter(seat => !existingSeatIds.has(seat.id))
              .map(seat => ({
                trip_id: trip.id,
                seat_id: seat.id,
                is_available: true,
                is_reserved: false,
                booking_id: null
              }));

            // Insert missing reservations
            if (missingSeats.length > 0) {
              const { error: insertError } = await supabase
                .from('seat_reservations')
                .insert(missingSeats);

              if (insertError) {
                console.error(`Error creating seat reservations for trip ${trip.id}:`, insertError);
              } else {
                console.log(`Created ${missingSeats.length} seat reservations for trip ${trip.id}`);
              }
            }
          } catch (error) {
            console.error(`Error processing trip ${trip.id}:`, error);
          }
        }));

        // Add a small delay between batches
        if (i + BATCH_SIZE < trips.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

    } catch (error) {
      console.error('Error initializing all seat reservations:', error);
      setError('Failed to initialize seat reservations');
      throw error;
    } finally {
      setLoading(false);
    }
  },

  // Cancel a booking
  cancelBooking: async (bookingId: string, reason: string, bankDetails: { accountNumber: string; accountName: string; bankName: string }) => {
    const { setError, setLoading, fetchUserBookings, bookings } = get();
    setLoading(true);
    setError(null);

    try {
      // Find the booking to get current details
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) throw new Error('Booking not found');

      // Calculate refund amount and cancellation fee (50% refund policy)
      const refundAmount = booking.totalFare * 0.5;
      const cancellationFee = booking.totalFare - refundAmount;

      // Generate unique cancellation number (10 characters max as per DB constraint)
      const cancellationNumber = Math.floor(Math.random() * 9000000000) + 1000000000; // 10-digit number

      // 1. Update booking status to cancelled
      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (bookingUpdateError) throw bookingUpdateError;

      // 2. Release seat reservations back to available status using RPC
      // Release seat reservations back to available status
      const { error: seatReleaseError } = await supabase
        .from('seat_reservations')
        .update({
          is_available: true,
          booking_id: null,
          is_reserved: false,
          reservation_expiry: null
        })
        .eq('booking_id', bookingId);

      if (seatReleaseError) throw seatReleaseError;

      // 3. Insert into cancellations table
      const { error: cancellationError } = await supabase
        .from('cancellations')
        .insert({
          booking_id: bookingId,
          cancellation_number: cancellationNumber.toString(),
          cancellation_reason: reason,
          cancellation_fee: cancellationFee,
          refund_amount: refundAmount,
          refund_bank_account_number: bankDetails.accountNumber,
          refund_bank_account_name: bankDetails.accountName,
          refund_bank_name: bankDetails.bankName,
          status: 'pending'
        });

      if (cancellationError) throw cancellationError;

      // 4. Update payment status to refunded (if payment exists)
      if (booking.payment?.status === 'completed') {
        await supabase
          .from('payments')
          .update({
            status: 'partially_refunded',
            updated_at: new Date().toISOString()
          })
          .eq('booking_id', bookingId);
      }

      await fetchUserBookings();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      setError('Failed to cancel booking');
      throw error;
    } finally {
      setLoading(false);
    }
  },

  // Modify a booking
  modifyBooking: async (bookingId: string, { newTripId, newReturnTripId, newDepartureDate, newReturnDate, selectedSeats, returnSelectedSeats, modificationReason, fareDifference }: any) => {
    const { setError, setLoading, fetchUserBookings, bookings } = get();
    setLoading(true);
    setError(null);

    try {
      // Find the booking to get current passengers
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) throw new Error('Booking not found');

      // Validate required parameters
      if (!newTripId) throw new Error('New trip ID is required');

      // 1. Create a new booking for the modification (as per the modifications table schema)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user?.id) {
        throw new Error('User not authenticated');
      }

      // Calculate new total fare
      const newTotalFare = booking.totalFare + fareDifference;

      // Create new booking with updated details
      const { data: newBooking, error: newBookingError } = await supabase
        .from('bookings')
        .insert({
          trip_id: newTripId, // Use the new trip ID
          total_fare: newTotalFare,
          is_round_trip: booking.tripType === 'round_trip',
          status: 'confirmed', // Keep same status or set to pending if payment needed
          user_id: user.id,
          check_in_status: false
        })
        .select()
        .single();

      if (newBookingError) throw newBookingError;

      // Fetch trip details for QR code generation
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('departure_time')
        .eq('id', newTripId)
        .single();

      if (tripError) throw tripError;

      // Generate QR code data for new booking
      const qrCodeData = JSON.stringify({
        bookingNumber: newBooking.booking_number,
        bookingId: newBooking.id,
        tripId: newTripId,
        departureDate: newDepartureDate,
        departureTime: tripData?.departure_time || '',
        passengers: booking.passengers.length,
        seats: selectedSeats.map((seat: any) => seat.number),
        totalFare: newTotalFare,
        timestamp: new Date().toISOString()
      });

      // Update booking with QR code data
      const { error: qrUpdateError } = await supabase
        .from('bookings')
        .update({ qr_code_url: qrCodeData })
        .eq('id', newBooking.id);

      if (qrUpdateError) throw qrUpdateError;

      // 2. Insert new passengers with new seat assignments
      const passengerInserts = booking.passengers.map((passenger, index) => ({
        booking_id: newBooking.id,
        seat_id: selectedSeats[index]?.id,
        passenger_name: passenger.fullName,
        passenger_contact_number: passenger.idNumber || '',
        special_assistance_request: passenger.specialAssistance || ''
      }));

      if (passengerInserts.length > 0) {
        const { error: passengersError } = await supabase
          .from('passengers')
          .insert(passengerInserts);
        if (passengersError) throw passengersError;
      }

      // 3. Verify new seats are available and update reservations
      const { data: newSeatReservations, error: newSeatCheckError } = await supabase
        .from('seat_reservations')
        .select('seat_id, is_available, booking_id, is_reserved')
        .eq('trip_id', newTripId)
        .in('seat_id', selectedSeats.map((seat: any) => seat.id));

      if (newSeatCheckError) throw newSeatCheckError;

      // Check if any new seats are no longer available
      const unavailableNewSeats = newSeatReservations?.filter(res =>
        !res.is_available || (res.booking_id && res.booking_id !== newBooking.id)
      ) || [];

      if (unavailableNewSeats.length > 0) {
        throw new Error(`Some selected new seats are no longer available. Please refresh and select different seats.`);
      }

      // Update seat reservations for new seats
      const { error: seatsError } = await supabase
        .from('seat_reservations')
        .update({
          is_available: false,
          booking_id: newBooking.id,
          is_reserved: false,
          reservation_expiry: null
        })
        .in('seat_id', selectedSeats.map((seat: any) => seat.id))
        .eq('trip_id', newTripId);

      if (seatsError) throw seatsError;

      // 4. Handle return trip if applicable
      if (booking.tripType === 'round_trip' && newReturnTripId && returnSelectedSeats.length > 0) {
        const { data: newReturnBooking, error: returnBookingError } = await supabase
          .from('bookings')
          .insert({
            trip_id: newReturnTripId,
            total_fare: newTotalFare,
            is_round_trip: true,
            return_booking_id: newBooking.id,
            status: 'confirmed',
            user_id: user.id,
            check_in_status: false
          })
          .select()
          .single();

        if (returnBookingError) throw returnBookingError;

        // Fetch return trip details for QR code generation
        const { data: returnTripData, error: returnTripError } = await supabase
          .from('trips')
          .select('departure_time')
          .eq('id', newReturnTripId)
          .single();

        if (returnTripError) throw returnTripError;

        // Generate QR code data for return booking
        const returnQrCodeData = JSON.stringify({
          bookingNumber: newReturnBooking.booking_number,
          bookingId: newReturnBooking.id,
          tripId: newReturnTripId,
          departureDate: newReturnDate,
          departureTime: returnTripData?.departure_time || '',
          passengers: booking.passengers.length,
          seats: returnSelectedSeats.map((seat: any) => seat.number),
          totalFare: newTotalFare,
          isReturn: true,
          timestamp: new Date().toISOString()
        });

        // Update return booking with QR code data
        const { error: returnQrUpdateError } = await supabase
          .from('bookings')
          .update({ qr_code_url: returnQrCodeData })
          .eq('id', newReturnBooking.id);

        if (returnQrUpdateError) throw returnQrUpdateError;

        // Update new booking with return reference
        await supabase
          .from('bookings')
          .update({ return_booking_id: newReturnBooking.id })
          .eq('id', newBooking.id);

        // Insert return passengers
        const returnPassengerInserts = booking.passengers.map((passenger, index) => ({
          booking_id: newReturnBooking.id,
          seat_id: returnSelectedSeats[index]?.id,
          passenger_name: passenger.fullName,
          passenger_contact_number: passenger.idNumber || '',
          special_assistance_request: passenger.specialAssistance || ''
        }));

        if (returnPassengerInserts.length > 0) {
          await supabase
            .from('passengers')
            .insert(returnPassengerInserts);
        }

        // Verify return seats are available and update reservations
        const { data: returnSeatReservations, error: returnSeatCheckError } = await supabase
          .from('seat_reservations')
          .select('seat_id, is_available, booking_id, is_reserved')
          .eq('trip_id', newReturnTripId)
          .in('seat_id', returnSelectedSeats.map((seat: any) => seat.id));

        if (returnSeatCheckError) throw returnSeatCheckError;

        // Check if any return seats are no longer available
        const unavailableReturnSeats = returnSeatReservations?.filter(res =>
          !res.is_available || (res.booking_id && res.booking_id !== newReturnBooking.id)
        ) || [];

        if (unavailableReturnSeats.length > 0) {
          throw new Error(`Some selected return seats are no longer available. Please refresh and select different seats.`);
        }

        // Update return seat reservations
        await supabase
          .from('seat_reservations')
          .update({
            is_available: false,
            booking_id: newReturnBooking.id,
            is_reserved: false,
            reservation_expiry: null
          })
          .in('seat_id', returnSelectedSeats.map((seat: any) => seat.id))
          .eq('trip_id', newReturnTripId);
      }

      // 5. Cancel the old booking
      const { error: cancelError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (cancelError) throw cancelError;

      // 6. Release old seat reservations
      const { error: releaseSeatsError } = await supabase
        .from('seat_reservations')
        .update({
          is_available: true,
          booking_id: null,
          is_reserved: false,
          reservation_expiry: null
        })
        .eq('booking_id', bookingId);

      if (releaseSeatsError) throw releaseSeatsError;


      // 7. Insert into modifications table
      const { error: modificationError } = await supabase
        .from('modifications')
        .insert({
          old_booking_id: bookingId,
          new_booking_id: newBooking.id,
          modification_reason: modificationReason,
          fare_difference: fareDifference,
          requires_additional_payment: fareDifference > 0,
          refund_details: fareDifference < 0 ? {
            amount: Math.abs(fareDifference),
            status: 'pending'
          } : null,
          payment_details: fareDifference > 0 ? {
            amount: fareDifference,
            status: 'pending'
          } : null
        });

      if (modificationError) throw modificationError;

      // 8. Handle payment if fare difference exists
      if (fareDifference > 0) {
        // Create additional payment record
        await supabase
          .from('payments')
          .insert({
            booking_id: newBooking.id,
            payment_method: 'bank_transfer', // Default method
            amount: fareDifference,
            status: 'pending'
          });
      }

      await fetchUserBookings();
    } catch (error) {
      console.error('Error modifying booking:', error);
      setError('Failed to modify booking');
      throw error;
    } finally {
      setLoading(false);
    }
  },

  // Validate ticket
  validateTicket: async (bookingNumber: string) => {
    const { setError, setLoading } = get();
    setLoading(true);
    setError(null);

    try {
      // Query the database for the booking
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_number,
          status,
          total_fare,
          qr_code_url,
          check_in_status,
          trip:trip_id(
            travel_date,
            departure_time,
            route:route_id(
              from_island:from_island_id(
                name,
                zone
              ),
              to_island:to_island_id(
                name,
                zone
              ),
              base_fare
            ),
            vessel:vessel_id(
              name
            )
          ),
          passengers(
            passenger_name,
            passenger_contact_number,
            special_assistance_request,
            seat:seat_id(
              seat_number,
              row_number,
              is_window,
              is_aisle
            )
          )
        `)
        .eq('booking_number', bookingNumber)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return {
            isValid: false,
            booking: null,
            message: "Booking not found"
          };
        }
        throw error;
      }

      // Handle the data safely
      const dbBooking = data as any;

      if (!dbBooking || !dbBooking.trip || !dbBooking.trip.route) {
        return {
          isValid: false,
          booking: null,
          message: "Invalid booking data"
        };
      }

      // Transform database result to our Booking interface
      const booking: Booking = {
        id: dbBooking.id,
        bookingNumber: dbBooking.booking_number,
        status: dbBooking.status as BookingStatus,
        departureDate: dbBooking.trip.travel_date,
        departureTime: dbBooking.trip.departure_time,
        tripType: 'one_way', // Default, could be enhanced
        route: {
          id: '',
          fromIsland: {
            id: '',
            name: dbBooking.trip.route.from_island.name,
            zone: dbBooking.trip.route.from_island.zone
          },
          toIsland: {
            id: '',
            name: dbBooking.trip.route.to_island.name,
            zone: dbBooking.trip.route.to_island.zone
          },
          baseFare: dbBooking.trip.route.base_fare,
          duration: '2h'
        },
        passengers: (dbBooking.passengers || []).map((p: any) => ({
          id: '',
          fullName: p.passenger_name,
          idNumber: p.passenger_contact_number,
          specialAssistance: p.special_assistance_request
        })),
        seats: (dbBooking.passengers || []).map((p: any) => ({
          id: '',
          number: p.seat.seat_number,
          rowNumber: p.seat.row_number,
          isWindow: p.seat.is_window,
          isAisle: p.seat.is_aisle,
          isAvailable: false,
          isSelected: false
        })),
        totalFare: dbBooking.total_fare,
        qrCodeUrl: dbBooking.qr_code_url,
        checkInStatus: dbBooking.check_in_status,
        vessel: {
          id: '',
          name: dbBooking.trip.vessel.name
        },
        createdAt: '',
        updatedAt: ''
      };

      // Validate the booking
      const currentDate = new Date();
      const departureDate = new Date(dbBooking.trip.travel_date);
      const isValidDate = departureDate >= new Date(currentDate.setHours(0, 0, 0, 0));
      const isValidStatus = dbBooking.status === 'confirmed';

      let message = '';
      let isValid = false;

      if (!isValidStatus) {
        message = `Ticket is ${dbBooking.status}`;
        isValid = false;
      } else if (!isValidDate) {
        message = "Ticket has expired";
        isValid = false;
      } else {
        // Check if it's for today or future
        const today = new Date().toDateString();
        const tripDate = departureDate.toDateString();

        if (tripDate === today) {
          message = "Ticket is valid for travel today";
          isValid = true;
        } else if (departureDate > new Date()) {
          message = `Ticket is valid for travel on ${departureDate.toLocaleDateString()}`;
          isValid = true;
        } else {
          message = "Ticket has expired";
          isValid = false;
        }
      }

      return {
        isValid,
        booking,
        message
      };

    } catch (error) {
      console.error('Error validating booking:', error);
      setError('Failed to validate ticket');
      return {
        isValid: false,
        booking: null,
        message: "Error validating ticket. Please try again."
      };
    } finally {
      setLoading(false);
    }
  },

  subscribeSeatUpdates: (tripId: string, isReturn?: boolean) => {
    const subscriptionKey = `${tripId}-${isReturn ? 'return' : 'departure'}`;

    // Unsubscribe if already subscribed
    get().unsubscribeSeatUpdates(tripId);

    const subscription = supabase
      .channel(`seat_reservations:${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seat_reservations',
          filter: `trip_id=eq.${tripId}`
        },
        async (payload) => {
          // Update seat availability without showing loading state
          try {
            const { data: seatReservations, error } = await supabase
              .from('seat_reservations')
              .select(`
                id,
                trip_id,
                seat_id,
                is_available,
                is_reserved,
                booking_id,
                reservation_expiry,
                seat:seat_id(
                  id,
                  vessel_id,
                  seat_number,
                  row_number,
                  is_window,
                  is_aisle
                )
              `)
              .eq('trip_id', tripId)
              .order('seat(row_number)', { ascending: true })
              .order('seat(seat_number)', { ascending: true });

            if (error || !seatReservations) return;

            // Process seat reservations to determine availability
            const allSeats: Seat[] = [];

            seatReservations.forEach((reservation: any) => {
              if (!reservation.seat) return;

              let isAvailable = reservation.is_available && !reservation.booking_id;

              // Handle temporary reservations
              if (reservation.is_reserved && reservation.reservation_expiry) {
                const expiryTime = new Date(reservation.reservation_expiry);
                const currentTime = new Date();

                if (currentTime > expiryTime) {
                  isAvailable = reservation.is_available && !reservation.booking_id;
                  // Clean up expired reservation
                  supabase
                    .from('seat_reservations')
                    .update({
                      is_reserved: false,
                      reservation_expiry: null
                    })
                    .eq('id', reservation.id)
                    .then(({ error }) => {
                      if (error) console.error('Error cleaning up expired reservation:', error);
                    });
                } else {
                  isAvailable = false;
                }
              }

              const seat: Seat = {
                id: reservation.seat.id,
                number: reservation.seat.seat_number,
                rowNumber: reservation.seat.row_number,
                isWindow: reservation.seat.is_window,
                isAisle: reservation.seat.is_aisle,
                isAvailable: isAvailable,
                isSelected: false
              };

              allSeats.push(seat);
            });

            // Update state without triggering loading
            set(state => ({
              [isReturn ? 'availableReturnSeats' : 'availableSeats']: allSeats
            }));

          } catch (error) {
            console.error('Error updating seats from subscription:', error);
          }
        }
      )
      .subscribe();

    // Store the subscription
    set(state => {
      const newSubscriptions = new Map(state.seatSubscriptions);
      newSubscriptions.set(subscriptionKey, subscription);
      return { seatSubscriptions: newSubscriptions };
    });
  },

  unsubscribeSeatUpdates: (tripId: string) => {
    const departureKey = `${tripId}-departure`;
    const returnKey = `${tripId}-return`;

    set(state => {
      const newSubscriptions = new Map(state.seatSubscriptions);

      // Unsubscribe departure
      const departureSub = newSubscriptions.get(departureKey);
      if (departureSub) {
        supabase.removeChannel(departureSub);
        newSubscriptions.delete(departureKey);
      }

      // Unsubscribe return
      const returnSub = newSubscriptions.get(returnKey);
      if (returnSub) {
        supabase.removeChannel(returnSub);
        newSubscriptions.delete(returnKey);
      }

      return { seatSubscriptions: newSubscriptions };
    });
  },

  cleanupAllSeatSubscriptions: () => {
    set(state => {
      // Unsubscribe from all active subscriptions
      state.seatSubscriptions.forEach((subscription, key) => {
        supabase.removeChannel(subscription);
      });

      return { seatSubscriptions: new Map() };
    });
  },

  // Function to create seat reservations for a specific trip
  createSeatReservationsForTrip: async (tripId: string) => {
    try {
      // Get the trip to find the vessel
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('vessel_id')
        .eq('id', tripId)
        .single();

      if (tripError) {
        console.error('Error fetching trip data:', tripError);
        return; // Don't throw, just return
      }

      // Get all seats for this vessel
      const { data: allSeats, error: seatsError } = await supabase
        .from('seats')
        .select('id')
        .eq('vessel_id', tripData.vessel_id);

      if (seatsError) {
        console.error('Error fetching seats:', seatsError);
        return; // Don't throw, just return
      }

      if (!allSeats || allSeats.length === 0) {
        console.warn(`No seats found for vessel ${tripData.vessel_id}`);
        return;
      }

      // Check which seat reservations already exist
      const { data: existingReservations, error: existingError } = await supabase
        .from('seat_reservations')
        .select('seat_id')
        .eq('trip_id', tripId);

      if (existingError) {
        console.error('Error checking existing reservations:', existingError);
        return; // Don't throw, just return
      }

      const existingSeatIds = new Set(existingReservations?.map(r => r.seat_id) || []);
      const missingSeats = allSeats.filter(seat => !existingSeatIds.has(seat.id));

      if (missingSeats.length === 0) {
        return; // All seat reservations already exist
      }


      // Create missing seat reservations in batches to avoid overwhelming the database
      const BATCH_SIZE = 50;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < missingSeats.length; i += BATCH_SIZE) {
        const batch = missingSeats.slice(i, i + BATCH_SIZE);
        const seatReservationsToCreate = batch.map(seat => ({
          trip_id: tripId,
          seat_id: seat.id,
          is_available: true,
          is_reserved: false,
          booking_id: null
        }));

        try {
          const { error: insertError } = await supabase
            .from('seat_reservations')
            .insert(seatReservationsToCreate);

          if (insertError) {
            console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, insertError);
            errorCount += batch.length;
          } else {
            successCount += batch.length;
          }
        } catch (batchError) {
          console.error(`Exception inserting batch ${i / BATCH_SIZE + 1}:`, batchError);
          errorCount += batch.length;
        }

        // Add a small delay between batches to avoid overwhelming the database
        if (i + BATCH_SIZE < missingSeats.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }


    } catch (error: any) {
      console.error('Error creating seat reservations:', error);
      // Don't throw the error, just log it to prevent breaking the seat fetching process
    }
  },
}));