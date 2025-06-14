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
  cancelBooking: (bookingId: string, reason: string, bankDetails: { accountNumber: string; accountName: string; bankName: string }) => Promise<void>;
  modifyBooking: (bookingId: string, { newDepartureDate, newReturnDate, selectedSeats, returnSelectedSeats, modificationReason, fareDifference }: any) => Promise<void>;
  validateTicket: (bookingNumber: string) => Promise<{ isValid: boolean; booking: Booking | null; message: string }>;
  setQuickBookingData: (route: Route, departureDate: string) => void;
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
        .filter((reservation: any) => reservation.is_available && !reservation.is_reserved && reservation.seat)
        .map((reservation: any) => ({
          id: reservation.seat.id,
          number: reservation.seat.seat_number,
          rowNumber: reservation.seat.row_number,
          isWindow: reservation.seat.is_window,
          isAisle: reservation.seat.is_aisle,
          isAvailable: true,
          isSelected: false
        }));

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

      // 2. Release seat reservations
      const { error: seatReleaseError } = await supabase
        .from('seat_reservations')
        .update({
          is_available: true,
          booking_id: null,
          is_reserved: false
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

      // 3. Update seat reservations for new seats
      const { error: seatsError } = await supabase
        .from('seat_reservations')
        .update({ is_available: false, booking_id: newBooking.id })
        .in('seat_id', selectedSeats.map((seat: any) => seat.id));

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

        // Update return seat reservations
        await supabase
          .from('seat_reservations')
          .update({ is_available: false, booking_id: newReturnBooking.id })
          .in('seat_id', returnSelectedSeats.map((seat: any) => seat.id));
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
        .update({ is_available: true, booking_id: null })
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
})); 