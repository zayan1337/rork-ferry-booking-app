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

  setTripType: (tripType: 'one_way' | 'round_trip') => void;
  setDepartureDate: (date: string) => void;
  setReturnDate: (date: string) => void;
  setRoute: (route: Route) => void;
  setReturnRoute: (route: Route) => void;
  toggleSeatSelection: (seat: Seat, isReturn?: boolean) => void;
  updatePassengers: (passengers: Passenger[]) => void;
  setTrip: (trip: Trip | null) => void;
  setReturnTrip: (trip: Trip | null) => void;
  setPassengers: (passengers: Passenger[]) => void;
  calculateTotalFare: () => void;
  setCurrentStep: (currentStep: number) => void;
  fetchRoutes: () => Promise<void>;
  fetchTrips: (routeId: string, date: string, isReturn?: boolean) => Promise<void>;
  fetchAvailableSeats: (tripId: string, isReturn?: boolean) => Promise<void>;
  fetchAvailableIslands: () => Promise<void>;
  fetchAvailableRoutes: () => Promise<void>;
  fetchSeats: (vesselId: string) => Promise<void>;
  confirmBooking: (paymentMethod: string) => Promise<any>;
  resetBooking: () => void;
  setError: (error: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  fetchUserBookings: () => Promise<void>;
  resetCurrentBooking: () => void;
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

  toggleSeatSelection: (seat: Seat, isReturn: boolean = false) => {
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
        .gt('available_seats', 0)
        .order('departure_time');

      if (error) throw error;

      const formattedTrips = trips.map((trip: any) => ({
        id: trip.id,
        route_id: trip.route_id,
        travel_date: trip.travel_date,
        departure_time: trip.departure_time,
        available_seats: trip.available_seats,
        vessel_id: trip.vessel.id,
        vessel_name: trip.vessel.name
      }));

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
      const { data, error } = await supabase
        .from('seat_reservations')
        .select(`
          id,
          trip_id,
          seat:seat_id(
            id,
            vessel_id,
            seat_number,
            row_number,
            is_window,
            is_aisle
          ),
          is_available,
          is_reserved,
          reservation_expiry
        `)
        .eq('trip_id', tripId)
        .eq('is_available', true)
        .is('booking_id', null);

      if (error) throw error;

      const availableSeats: Seat[] = data
        .filter((reservation: any) => reservation.is_available && !reservation.is_reserved)
        .map((reservation: any) => reservation.seat);

      set(state => ({
        [isReturn ? 'availableReturnSeats' : 'availableSeats']: availableSeats
      }));
    } catch (error) {
      console.error('Error fetching available seats:', error);
      setError('Failed to fetch available seats');
    } finally {
      setLoading(false);
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

      // Update seat reservations
      const { error: seatsError } = await supabase
        .from('seat_reservations')
        .update({
          is_available: false,
          booking_id: booking.id
        })
        .in('seat_id', currentBooking.selectedSeats.map(seat => seat.id));

      if (seatsError) throw seatsError;

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

        // Update return seat reservations
        const { error: returnSeatsError } = await supabase
          .from('seat_reservations')
          .update({
            is_available: false,
            booking_id: returnBooking.id
          })
          .in('seat_id', currentBooking.returnSelectedSeats.map(seat => seat.id));

        if (returnSeatsError) throw returnSeatsError;
      }

      return booking;
    } catch (error) {
      console.error('Error confirming booking:', error);
      setError('Failed to confirm booking');
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
})); 