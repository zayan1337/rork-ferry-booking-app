import { create } from 'zustand';
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
}

interface BookingStore extends BookingStoreState, BookingStoreActions { }

export const useBookingStore = create<BookingStore>((set, get) => ({
    // State
    currentBooking: { ...initialCurrentBooking },
    currentStep: 1,
    isLoading: false,
    error: null,

    // Actions
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

    setTrip: (trip: Trip | null) => {
        set((state) => ({
            currentBooking: {
                ...state.currentBooking,
                trip,
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
    },

    setReturnTrip: (trip: Trip | null) => {
        set((state) => ({
            currentBooking: {
                ...state.currentBooking,
                returnTrip: trip
            }
        }));
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
                totalFare
            }
        }));
    },

    resetBooking: () => {
        set({
            currentBooking: { ...initialCurrentBooking },
            error: null,
            currentStep: 1,
        });
    },

    setError: (error: string | null) => set({ error }),

    setLoading: (isLoading: boolean) => set({ isLoading }),

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

    resetCurrentBooking: () => {
        set((state) => ({
            currentBooking: { ...initialCurrentBooking }
        }));
    },
})); 