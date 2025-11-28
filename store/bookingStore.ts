import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import type {
  BookingStoreState,
  CurrentBooking,
  TripType,
  Trip,
} from '@/types/booking';
import type { Route, Seat, Passenger, PaymentMethod } from '@/types';
import type { RouteStop } from '@/types/multiStopRoute';
import {
  confirmSeatReservations,
  cleanupUserTempReservations,
} from '@/utils/realtimeSeatReservation';
import {
  getEffectiveSegmentFare,
  createBookingSegment,
  calculateSegmentFareWithSeats,
} from '@/utils/segmentBookingUtils';
import { validateTripForBooking } from '@/utils/bookingUtils';
import { BOOKING_BUFFER_MINUTES } from '@/constants/customer';

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
  // Multi-stop segment information (island selection)
  boardingIslandId: null,
  boardingIslandName: null,
  destinationIslandId: null,
  destinationIslandName: null,
  returnBoardingIslandId: null,
  returnBoardingIslandName: null,
  returnDestinationIslandId: null,
  returnDestinationIslandName: null,
  // Stop information (determined after selecting trip)
  boardingStop: null,
  destinationStop: null,
  returnBoardingStop: null,
  returnDestinationStop: null,
  segmentFare: null,
  returnSegmentFare: null,
  outboundLegFare: 0,
  returnLegFare: 0,
};

interface BookingStoreActions {
  // Customer booking actions
  setTripType: (tripType: TripType) => void;
  setDepartureDate: (date: string) => void;
  setReturnDate: (date: string) => void;
  setRoute: (route: Route | null) => void;
  setReturnRoute: (route: Route | null) => void;
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

  // Multi-stop island selection actions
  setBoardingIsland: (
    islandId: string | null,
    islandName: string | null
  ) => void;
  setDestinationIsland: (
    islandId: string | null,
    islandName: string | null
  ) => void;
  setReturnBoardingIsland: (
    islandId: string | null,
    islandName: string | null
  ) => void;
  setReturnDestinationIsland: (
    islandId: string | null,
    islandName: string | null
  ) => void;

  // Multi-stop segment actions (used after trip selection)
  setBoardingStop: (stop: RouteStop | null) => void;
  setDestinationStop: (stop: RouteStop | null) => void;
  setReturnBoardingStop: (stop: RouteStop | null) => void;
  setReturnDestinationStop: (stop: RouteStop | null) => void;
  setSegmentFare: (fare: number | null) => void;
  setReturnSegmentFare: (fare: number | null) => void;
  fetchSegmentFare: () => Promise<void>;
  fetchReturnSegmentFare: () => Promise<void>;

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

  setRoute: (route: Route | null) => {
    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        route,
        trip: null, // Reset trip when route changes
        selectedSeats: [], // Reset selected seats
        boardingStop: null, // Reset segment selection
        destinationStop: null,
        segmentFare: null,
      },
    }));
    get().calculateTotalFare();
  },

  setReturnRoute: (route: Route | null) => {
    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        returnRoute: route,
        returnTrip: null, // Reset return trip when route changes
        returnSelectedSeats: [], // Reset return selected seats
        returnBoardingStop: null, // Reset return segment selection
        returnDestinationStop: null,
        returnSegmentFare: null,
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

    // Check if we're using multi-stop segments
    const useSegments =
      currentBooking.boardingStop && currentBooking.destinationStop;
    const useReturnSegments =
      currentBooking.returnBoardingStop && currentBooking.returnDestinationStop;

    let outboundLegFare = 0;
    let returnLegFare = 0;

    // Calculate departure fare
    if (currentBooking.trip && currentBooking.selectedSeats.length > 0) {
      if (useSegments && currentBooking.segmentFare !== null) {
        // Use segment-based fare
        outboundLegFare = calculateSegmentFareWithSeats(
          currentBooking.segmentFare,
          currentBooking.selectedSeats,
          1.0 // Segment fare already includes trip multiplier
        );
      } else {
        // Fall back to legacy route-based fare
        // Use route.base_fare if available, otherwise fall back to trip.base_fare
        const baseFare =
          currentBooking.trip.route?.base_fare ||
          currentBooking.trip.base_fare ||
          0;
        const tripFare =
          baseFare * (currentBooking.trip.fare_multiplier || 1.0);
        outboundLegFare = currentBooking.selectedSeats.reduce((sum, seat) => {
          const seatMultiplier = seat.priceMultiplier || 1.0;
          return sum + tripFare * seatMultiplier;
        }, 0);
      }
    }

    // Calculate return fare
    if (
      currentBooking.tripType === 'round_trip' &&
      currentBooking.returnTrip &&
      currentBooking.returnSelectedSeats.length > 0
    ) {
      if (useReturnSegments && currentBooking.returnSegmentFare !== null) {
        // Use segment-based fare for return trip
        returnLegFare = calculateSegmentFareWithSeats(
          currentBooking.returnSegmentFare,
          currentBooking.returnSelectedSeats,
          1.0 // Segment fare already includes trip multiplier
        );
      } else {
        // Fall back to legacy route-based fare for return trip
        // Use route.base_fare if available, otherwise fall back to trip.base_fare
        const returnBaseFare =
          currentBooking.returnTrip.route?.base_fare ||
          currentBooking.returnTrip.base_fare ||
          0;
        const returnTripFare =
          returnBaseFare * (currentBooking.returnTrip.fare_multiplier || 1.0);
        returnLegFare = currentBooking.returnSelectedSeats.reduce(
          (sum, seat) => {
            const seatMultiplier = seat.priceMultiplier || 1.0;
            return sum + returnTripFare * seatMultiplier;
          },
          0
        );
      }
    }

    const totalFare = outboundLegFare + returnLegFare;

    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        totalFare,
        outboundLegFare,
        returnLegFare,
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
        departureDate,
        // Extract and set island IDs and names from the route
        boardingIslandId: route.fromIsland?.id || null,
        boardingIslandName: route.fromIsland?.name || null,
        destinationIslandId: route.toIsland?.id || null,
        destinationIslandName: route.toIsland?.name || null,
        returnRoute: null,
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

  // Multi-stop island selection actions
  setBoardingIsland: (islandId: string | null, islandName: string | null) => {
    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        boardingIslandId: islandId,
        boardingIslandName: islandName,
        destinationIslandId: null, // Reset destination when boarding changes
        destinationIslandName: null,
        route: null,
        trip: null,
        boardingStop: null,
        destinationStop: null,
        selectedSeats: [],
        segmentFare: null,
      },
    }));
  },

  setDestinationIsland: (
    islandId: string | null,
    islandName: string | null
  ) => {
    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        destinationIslandId: islandId,
        destinationIslandName: islandName,
        route: null,
        trip: null,
        boardingStop: null,
        destinationStop: null,
        selectedSeats: [],
        segmentFare: null,
      },
    }));
  },

  setReturnBoardingIsland: (
    islandId: string | null,
    islandName: string | null
  ) => {
    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        returnBoardingIslandId: islandId,
        returnBoardingIslandName: islandName,
        returnDestinationIslandId: null,
        returnDestinationIslandName: null,
        returnRoute: null,
        returnTrip: null,
        returnBoardingStop: null,
        returnDestinationStop: null,
        returnSelectedSeats: [],
        returnSegmentFare: null,
      },
    }));
  },

  setReturnDestinationIsland: (
    islandId: string | null,
    islandName: string | null
  ) => {
    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        returnDestinationIslandId: islandId,
        returnDestinationIslandName: islandName,
        returnRoute: null,
        returnTrip: null,
        returnBoardingStop: null,
        returnDestinationStop: null,
        returnSelectedSeats: [],
        returnSegmentFare: null,
      },
    }));
  },

  // Multi-stop segment actions (used after trip selection)
  setBoardingStop: (stop: RouteStop | null) => {
    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        boardingStop: stop,
        destinationStop: null, // Reset destination when boarding changes
        selectedSeats: [], // Reset seats when segment changes
        segmentFare: null,
      },
    }));
    get().calculateTotalFare();
  },

  setDestinationStop: (stop: RouteStop | null) => {
    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        destinationStop: stop,
        selectedSeats: [], // Reset seats when segment changes
      },
    }));
    // Fetch segment fare when destination is set
    if (stop) {
      get().fetchSegmentFare();
    }
    get().calculateTotalFare();
  },

  setReturnBoardingStop: (stop: RouteStop | null) => {
    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        returnBoardingStop: stop,
        returnDestinationStop: null, // Reset return destination when boarding changes
        returnSelectedSeats: [], // Reset return seats when segment changes
        returnSegmentFare: null,
      },
    }));
    get().calculateTotalFare();
  },

  setReturnDestinationStop: (stop: RouteStop | null) => {
    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        returnDestinationStop: stop,
        returnSelectedSeats: [], // Reset return seats when segment changes
      },
    }));
    // Fetch return segment fare when destination is set
    if (stop) {
      get().fetchReturnSegmentFare();
    }
    get().calculateTotalFare();
  },

  setSegmentFare: (fare: number | null) => {
    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        segmentFare: fare,
      },
    }));
    get().calculateTotalFare();
  },

  setReturnSegmentFare: (fare: number | null) => {
    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        returnSegmentFare: fare,
      },
    }));
    get().calculateTotalFare();
  },

  fetchSegmentFare: async () => {
    const { currentBooking } = get();
    if (
      !currentBooking.trip?.id ||
      !currentBooking.boardingStop?.id ||
      !currentBooking.destinationStop?.id
    ) {
      return;
    }

    try {
      const fare = await getEffectiveSegmentFare(
        currentBooking.trip.id,
        currentBooking.boardingStop.id,
        currentBooking.destinationStop.id
      );

      set(state => ({
        currentBooking: {
          ...state.currentBooking,
          segmentFare: fare,
        },
      }));

      get().calculateTotalFare();
    } catch (error) {
      console.error('Failed to fetch segment fare:', error);
    }
  },

  fetchReturnSegmentFare: async () => {
    const { currentBooking } = get();
    if (
      !currentBooking.returnTrip?.id ||
      !currentBooking.returnBoardingStop?.id ||
      !currentBooking.returnDestinationStop?.id
    ) {
      return;
    }

    try {
      const fare = await getEffectiveSegmentFare(
        currentBooking.returnTrip.id,
        currentBooking.returnBoardingStop.id,
        currentBooking.returnDestinationStop.id
      );

      set(state => ({
        currentBooking: {
          ...state.currentBooking,
          returnSegmentFare: fare,
        },
      }));

      get().calculateTotalFare();
    } catch (error) {
      console.error('Failed to fetch return segment fare:', error);
    }
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
                    reservation_expiry,
                    is_admin_blocked,
                    temp_reservation_expiry,
                    user_id
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
          // FIRST: Check if admin blocked - always unavailable to customers
          if (reservation.is_admin_blocked) {
            isAvailable = false;
          }
          // SECOND: Check if booked
          else if (reservation.booking_id) {
            isAvailable = false;
          }
          // THIRD: Check if temporarily reserved
          else if (reservation.temp_reservation_expiry) {
            const expiryTime = new Date(reservation.temp_reservation_expiry);
            const currentTime = new Date();

            if (currentTime < expiryTime) {
              // Active temp reservation - unavailable to others
              isAvailable = false;
            } else {
              // Expired temp reservation - available
              isAvailable = reservation.is_available !== false;
            }
          }
          // FOURTH: Check is_available flag
          else {
            isAvailable = reservation.is_available !== false;
          }

          // Handle legacy reservation_expiry (if exists)
          if (
            reservation.reservation_expiry &&
            !reservation.temp_reservation_expiry
          ) {
            const expiryTime = new Date(reservation.reservation_expiry);
            const currentTime = new Date();

            if (currentTime > expiryTime) {
              isAvailable = reservation.is_available !== false;
            } else if (reservation.is_reserved) {
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

        // Validate departure trip status and time
        if (currentBooking.trip) {
          const tripValidation = validateTripForBooking(
            {
              travel_date: currentBooking.trip.travel_date,
              departure_time: currentBooking.trip.departure_time,
              status:
                currentBooking.trip.status ||
                currentBooking.trip.computed_status,
            },
            BOOKING_BUFFER_MINUTES
          );
          if (!tripValidation.isValid) {
            return tripValidation.error || 'Departure trip is not available';
          }
        }

        if (
          currentBooking.tripType === 'round_trip' &&
          !currentBooking.returnTrip
        ) {
          return 'Please select a return trip';
        }

        // Validate return trip status and time
        if (
          currentBooking.tripType === 'round_trip' &&
          currentBooking.returnTrip
        ) {
          const returnValidation = validateTripForBooking(
            {
              travel_date: currentBooking.returnTrip.travel_date,
              departure_time: currentBooking.returnTrip.departure_time,
              status:
                currentBooking.returnTrip.status ||
                currentBooking.returnTrip.computed_status,
            },
            BOOKING_BUFFER_MINUTES
          );
          if (!returnValidation.isValid) {
            return returnValidation.error || 'Return trip is not available';
          }
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

      // Ensure fare calculation is up-to-date before creating booking
      get().calculateTotalFare();

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

      // Validate departure trip before booking
      const departureValidation = validateTripForBooking(
        {
          travel_date: trip.travel_date,
          departure_time: trip.departure_time,
          status: trip.status || trip.computed_status,
        },
        BOOKING_BUFFER_MINUTES
      );

      if (!departureValidation.isValid) {
        throw new Error(
          departureValidation.error ||
            'Departure trip is no longer available for booking.'
        );
      }

      // Validate return trip if round trip
      if (tripType === 'round_trip' && returnTrip) {
        const returnValidation = validateTripForBooking(
          {
            travel_date: returnTrip.travel_date,
            departure_time: returnTrip.departure_time,
            status: returnTrip.status || returnTrip.computed_status,
          },
          BOOKING_BUFFER_MINUTES
        );

        if (!returnValidation.isValid) {
          throw new Error(
            returnValidation.error ||
              'Return trip is no longer available for booking.'
          );
        }
      }

      // Get current authenticated user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('User must be authenticated to create booking');
      }

      // Use the exact calculated fare from the store
      // calculateTotalFare() was called at the start to ensure fresh values
      let outboundLegFare = currentBooking.outboundLegFare || 0;

      // If fare is 0, there might be an issue - recalculate as fallback
      if (outboundLegFare === 0 && selectedSeats.length > 0) {
        console.warn('[Booking Creation] Outbound fare is 0, recalculating...');
        // Recalculate outbound fare as fallback
        const useSegments =
          currentBooking.boardingStop && currentBooking.destinationStop;
        if (useSegments && currentBooking.segmentFare !== null) {
          outboundLegFare = calculateSegmentFareWithSeats(
            currentBooking.segmentFare,
            selectedSeats,
            1.0
          );
        } else {
          // Use route.base_fare if available, otherwise fall back to trip.base_fare
          const baseFare = trip.route?.base_fare || trip.base_fare || 0;
          const tripFare = baseFare * (trip.fare_multiplier || 1.0);
          outboundLegFare = selectedSeats.reduce((sum, seat) => {
            const seatMultiplier = seat.priceMultiplier || 1.0;
            return sum + tripFare * seatMultiplier;
          }, 0);
        }
      }

      // CRITICAL: For round trips, ensure outboundLegFare is NOT the combined total
      // The outbound booking should only store its own leg fare, not the combined total
      const combinedTotalFare = currentBooking.totalFare || 0;
      const returnLegFareFromStore = currentBooking.returnLegFare || 0;

      // Safety check: If outboundLegFare equals the combined total, it's wrong
      // Recalculate it by subtracting the return leg fare
      if (
        tripType === 'round_trip' &&
        returnLegFareFromStore > 0 &&
        Math.abs(outboundLegFare - combinedTotalFare) < 0.01
      ) {
        console.warn(
          '[Booking Creation] Outbound fare appears to be combined total, recalculating...'
        );
        outboundLegFare = combinedTotalFare - returnLegFareFromStore;
      }

      // Final validation: Outbound fare should never exceed combined total for round trips
      if (
        tripType === 'round_trip' &&
        combinedTotalFare > 0 &&
        outboundLegFare > combinedTotalFare
      ) {
        console.error(
          '[Booking Creation] Outbound fare exceeds combined total, using fallback calculation'
        );
        // Recalculate from scratch
        const useSegments =
          currentBooking.boardingStop && currentBooking.destinationStop;
        if (useSegments && currentBooking.segmentFare !== null) {
          outboundLegFare = calculateSegmentFareWithSeats(
            currentBooking.segmentFare,
            selectedSeats,
            1.0
          );
        } else {
          const baseFare = trip.route?.base_fare || trip.base_fare || 0;
          const tripFare = baseFare * (trip.fare_multiplier || 1.0);
          outboundLegFare = selectedSeats.reduce((sum, seat) => {
            const seatMultiplier = seat.priceMultiplier || 1.0;
            return sum + tripFare * seatMultiplier;
          }, 0);
        }
      }

      // The departure booking should store ONLY the outbound leg fare
      const totalFare = outboundLegFare;

      // Debug logging to verify fare values
      console.log('[Booking Creation] Fare values:', {
        outboundLegFare,
        returnLegFare: currentBooking.returnLegFare || 0,
        totalFare: currentBooking.totalFare || 0,
        tripType,
        selectedSeatsCount: selectedSeats.length,
        returnSelectedSeatsCount: returnSelectedSeats.length,
        segmentFare: currentBooking.segmentFare,
        returnSegmentFare: currentBooking.returnSegmentFare,
        tripBaseFare: trip.base_fare,
        tripFareMultiplier: trip.fare_multiplier,
      });

      // Create the main booking first with user_id for RLS policy
      const bookingData = {
        user_id: user.id, // Required for RLS policy
        trip_id: trip.id,
        total_fare: totalFare,
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

      // Create booking segment if using multi-stop
      const useSegments =
        currentBooking.boardingStop && currentBooking.destinationStop;
      if (
        useSegments &&
        currentBooking.boardingStop &&
        currentBooking.destinationStop &&
        currentBooking.segmentFare !== null
      ) {
        try {
          await createBookingSegment(
            booking.id,
            currentBooking.boardingStop.id,
            currentBooking.destinationStop.id,
            currentBooking.boardingStop.stop_sequence,
            currentBooking.destinationStop.stop_sequence,
            currentBooking.segmentFare
          );
        } catch (segmentError) {
          console.error('Failed to create booking segment:', segmentError);
          // Non-critical - continue with booking
        }
      }

      // Resolve fallback contact from booking user's profile
      let fallbackPhone = '' as string;
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('mobile_number')
          .eq('id', user.id)
          .single();
        fallbackPhone = (profile?.mobile_number || '').trim();
      } catch {}

      // Create passengers and seat reservations for main booking
      const passengerInserts = passengers.map((passenger, index) => ({
        booking_id: booking.id,
        seat_id: selectedSeats[index]?.id,
        passenger_name: passenger.fullName,
        passenger_contact_number:
          (passenger.phoneNumber && passenger.phoneNumber.trim()) ||
          fallbackPhone ||
          '',
        passenger_id_proof:
          (passenger.idNumber && passenger.idNumber.trim()) || null,
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

      // Confirm seat reservations using the new real-time system
      const seatIds = selectedSeats.map(seat => seat.id);
      const seatConfirmation = await confirmSeatReservations(
        trip.id,
        seatIds,
        booking.id
      );

      if (
        !seatConfirmation.success ||
        seatConfirmation.failed_seats.length > 0
      ) {
        // Clean up booking and passengers if seat confirmation fails
        await supabase.from('passengers').delete().eq('booking_id', booking.id);
        await supabase.from('bookings').delete().eq('id', booking.id);

        const failedSeatNumbers = selectedSeats
          .filter(seat => seatConfirmation.failed_seats.includes(seat.id))
          .map(seat => seat.number)
          .join(', ');

        throw new Error(
          `Failed to confirm seat reservations. Seats ${failedSeatNumbers} are no longer available. Please select different seats.`
        );
      }

      let returnBookingId = null;
      let returnBookingNumber = null;
      let returnLegTotalFare = 0;

      // Handle return trip if round trip
      if (
        tripType === 'round_trip' &&
        returnTrip &&
        returnRoute &&
        returnSelectedSeats.length > 0
      ) {
        // Use the exact calculated return leg fare from the store
        // calculateTotalFare() was called at the start to ensure fresh values
        returnLegTotalFare = currentBooking.returnLegFare || 0;

        // If fare is 0, there might be an issue - recalculate as fallback
        if (returnLegTotalFare === 0 && returnSelectedSeats.length > 0) {
          console.warn('[Booking Creation] Return fare is 0, recalculating...');
          // Recalculate return fare as fallback
          const useReturnSegments =
            currentBooking.returnBoardingStop !== null &&
            currentBooking.returnDestinationStop !== null;
          if (useReturnSegments && currentBooking.returnSegmentFare !== null) {
            returnLegTotalFare = calculateSegmentFareWithSeats(
              currentBooking.returnSegmentFare,
              returnSelectedSeats,
              1.0
            );
          } else {
            // Use route.base_fare if available, otherwise fall back to trip.base_fare
            const returnBaseFare =
              returnTrip.route?.base_fare || returnTrip.base_fare || 0;
            const returnTripFare =
              returnBaseFare * (returnTrip.fare_multiplier || 1.0);
            returnLegTotalFare = returnSelectedSeats.reduce((sum, seat) => {
              const seatMultiplier = seat.priceMultiplier || 1.0;
              return sum + returnTripFare * seatMultiplier;
            }, 0);
          }
        }

        // Debug logging to verify return fare
        console.log('[Booking Creation] Return booking fare:', {
          returnLegTotalFare,
          returnSelectedSeatsCount: returnSelectedSeats.length,
          returnSegmentFare: currentBooking.returnSegmentFare,
          returnTripBaseFare: returnTrip.base_fare,
          returnTripFareMultiplier: returnTrip.fare_multiplier,
        });

        const returnBookingData = {
          user_id: user.id, // Required for RLS policy
          trip_id: returnTrip.id,
          total_fare: returnLegTotalFare,
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

          // Link departure and return bookings for round-trip management
          try {
            // Verify both bookings have correct individual fares before linking
            const { data: departureBookingCheck } = await supabase
              .from('bookings')
              .select('total_fare')
              .eq('id', booking.id)
              .single();

            // If departure booking fare is incorrect, fix it before linking
            if (
              departureBookingCheck &&
              Math.abs(departureBookingCheck.total_fare - outboundLegFare) >
                0.01
            ) {
              console.warn(
                '[Booking Creation] Departure booking fare mismatch, correcting...',
                {
                  stored: departureBookingCheck.total_fare,
                  expected: outboundLegFare,
                }
              );
              await supabase
                .from('bookings')
                .update({ total_fare: outboundLegFare })
                .eq('id', booking.id);
            }

            // Verify return booking fare is correct
            const { data: returnBookingCheck } = await supabase
              .from('bookings')
              .select('total_fare')
              .eq('id', returnBooking.id)
              .single();

            if (
              returnBookingCheck &&
              Math.abs(returnBookingCheck.total_fare - returnLegTotalFare) >
                0.01
            ) {
              console.warn(
                '[Booking Creation] Return booking fare mismatch, correcting...',
                {
                  stored: returnBookingCheck.total_fare,
                  expected: returnLegTotalFare,
                }
              );
              await supabase
                .from('bookings')
                .update({ total_fare: returnLegTotalFare })
                .eq('id', returnBooking.id);
            }

            // Link the bookings - no trigger will modify fares since we removed it
            await supabase
              .from('bookings')
              .update({
                return_booking_id: returnBooking.id,
                round_trip_group_id: booking.id,
              })
              .eq('id', booking.id);

            await supabase
              .from('bookings')
              .update({
                round_trip_group_id: booking.id,
              })
              .eq('id', returnBooking.id);
          } catch (linkError) {
            console.error('Failed to link round-trip bookings:', linkError);
          }

          // Generate return QR code URL
          const returnQrCodeUrl = generateBookingQrCodeUrl(returnBooking);

          // Update return booking with QR code
          await updateBookingWithQrCode(returnBooking.id, returnQrCodeUrl);

          // Create return booking segment if using multi-stop
          const useReturnSegments =
            currentBooking.returnBoardingStop &&
            currentBooking.returnDestinationStop;
          if (
            useReturnSegments &&
            currentBooking.returnBoardingStop &&
            currentBooking.returnDestinationStop &&
            currentBooking.returnSegmentFare !== null
          ) {
            try {
              await createBookingSegment(
                returnBooking.id,
                currentBooking.returnBoardingStop.id,
                currentBooking.returnDestinationStop.id,
                currentBooking.returnBoardingStop.stop_sequence,
                currentBooking.returnDestinationStop.stop_sequence,
                currentBooking.returnSegmentFare
              );
            } catch (segmentError) {
              console.error(
                'Failed to create return booking segment:',
                segmentError
              );
              // Non-critical - continue with booking
            }
          }

          // Create passengers for return trip
          const returnPassengerInserts = passengers.map((passenger, index) => ({
            booking_id: returnBooking.id,
            seat_id: returnSelectedSeats[index]?.id,
            passenger_name: passenger.fullName,
            passenger_contact_number:
              (passenger.phoneNumber && passenger.phoneNumber.trim()) ||
              fallbackPhone ||
              '',
            passenger_id_proof:
              (passenger.idNumber && passenger.idNumber.trim()) || null,
            special_assistance_request: passenger.specialAssistance || null,
          }));

          const { error: returnPassengersError } = await supabase
            .from('passengers')
            .insert(returnPassengerInserts);

          if (returnPassengersError) {
            // Return passenger creation failed - non-critical
          }

          // Confirm return seat reservations using the new real-time system
          const returnSeatIds = returnSelectedSeats.map(seat => seat.id);
          const returnSeatConfirmation = await confirmSeatReservations(
            returnTrip.id,
            returnSeatIds,
            returnBooking.id
          );

          if (
            !returnSeatConfirmation.success ||
            returnSeatConfirmation.failed_seats.length > 0
          ) {
            // Return seat confirmation failed - log warning but don't fail the main booking
            console.error(
              'Failed to confirm return seat reservations:',
              returnSeatConfirmation
            );
          }

          // Return payment and status updates are handled after main payment logic
        }
      }

      // Handle payment records and status updates for main (and return) bookings
      if (paymentMethod === 'mib') {
        // Use the exact calculated total fare from the store (no recalculation)
        // For round trips, this is the combined total (outbound + return)
        // For one-way trips, this is just the outbound fare
        const paymentAmount = currentBooking.totalFare;

        const { error: paymentError } = await supabase.from('payments').insert({
          booking_id: booking.id,
          payment_method: paymentMethod as PaymentMethod,
          amount: paymentAmount,
          currency: 'MVR',
          status: 'pending',
        });

        if (paymentError) {
          console.error('Failed to create payment record:', paymentError);
        }

        // For round trips, we don't create a separate payment for the return booking
        // The combined amount is already stored in the main booking's payment record
        // The return booking is linked via round_trip_group_id and return_booking_id

        const { error: statusUpdateError } = await supabase
          .from('bookings')
          .update({
            status: 'pending_payment',
            payment_method_type: 'mib',
          })
          .eq('id', booking.id);

        if (statusUpdateError) {
          console.error(
            'Failed to update booking status to pending_payment:',
            statusUpdateError
          );
        }

        if (returnBookingId) {
          const { error: returnStatusUpdateError } = await supabase
            .from('bookings')
            .update({
              status: 'pending_payment',
              payment_method_type: 'mib',
            })
            .eq('id', returnBookingId);

          if (returnStatusUpdateError) {
            console.error(
              'Failed to update return booking status to pending_payment:',
              returnStatusUpdateError
            );
          }
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        const { error: paymentError } = await supabase.from('payments').insert({
          booking_id: booking.id,
          payment_method: paymentMethod as PaymentMethod,
          amount: totalFare,
          currency: 'MVR',
          status: 'completed',
        });

        if (paymentError) {
          console.error('Failed to create payment record:', paymentError);
        }

        const { error: statusUpdateError } = await supabase
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('id', booking.id);

        if (statusUpdateError) {
          // Non-critical warning
        }

        if (returnBookingId) {
          const { error: returnPaymentError } = await supabase
            .from('payments')
            .insert({
              booking_id: returnBookingId,
              payment_method: paymentMethod as PaymentMethod,
              amount: returnLegTotalFare,
              currency: 'MVR',
              status: 'completed',
            });

          if (returnPaymentError) {
            // Non-critical warning
          }

          const { error: returnStatusUpdateError } = await supabase
            .from('bookings')
            .update({ status: 'confirmed' })
            .eq('id', returnBookingId);

          if (returnStatusUpdateError) {
            // Non-critical warning
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
      // Clean up any temporary seat reservations if booking fails
      try {
        const { currentBooking: booking } = get();
        if (booking.trip?.id) {
          await cleanupUserTempReservations(booking.trip.id);
        }
        if (booking.returnTrip?.id) {
          await cleanupUserTempReservations(booking.returnTrip.id);
        }
      } catch (cleanupError) {
        console.error(
          'Failed to cleanup temporary reservations:',
          cleanupError
        );
      }

      set({
        error: error.message || 'Failed to create booking',
        isLoading: false,
      });
      throw error;
    }
  },
}));
