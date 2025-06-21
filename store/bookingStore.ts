import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import type { BookingStoreState, CurrentBooking, TripType, Trip } from '@/types/booking';
import type { Route, Seat, Passenger } from '@/types';

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
}

interface ExtendedBookingStoreState extends BookingStoreState {
    availableSeats: Seat[];
    availableReturnSeats: Seat[];
}

interface BookingStore extends ExtendedBookingStoreState, BookingStoreActions { }

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
        set((state) => ({
            currentBooking: {
                ...state.currentBooking,
                tripType,
                returnDate: tripType === 'one_way' ? null : state.currentBooking.returnDate,
                returnTrip: tripType === 'one_way' ? null : state.currentBooking.returnTrip,
                returnSelectedSeats: tripType === 'one_way' ? [] : state.currentBooking.returnSelectedSeats,
            }
        }));
        get().calculateTotalFare();
    },

    setDepartureDate: (date: string) => {
        set((state) => ({
            currentBooking: {
                ...state.currentBooking,
                departureDate: date,
                trip: null, // Reset trip when date changes
                selectedSeats: [], // Reset selected seats
            }
        }));
    },

    setReturnDate: (date: string) => {
        set((state) => ({
            currentBooking: {
                ...state.currentBooking,
                returnDate: date,
                returnTrip: null, // Reset return trip when date changes
                returnSelectedSeats: [], // Reset return selected seats
            }
        }));
    },

    setRoute: (route: Route) => {
        set((state) => ({
            currentBooking: {
                ...state.currentBooking,
                route,
                trip: null, // Reset trip when route changes
                selectedSeats: [], // Reset selected seats
            }
        }));
        get().calculateTotalFare();
    },

    setReturnRoute: (route: Route) => {
        set((state) => ({
            currentBooking: {
                ...state.currentBooking,
                returnRoute: route,
                returnTrip: null, // Reset return trip when route changes
                returnSelectedSeats: [], // Reset return selected seats
            }
        }));
        get().calculateTotalFare();
    },

    setTrip: (trip: Trip | null) => {
        set((state) => ({
            currentBooking: {
                ...state.currentBooking,
                trip,
                selectedSeats: [], // Reset selected seats when trip changes
                // Update passengers array to match selected seats count
                passengers: state.currentBooking.selectedSeats.length > 0
                    ? state.currentBooking.selectedSeats.map((_, index) => ({
                        fullName: state.currentBooking.passengers[index]?.fullName || '',
                        idNumber: state.currentBooking.passengers[index]?.idNumber || '',
                        specialAssistance: state.currentBooking.passengers[index]?.specialAssistance || '',
                    }))
                    : state.currentBooking.passengers
            }
        }));

        // Fetch seats for the new trip
        if (trip?.id) {
            get().fetchAvailableSeats(trip.id, false);
        }
    },

    setReturnTrip: (trip: Trip | null) => {
        set((state) => ({
            currentBooking: {
                ...state.currentBooking,
                returnTrip: trip,
                returnSelectedSeats: [], // Reset return selected seats when trip changes
            }
        }));

        // Fetch return seats for the new trip
        if (trip?.id) {
            get().fetchAvailableSeats(trip.id, true);
        }
    },

    updatePassengers: (passengers: Passenger[]) => {
        set((state) => ({
            currentBooking: {
                ...state.currentBooking,
                passengers
            }
        }));
    },

    setCurrentStep: (currentStep: number) => {
        set({ currentStep });
    },

    calculateTotalFare: () => {
        const { currentBooking } = get();

        if (!currentBooking.route) {
            set((state) => ({
                currentBooking: {
                    ...state.currentBooking,
                    totalFare: 0
                }
            }));
            return;
        }

        const baseFare = currentBooking.route.baseFare || 0;
        const returnBaseFare = currentBooking.returnRoute?.baseFare || 0;
        const totalFare = (currentBooking.selectedSeats.length * baseFare) +
            (currentBooking.returnSelectedSeats.length * returnBaseFare);

        set((state) => ({
            currentBooking: {
                ...state.currentBooking,
                totalFare,
            }
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
        set((state) => ({
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
            }
        }));
        get().calculateTotalFare();
    },

    resetCurrentBooking: () => {
        set((state) => ({
            currentBooking: { ...initialCurrentBooking }
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
                console.warn(`No seats found for vessel ${tripData.vessel_id}`);
                set(state => ({
                    [isReturn ? 'availableReturnSeats' : 'availableSeats']: []
                }));
                return;
            }

            // Get seat reservations for this trip
            const { data: seatReservations, error: reservationsError } = await supabase
                .from('seat_reservations')
                .select(`
                    id,
                    trip_id,
                    seat_id,
                    is_available,
                    is_reserved,
                    booking_id,
                    reservation_expiry
                `)
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
                    isAvailable: isAvailable,
                    isSelected: false
                };
            });

            // Update state with all seats
            set(state => ({
                [isReturn ? 'availableReturnSeats' : 'availableSeats']: allSeats
            }));

        } catch (error: any) {
            console.error('Error fetching available seats:', error);
            setError('Failed to fetch seats. Please try again.');
        } finally {
            setLoading(false);
        }
    },

    toggleSeatSelection: async (seat: Seat, isReturn = false) => {
        const { currentBooking } = get();
        const currentSeats = isReturn ? currentBooking.returnSelectedSeats : currentBooking.selectedSeats;
        const isSelected = currentSeats.some(s => s.id === seat.id);

        if (isSelected) {
            // Remove seat
            const updatedSeats = currentSeats.filter(s => s.id !== seat.id);
            set(state => ({
                currentBooking: {
                    ...state.currentBooking,
                    [isReturn ? 'returnSelectedSeats' : 'selectedSeats']: updatedSeats,
                    passengers: isReturn ? state.currentBooking.passengers : updatedSeats.map((_, index) => ({
                        fullName: state.currentBooking.passengers[index]?.fullName || '',
                        idNumber: state.currentBooking.passengers[index]?.idNumber || '',
                        specialAssistance: state.currentBooking.passengers[index]?.specialAssistance || '',
                    }))
                }
            }));
        } else {
            // Add seat
            const updatedSeats = [...currentSeats, { ...seat, isSelected: true }];
            set(state => ({
                currentBooking: {
                    ...state.currentBooking,
                    [isReturn ? 'returnSelectedSeats' : 'selectedSeats']: updatedSeats,
                    passengers: isReturn ? state.currentBooking.passengers : updatedSeats.map((_, index) => ({
                        fullName: state.currentBooking.passengers[index]?.fullName || '',
                        idNumber: state.currentBooking.passengers[index]?.idNumber || '',
                        specialAssistance: state.currentBooking.passengers[index]?.specialAssistance || '',
                    }))
                }
            }));
        }

        // Update available seats to reflect the change
        const availableSeats = isReturn ? get().availableReturnSeats : get().availableSeats;
        const updatedAvailableSeats = availableSeats.map(s =>
            s.id === seat.id ? { ...s, isSelected: !isSelected } : s
        );

        set(state => ({
            [isReturn ? 'availableReturnSeats' : 'availableSeats']: updatedAvailableSeats
        }));

        get().calculateTotalFare();
    },

    // Validation for customer bookings
    validateCurrentStep: () => {
        const { currentBooking, currentStep } = get();

        switch (currentStep) {
            case 1: // Route & Date
                if (!currentBooking.route) return 'Please select a departure route';
                if (!currentBooking.departureDate) return 'Please select a departure date';
                if (currentBooking.tripType === 'round_trip') {
                    if (!currentBooking.returnRoute) return 'Please select a return route';
                    if (!currentBooking.returnDate) return 'Please select a return date';
                }
                break;

            case 2: // Trip Selection
                if (!currentBooking.trip) return 'Please select a departure trip';
                if (currentBooking.tripType === 'round_trip' && !currentBooking.returnTrip) {
                    return 'Please select a return trip';
                }
                break;

            case 3: // Seat Selection
                if (!currentBooking.selectedSeats.length) return 'Please select at least one seat';
                if (currentBooking.tripType === 'round_trip' && !currentBooking.returnSelectedSeats.length) {
                    return 'Please select return seats';
                }
                if (currentBooking.tripType === 'round_trip' &&
                    currentBooking.selectedSeats.length !== currentBooking.returnSelectedSeats.length) {
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
})); 