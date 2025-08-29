import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import type {
  BookingStoreState,
  CurrentBooking,
  TripType,
  Trip,
} from '@/types/booking';
import type { Route, Seat, Passenger, PaymentMethod } from '@/types';
import { calculateBookingFare } from '@/utils/bookingUtils';

const initialCurrentBooking: CurrentBooking = {
  tripType: 'one_way',
  route: null,
  returnRoute: null,
  trip: null,
  returnTrip: null,
  departureDate: null,
  returnDate: null,
  passengers: [],
  selectedSeats: [],
  returnSelectedSeats: [],
  totalFare: 0,
};

interface BookingStoreActions {
  // Customer booking actions
  setTripType: (tripType: TripType) => void;
  setDepartureDate: (date: string) => void;
  setReturnDate: (date: string) => void;
  setRoute: (route: Route) => void;
  setReturnRoute: (route: Route) => void;
  setTrip: (trip: Trip | null) => void;
  setReturnTrip: (trip: Trip | null) => void;
  updatePassengers: (passengers: Passenger[]) => void;
  setCurrentStep: (currentStep: number) => void;
  calculateTotalFare: () => void;
  resetBooking: () => void;
  setError: (error: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  setQuickBookingData: (route: Route, departureDate: string) => void;
  resetCurrentBooking: () => void;

  // Navigation actions
  nextStep: () => void;
  previousStep: () => void;

  // Seat management
  fetchAvailableSeats: (tripId: string, isReturn?: boolean) => Promise<void>;
  toggleSeatSelection: (seat: Seat, isReturn?: boolean) => Promise<void>;

  // Booking validation and creation
  validateCurrentStep: () => string | null;
  createCustomerBooking: (paymentMethod: string) => Promise<{
    bookingId: string;
    returnBookingId: string | null;
    booking_number: string;
    return_booking_number?: string | null;
  }>;
}

interface ExtendedBookingStoreState extends BookingStoreState {
  availableSeats: Seat[];
  availableReturnSeats: Seat[];
}

interface BookingStore extends ExtendedBookingStoreState, BookingStoreActions {}

// QR Code utilities
const generateBookingQrCodeUrl = (booking: any) => {
  try {
    // Generate QR code URL using the auto-generated booking number
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`Booking: ${booking.booking_number}`)}`;
  } catch (error) {
    return '';
  }
};

const updateBookingWithQrCode = async (
  bookingId: string,
  qrCodeUrl: string,
  maxRetries: number = 3
) => {
  let success = false;
  let attempts = 0;

  while (!success && attempts < maxRetries) {
    attempts++;

    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({ qr_code_url: qrCodeUrl })
        .eq('id', bookingId)
        .select('id, qr_code_url, booking_number');

      if (error) {
        if (attempts < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500 * attempts));
        }
      } else {
        success = true;

        // Verify the QR code was stored
        await new Promise(resolve => setTimeout(resolve, 200));

        const { data: verifyData, error: verifyError } = await supabase
          .from('bookings')
          .select('qr_code_url')
          .eq('id', bookingId)
          .single();

        if (verifyError || !verifyData.qr_code_url) {
          success = false;
        }
      }
    } catch (error) {
      if (attempts < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500 * attempts));
      }
    }
  }

  return success;
};

export const useBookingStore = create<BookingStore>((set, get) => ({
  // State
  currentBooking: { ...initialCurrentBooking },
  currentStep: 1,
  isLoading: false,
  error: null,
  availableSeats: [],
  availableReturnSeats: [],

  // Customer booking actions
  setTripType: (tripType: TripType) => {
    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        tripType,
        returnDate:
          tripType === 'one_way' ? null : state.currentBooking.returnDate,
        returnTrip:
          tripType === 'one_way' ? null : state.currentBooking.returnTrip,
        returnSelectedSeats:
          tripType === 'one_way'
            ? []
            : state.currentBooking.returnSelectedSeats,
      },
    }));
    get().calculateTotalFare();
  },

  setDepartureDate: (date: string) => {
    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        departureDate: date,
        trip: null, // Reset trip when date changes
        selectedSeats: [], // Reset selected seats
      },
    }));
  },

  setReturnDate: (date: string) => {
    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        returnDate: date,
        returnTrip: null, // Reset return trip when date changes
        returnSelectedSeats: [], // Reset return selected seats
      },
    }));
  },

  setRoute: (route: Route) => {
    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        route,
        trip: null, // Reset trip when route changes
        selectedSeats: [], // Reset selected seats
      },
    }));
    get().calculateTotalFare();
  },

  setReturnRoute: (route: Route) => {
    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        returnRoute: route,
        returnTrip: null, // Reset return trip when route changes
        returnSelectedSeats: [], // Reset return selected seats
      },
    }));
    get().calculateTotalFare();
  },

  setTrip: (trip: Trip | null) => {
    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        trip,
        selectedSeats: [], // Reset selected seats when trip changes
        // Update passengers array to match selected seats count
        passengers:
          state.currentBooking.selectedSeats.length > 0
            ? state.currentBooking.selectedSeats.map((_, index) => ({
                fullName:
                  state.currentBooking.passengers[index]?.fullName || '',
                idNumber:
                  state.currentBooking.passengers[index]?.idNumber || '',
                specialAssistance:
                  state.currentBooking.passengers[index]?.specialAssistance ||
                  '',
              }))
            : state.currentBooking.passengers,
      },
    }));

    // Fetch seats for the new trip
    if (trip?.id) {
      get().fetchAvailableSeats(trip.id, false);
    }
  },

  setReturnTrip: (trip: Trip | null) => {
    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        returnTrip: trip,
        returnSelectedSeats: [], // Reset return selected seats when trip changes
      },
    }));

    // Fetch return seats for the new trip
    if (trip?.id) {
      get().fetchAvailableSeats(trip.id, true);
    }
  },

  updatePassengers: (passengers: Passenger[]) => {
    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        passengers,
      },
    }));
  },

  setCurrentStep: (currentStep: number) => {
    set({ currentStep });
  },

  calculateTotalFare: () => {
    const { currentBooking } = get();

    // Only calculate fare if we have the minimum required data
    if (!currentBooking.route) {
      set(state => ({
        currentBooking: {
          ...state.currentBooking,
          totalFare: 0,
        },
      }));
      return;
    }

    const fareCalculation = calculateBookingFare(
      currentBooking.route,
      currentBooking.returnRoute,
      currentBooking.selectedSeats,
      currentBooking.returnSelectedSeats,
      currentBooking.tripType
    );

    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        totalFare: fareCalculation.totalFare,
      },
    }));
  },

  resetBooking: () => {
    set({
      currentBooking: { ...initialCurrentBooking },
      error: null,
      currentStep: 1,
      availableSeats: [],
      availableReturnSeats: [],
    });
  },

  setError: (error: string | null) => set({ error }),

  setLoading: (isLoading: boolean) => set({ isLoading }),

  setQuickBookingData: (route: Route, departureDate: string) => {
    set(state => ({
      currentBooking: {
        ...state.currentBooking,
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
      },
    }));
    get().calculateTotalFare();
  },

  resetCurrentBooking: () => {
    set(state => ({
      currentBooking: { ...initialCurrentBooking },
    }));
  },

  // Navigation actions
  nextStep: () => {
    const { currentStep } = get();
    const error = get().validateCurrentStep();
    if (error) {
      set({ error });
      return;
    }
    set({ currentStep: currentStep + 1, error: null });
  },

  previousStep: () => {
    const { currentStep } = get();
    if (currentStep > 1) {
      set({ currentStep: currentStep - 1, error: null });
    }
  },

  // Seat management
  fetchAvailableSeats: async (tripId: string, isReturn = false) => {
    const { setError, setLoading } = get();
    setLoading(true);
    setError(null);

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
        set(state => ({
          [isReturn ? 'availableReturnSeats' : 'availableSeats']: [],
        }));
        return;
      }

      // Get seat reservations for this trip
      const { data: seatReservations, error: reservationsError } =
        await supabase
          .from('seat_reservations')
          .select(
            `
                    id,
                    trip_id,
                    seat_id,
                    is_available,
                    is_reserved,
                    booking_id,
                    reservation_expiry
                `
          )
          .eq('trip_id', tripId);

      if (reservationsError) throw reservationsError;

      // Create a map of seat reservations for quick lookup
      const reservationMap = new Map();
      (seatReservations || []).forEach(reservation => {
        reservationMap.set(reservation.seat_id, reservation);
      });

      // Process all vessel seats and match with reservations
      const allSeats: Seat[] = allVesselSeats.map(vesselSeat => {
        const reservation = reservationMap.get(vesselSeat.id);

        let isAvailable = true;

        if (reservation) {
          isAvailable = reservation.is_available && !reservation.booking_id;

          // Handle temporary reservations
          if (reservation.is_reserved && reservation.reservation_expiry) {
            const expiryTime = new Date(reservation.reservation_expiry);
            const currentTime = new Date();

            if (currentTime > expiryTime) {
              isAvailable = reservation.is_available && !reservation.booking_id;
            } else {
              isAvailable = false;
            }
          }
        }

        return {
          id: vesselSeat.id,
          number: String(vesselSeat.seat_number || ''),
          rowNumber: Number(vesselSeat.row_number || 0),
          isWindow: Boolean(vesselSeat.is_window),
          isAisle: Boolean(vesselSeat.is_aisle),
          isAvailable,
          isSelected: false,
        };
      });

      // Update state with all seats
      set(state => ({
        [isReturn ? 'availableReturnSeats' : 'availableSeats']: allSeats,
      }));
    } catch (error: any) {
      setError('Failed to fetch seats. Please try again.');
    } finally {
      setLoading(false);
    }
  },

  toggleSeatSelection: async (seat: Seat, isReturn = false) => {
    const { currentBooking } = get();
    const currentSeats = isReturn
      ? currentBooking.returnSelectedSeats
      : currentBooking.selectedSeats;
    const isSelected = currentSeats.some(s => s.id === seat.id);

    if (isSelected) {
      // Remove seat
      const updatedSeats = currentSeats.filter(s => s.id !== seat.id);
      set(state => ({
        currentBooking: {
          ...state.currentBooking,
          [isReturn ? 'returnSelectedSeats' : 'selectedSeats']: updatedSeats,
          passengers: isReturn
            ? state.currentBooking.passengers
            : updatedSeats.map((_, index) => ({
                fullName:
                  state.currentBooking.passengers[index]?.fullName || '',
                idNumber:
                  state.currentBooking.passengers[index]?.idNumber || '',
                specialAssistance:
                  state.currentBooking.passengers[index]?.specialAssistance ||
                  '',
              })),
        },
      }));
    } else {
      // Add seat
      const updatedSeats = [...currentSeats, { ...seat, isSelected: true }];
      set(state => ({
        currentBooking: {
          ...state.currentBooking,
          [isReturn ? 'returnSelectedSeats' : 'selectedSeats']: updatedSeats,
          passengers: isReturn
            ? state.currentBooking.passengers
            : updatedSeats.map((_, index) => ({
                fullName:
                  state.currentBooking.passengers[index]?.fullName || '',
                idNumber:
                  state.currentBooking.passengers[index]?.idNumber || '',
                specialAssistance:
                  state.currentBooking.passengers[index]?.specialAssistance ||
                  '',
              })),
        },
      }));
    }

    // Update available seats to reflect the change
    const availableSeats = isReturn
      ? get().availableReturnSeats
      : get().availableSeats;
    const updatedAvailableSeats = availableSeats.map(s =>
      s.id === seat.id ? { ...s, isSelected: !isSelected } : s
    );

    set(state => ({
      [isReturn ? 'availableReturnSeats' : 'availableSeats']:
        updatedAvailableSeats,
    }));

    get().calculateTotalFare();
  },

  // Validation for customer bookings
  validateCurrentStep: () => {
    const { currentBooking, currentStep } = get();

    switch (currentStep) {
      case 1: // Route & Date
        if (!currentBooking.route) return 'Please select a departure route';
        if (!currentBooking.departureDate)
          return 'Please select a departure date';
        if (currentBooking.tripType === 'round_trip') {
          if (!currentBooking.returnRoute)
            return 'Please select a return route';
          if (!currentBooking.returnDate) return 'Please select a return date';
        }
        break;

      case 2: // Trip Selection
        if (!currentBooking.trip) return 'Please select a departure trip';
        if (
          currentBooking.tripType === 'round_trip' &&
          !currentBooking.returnTrip
        ) {
          return 'Please select a return trip';
        }
        break;

      case 3: // Seat Selection
        if (!currentBooking.selectedSeats.length)
          return 'Please select at least one seat';
        if (
          currentBooking.tripType === 'round_trip' &&
          !currentBooking.returnSelectedSeats.length
        ) {
          return 'Please select return seats';
        }
        if (
          currentBooking.tripType === 'round_trip' &&
          currentBooking.selectedSeats.length !==
            currentBooking.returnSelectedSeats.length
        ) {
          return 'Number of departure and return seats must match';
        }
        break;

      case 4: // Passenger Details
        if (currentBooking.passengers.some(p => !p.fullName)) {
          return 'Please provide names for all passengers';
        }
        break;

      case 5: // Payment (handled by booking operations store)
        break;
    }

    return null;
  },

  createCustomerBooking: async (paymentMethod: string) => {
    try {
      set({ isLoading: true, error: null });

      const { currentBooking } = get();
      const {
        route,
        trip,
        returnRoute,
        returnTrip,
        selectedSeats,
        returnSelectedSeats,
        passengers,
        tripType,
      } = currentBooking;

      if (!route || !trip || !selectedSeats.length || !passengers.length) {
        throw new Error('Incomplete booking information');
      }

      // For round trip, check return trip requirements
      if (
        tripType === 'round_trip' &&
        (!returnRoute || !returnTrip || !returnSelectedSeats.length)
      ) {
        throw new Error('Incomplete return trip information');
      }

      // Get current authenticated user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('User must be authenticated to create booking');
      }

      // Create the main booking first with user_id for RLS policy
      const bookingData = {
        user_id: user.id, // Required for RLS policy
        trip_id: trip.id,
        total_fare: selectedSeats.length * (route.baseFare || 0), // Only departure fare
        payment_method_type: paymentMethod,
        status: 'pending_payment' as const, // Start with pending_payment like booking operations
        is_round_trip: tripType === 'round_trip',
        check_in_status: false, // Initialize check-in status
      };

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select('id, booking_number, status')
        .single();

      if (bookingError) {
        throw new Error(`Failed to create booking: ${bookingError.message}`);
      }

      // Generate QR code URL for customer booking
      const qrCodeUrl = generateBookingQrCodeUrl(booking);

      // Update booking with QR code
      await updateBookingWithQrCode(booking.id, qrCodeUrl);

      // Create passengers and seat reservations for main booking
      const passengerInserts = passengers.map((passenger, index) => ({
        booking_id: booking.id,
        seat_id: selectedSeats[index]?.id,
        passenger_name: passenger.fullName,
        passenger_contact_number: passenger.idNumber || '',
        special_assistance_request: passenger.specialAssistance || null,
      }));

      const { error: passengersError } = await supabase
        .from('passengers')
        .insert(passengerInserts);

      if (passengersError) {
        // Clean up booking if passenger creation fails
        await supabase.from('bookings').delete().eq('id', booking.id);
        throw new Error(
          `Failed to create passengers: ${passengersError.message}`
        );
      }

      // Reserve seats
      const seatReservations = selectedSeats.map(seat => ({
        trip_id: trip.id,
        seat_id: seat.id,
        booking_id: booking.id,
        is_available: false,
        is_reserved: false,
      }));

      const { error: seatError } = await supabase
        .from('seat_reservations')
        .upsert(seatReservations, { onConflict: 'trip_id,seat_id' });

      if (seatError) {
        // Clean up booking and passengers if seat reservation fails
        await supabase.from('passengers').delete().eq('booking_id', booking.id);
        await supabase.from('bookings').delete().eq('id', booking.id);
        throw new Error(`Failed to reserve seats: ${seatError.message}`);
      }

      // Handle payment based on method
      if (paymentMethod === 'mib') {
        // For MIB, create pending payment record and process payment
        const { error: paymentError } = await supabase.from('payments').insert({
          booking_id: booking.id,
          payment_method: paymentMethod as PaymentMethod,
          amount: selectedSeats.length * (route.baseFare || 0),
          currency: 'MVR',
          status: 'pending', // Start with pending for MIB
        });

        if (paymentError) {
          console.warn('Failed to create payment record:', paymentError);
        }

        // Update booking status to pending_payment for MIB
        const { error: statusUpdateError } = await supabase
          .from('bookings')
          .update({
            status: 'pending_payment',
            payment_method_type: 'mib',
          })
          .eq('id', booking.id);

        if (statusUpdateError) {
          console.warn(
            'Failed to update booking status to pending_payment:',
            statusUpdateError
          );
        }

        // Small delay to ensure database transaction is committed
        await new Promise(resolve => setTimeout(resolve, 500));

        // Return booking ID and booking number for MIB payment processing
        set({ isLoading: false });
        return {
          bookingId: booking.id,
          returnBookingId: null,
          booking_number: booking.booking_number,
        };
      } else {
        // For other payment methods, mark as completed immediately
        const { error: paymentError } = await supabase.from('payments').insert({
          booking_id: booking.id,
          payment_method: paymentMethod as PaymentMethod,
          amount: selectedSeats.length * (route.baseFare || 0),
          currency: 'MVR',
          status: 'completed', // Mark as completed for immediate confirmation
        });

        if (paymentError) {
          console.warn('Failed to create payment record:', paymentError);
        }

        // Update booking status to confirmed after successful payment
        const { error: statusUpdateError } = await supabase
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('id', booking.id);

        if (statusUpdateError) {
          // Status update failed - may be trigger function warning (non-critical)
        }
      }

      let returnBookingId = null;
      let returnBookingNumber = null;

      // Handle return trip if round trip
      if (
        tripType === 'round_trip' &&
        returnTrip &&
        returnRoute &&
        returnSelectedSeats.length > 0
      ) {
        const returnBookingData = {
          user_id: user.id, // Required for RLS policy
          trip_id: returnTrip.id,
          total_fare: returnSelectedSeats.length * (returnRoute.baseFare || 0),
          payment_method_type: paymentMethod,
          status: 'pending_payment' as const, // Start with pending_payment like booking operations
          is_round_trip: true,
          check_in_status: false, // Initialize check-in status
        };

        const { data: returnBooking, error: returnBookingError } =
          await supabase
            .from('bookings')
            .insert(returnBookingData)
            .select('id, booking_number, status')
            .single();

        if (returnBookingError) {
          // Don't fail the main booking for return trip issues
        } else {
          returnBookingId = returnBooking.id;
          returnBookingNumber = returnBooking.booking_number;

          // Generate return QR code URL
          const returnQrCodeUrl = generateBookingQrCodeUrl(returnBooking);

          // Update return booking with QR code
          await updateBookingWithQrCode(returnBooking.id, returnQrCodeUrl);

          // Create passengers for return trip
          const returnPassengerInserts = passengers.map((passenger, index) => ({
            booking_id: returnBooking.id,
            seat_id: returnSelectedSeats[index]?.id,
            passenger_name: passenger.fullName,
            passenger_contact_number: passenger.idNumber || '',
            special_assistance_request: passenger.specialAssistance || null,
          }));

          const { error: returnPassengersError } = await supabase
            .from('passengers')
            .insert(returnPassengerInserts);

          if (returnPassengersError) {
            // Return passenger creation failed - non-critical
          }

          // Reserve return seats
          const returnSeatReservations = returnSelectedSeats.map(seat => ({
            trip_id: returnTrip.id,
            seat_id: seat.id,
            booking_id: returnBooking.id,
            is_available: false,
            is_reserved: false,
          }));

          const { error: returnSeatError } = await supabase
            .from('seat_reservations')
            .upsert(returnSeatReservations, { onConflict: 'trip_id,seat_id' });

          if (returnSeatError) {
            // Return seat reservation failed - non-critical
          }

          // Create payment record for return trip
          const { error: returnPaymentError } = await supabase
            .from('payments')
            .insert({
              booking_id: returnBooking.id,
              payment_method: paymentMethod as PaymentMethod,
              amount: returnSelectedSeats.length * (returnRoute.baseFare || 0),
              currency: 'MVR',
              status: paymentMethod === 'mib' ? 'pending' : 'completed', // Pending for MIB, completed for others
            });

          if (returnPaymentError) {
            // Return payment record creation failed - non-critical
          }

          // Update return booking status to confirmed after successful payment
          const { error: returnStatusUpdateError } = await supabase
            .from('bookings')
            .update({ status: 'confirmed' })
            .eq('id', returnBooking.id);

          if (returnStatusUpdateError) {
            // Return status update failed - may be trigger function warning (non-critical)
          }
        }
      }

      set({ isLoading: false });
      return {
        bookingId: booking.id,
        returnBookingId,
        booking_number: booking.booking_number,
        return_booking_number: returnBookingNumber,
      };
    } catch (error: any) {
      set({
        error: error.message || 'Failed to create booking',
        isLoading: false,
      });
      throw error;
    }
  },
}));
