import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Booking, Island, Route, Seat, Passenger } from '@/types';

type BookingState = {
  // Current booking in progress
  currentBooking: {
    tripType: 'one_way' | 'round_trip';
    departureDate: string | null;
    returnDate: string | null;
    route: Route | null;
    returnRoute: Route | null;
    selectedSeats: Seat[];
    returnSelectedSeats: Seat[];
    passengers: Passenger[];
    totalFare: number;
  };
  
  // User's bookings
  bookings: Booking[];
  
  // Available data for booking
  availableIslands: Island[];
  availableRoutes: Route[];
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setTripType: (type: 'one_way' | 'round_trip') => void;
  setDepartureDate: (date: string) => void;
  setReturnDate: (date: string | null) => void;
  setRoute: (route: Route) => void;
  setReturnRoute: (route: Route | null) => void;
  toggleSeatSelection: (seat: Seat, isReturn?: boolean) => void;
  clearSelectedSeats: (isReturn?: boolean) => void;
  updatePassengers: (passengers: Passenger[]) => void;
  calculateTotalFare: () => void;
  resetCurrentBooking: () => void;
  
  // Mock data loading functions
  fetchAvailableIslands: () => Promise<void>;
  fetchAvailableRoutes: () => Promise<void>;
  fetchUserBookings: () => Promise<void>;
  
  // Booking actions
  confirmBooking: (paymentMethod: string) => Promise<Booking>;
  cancelBooking: (bookingId: string, reason: string) => Promise<void>;
};

// Initial state for current booking
const initialCurrentBooking = {
  tripType: 'one_way' as const,
  departureDate: null,
  returnDate: null,
  route: null,
  returnRoute: null,
  selectedSeats: [],
  returnSelectedSeats: [],
  passengers: [],
  totalFare: 0,
};

export const useBookingStore = create<BookingState>()(
  persist(
    (set, get) => ({
      currentBooking: { ...initialCurrentBooking },
      bookings: [],
      availableIslands: [],
      availableRoutes: [],
      isLoading: false,
      error: null,
      
      // Trip type selection
      setTripType: (type) => {
        set((state) => ({
          currentBooking: {
            ...state.currentBooking,
            tripType: type,
            // Reset return-related fields if switching to one-way
            ...(type === 'one_way' && {
              returnDate: null,
              returnRoute: null,
              returnSelectedSeats: [],
            }),
          },
        }));
        get().calculateTotalFare();
      },
      
      // Date selection
      setDepartureDate: (date) => {
        set((state) => ({
          currentBooking: {
            ...state.currentBooking,
            departureDate: date,
          },
        }));
      },
      
      setReturnDate: (date) => {
        set((state) => ({
          currentBooking: {
            ...state.currentBooking,
            returnDate: date,
          },
        }));
      },
      
      // Route selection
      setRoute: (route) => {
        set((state) => ({
          currentBooking: {
            ...state.currentBooking,
            route,
            // Clear selected seats when route changes
            selectedSeats: [],
          },
        }));
        get().calculateTotalFare();
      },
      
      setReturnRoute: (route) => {
        set((state) => ({
          currentBooking: {
            ...state.currentBooking,
            returnRoute: route,
            // Clear return selected seats when return route changes
            returnSelectedSeats: [],
          },
        }));
        get().calculateTotalFare();
      },
      
      // Seat selection
      toggleSeatSelection: (seat, isReturn = false) => {
        set((state) => {
          const seatKey = isReturn ? 'returnSelectedSeats' : 'selectedSeats';
          const currentSeats = state.currentBooking[seatKey];
          
          // Check if seat is already selected
          const isAlreadySelected = currentSeats.some(s => s.id === seat.id);
          
          // Toggle selection
          const updatedSeats = isAlreadySelected
            ? currentSeats.filter(s => s.id !== seat.id)
            : [...currentSeats, { ...seat, isSelected: true }];
          
          return {
            currentBooking: {
              ...state.currentBooking,
              [seatKey]: updatedSeats,
              // Reset passengers if seat count changes
              ...(seatKey === 'selectedSeats' && {
                passengers: updatedSeats.map(() => ({ fullName: "" })),
              }),
            },
          };
        });
        get().calculateTotalFare();
      },
      
      clearSelectedSeats: (isReturn = false) => {
        set((state) => {
          const seatKey = isReturn ? 'returnSelectedSeats' : 'selectedSeats';
          return {
            currentBooking: {
              ...state.currentBooking,
              [seatKey]: [],
              ...(seatKey === 'selectedSeats' && { passengers: [] }),
            },
          };
        });
        get().calculateTotalFare();
      },
      
      // Passenger details
      updatePassengers: (passengers) => {
        set((state) => ({
          currentBooking: {
            ...state.currentBooking,
            passengers,
          },
        }));
      },
      
      // Fare calculation
      calculateTotalFare: () => {
        set((state) => {
          const { route, returnRoute, selectedSeats, returnSelectedSeats } = state.currentBooking;
          
          let totalFare = 0;
          
          // Add departure fare
          if (route && selectedSeats.length > 0) {
            totalFare += route.baseFare * selectedSeats.length;
          }
          
          // Add return fare if applicable
          if (returnRoute && returnSelectedSeats.length > 0) {
            totalFare += returnRoute.baseFare * returnSelectedSeats.length;
          }
          
          return {
            currentBooking: {
              ...state.currentBooking,
              totalFare,
            },
          };
        });
      },
      
      resetCurrentBooking: () => {
        set({ currentBooking: { ...initialCurrentBooking } });
      },
      
      // Mock data fetching functions
      fetchAvailableIslands: async () => {
        set({ isLoading: true, error: null });
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const mockIslands: Island[] = [
            { id: "1", name: "Malé", zone: "Central" },
            { id: "2", name: "Hulhumalé", zone: "Central" },
            { id: "3", name: "Maafushi", zone: "South" },
            { id: "4", name: "Thulusdhoo", zone: "North" },
            { id: "5", name: "Dhiffushi", zone: "North" },
            { id: "6", name: "Gulhi", zone: "South" },
          ];
          
          set({ availableIslands: mockIslands, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : "Failed to fetch islands", 
            isLoading: false 
          });
        }
      },
      
      fetchAvailableRoutes: async () => {
        set({ isLoading: true, error: null });
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const { availableIslands } = get();
          
          if (availableIslands.length === 0) {
            await get().fetchAvailableIslands();
          }
          
          const islands = get().availableIslands;
          
          const mockRoutes: Route[] = [
            { 
              id: "1", 
              fromIsland: islands[0], 
              toIsland: islands[1], 
              baseFare: 25, 
              duration: "0h 30m" 
            },
            { 
              id: "2", 
              fromIsland: islands[0], 
              toIsland: islands[2], 
              baseFare: 50, 
              duration: "1h 30m" 
            },
            { 
              id: "3", 
              fromIsland: islands[0], 
              toIsland: islands[3], 
              baseFare: 45, 
              duration: "1h 15m" 
            },
            { 
              id: "4", 
              fromIsland: islands[1], 
              toIsland: islands[0], 
              baseFare: 25, 
              duration: "0h 30m" 
            },
            { 
              id: "5", 
              fromIsland: islands[2], 
              toIsland: islands[0], 
              baseFare: 50, 
              duration: "1h 30m" 
            },
          ];
          
          set({ availableRoutes: mockRoutes, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : "Failed to fetch routes", 
            isLoading: false 
          });
        }
      },
      
      fetchUserBookings: async () => {
        set({ isLoading: true, error: null });
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const { availableRoutes } = get();
          
          if (availableRoutes.length === 0) {
            await get().fetchAvailableRoutes();
          }
          
          const routes = get().availableRoutes;
          
          const mockBookings: Booking[] = [
            {
              id: "1",
              bookingNumber: "1234567",
              tripType: "one_way",
              departureDate: "2025-06-15",
              departureTime: "09:00",
              route: routes[0],
              seats: [
                { id: "A1", number: "A1", isAvailable: false, isSelected: true },
                { id: "A2", number: "A2", isAvailable: false, isSelected: true }
              ],
              passengers: [
                { fullName: "John Doe" },
                { fullName: "Jane Doe" }
              ],
              totalFare: 50,
              status: "confirmed",
              paymentStatus: "paid",
              paymentMethod: "bml",
              createdAt: "2025-06-03T10:30:00Z"
            },
            {
              id: "2",
              bookingNumber: "2345678",
              tripType: "round_trip",
              departureDate: "2025-07-10",
              departureTime: "10:00",
              returnDate: "2025-07-15",
              returnTime: "16:00",
              route: routes[1],
              returnRoute: routes[4],
              seats: [
                { id: "B3", number: "B3", isAvailable: false, isSelected: true }
              ],
              returnSeats: [
                { id: "C5", number: "C5", isAvailable: false, isSelected: true }
              ],
              passengers: [
                { fullName: "Alice Smith" }
              ],
              totalFare: 100,
              status: "confirmed",
              paymentStatus: "paid",
              paymentMethod: "ooredoo",
              createdAt: "2025-06-01T14:45:00Z"
            },
            {
              id: "3",
              bookingNumber: "3456789",
              tripType: "one_way",
              departureDate: "2025-05-20",
              departureTime: "08:30",
              route: routes[2],
              seats: [
                { id: "D7", number: "D7", isAvailable: false, isSelected: true }
              ],
              passengers: [
                { fullName: "Bob Johnson" }
              ],
              totalFare: 45,
              status: "completed",
              paymentStatus: "paid",
              paymentMethod: "bank_transfer",
              createdAt: "2025-05-15T09:20:00Z"
            }
          ];
          
          set({ bookings: mockBookings, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : "Failed to fetch bookings", 
            isLoading: false 
          });
        }
      },
      
      // Booking actions
      confirmBooking: async (paymentMethod) => {
        set({ isLoading: true, error: null });
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          const { currentBooking } = get();
          
          // Validate booking data
          if (!currentBooking.route || !currentBooking.departureDate || currentBooking.selectedSeats.length === 0) {
            throw new Error("Incomplete booking information");
          }
          
          // Create new booking
          const newBooking: Booking = {
            id: `booking-${Date.now()}`,
            bookingNumber: Math.floor(1000000 + Math.random() * 9000000).toString(),
            tripType: currentBooking.tripType,
            departureDate: currentBooking.departureDate,
            departureTime: "09:00", // Mock time
            returnDate: currentBooking.returnDate || undefined,
            returnTime: currentBooking.returnDate ? "16:00" : undefined, // Mock time
            route: currentBooking.route,
            returnRoute: currentBooking.returnRoute || undefined,
            seats: currentBooking.selectedSeats,
            returnSeats: currentBooking.returnSelectedSeats.length > 0 
              ? currentBooking.returnSelectedSeats 
              : undefined,
            passengers: currentBooking.passengers,
            totalFare: currentBooking.totalFare,
            status: "confirmed",
            paymentStatus: "paid",
            paymentMethod: paymentMethod as any,
            createdAt: new Date().toISOString()
          };
          
          // Add to bookings list
          set((state) => ({
            bookings: [newBooking, ...state.bookings],
            isLoading: false
          }));
          
          // Reset current booking
          get().resetCurrentBooking();
          
          return newBooking;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : "Failed to confirm booking", 
            isLoading: false 
          });
          throw error;
        }
      },
      
      cancelBooking: async (bookingId, reason) => {
        set({ isLoading: true, error: null });
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Update booking status
          set((state) => ({
            bookings: state.bookings.map(booking => 
              booking.id === bookingId 
                ? { ...booking, status: "cancelled" } 
                : booking
            ),
            isLoading: false
          }));
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : "Failed to cancel booking", 
            isLoading: false 
          });
          throw error;
        }
      }
    }),
    {
      name: 'ferry-booking-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        bookings: state.bookings,
        // Don't persist loading states or current booking
      }),
    }
  )
);