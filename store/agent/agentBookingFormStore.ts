import { create } from 'zustand';
import { supabase } from '../../utils/supabase';
import type { Route, Seat, Passenger, Trip } from '@/types';
import type {
  Agent,
  AgentClient,
  AgentCurrentBooking,
  AgentBookingState,
} from '@/types/agent';
import {
  calculateBookingFare,
  calculateDiscountedFare,
} from '@/utils/bookingUtils';
import { parseBookingQrCode } from '@/utils/qrCodeUtils';
import {
  confirmSeatReservations,
  cleanupUserTempReservations,
} from '@/utils/realtimeSeatReservation';
import { useAgentStore } from './agentStore';

/**
 * Email validation regex pattern
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate required input parameters
 * @param value - Value to validate
 * @param paramName - Parameter name for error messages
 * @throws {Error} If value is not provided
 */
const validateRequired = (value: any, paramName: string) => {
  if (!value) {
    throw new Error(`${paramName} is required`);
  }
};

/**
 * Standardized error handling for booking form operations
 * @param error - The error object or message
 * @param defaultMessage - Default error message to use
 * @param set - Zustand set function for updating store state
 * @returns The error message string
 */
const handleError = (error: unknown, defaultMessage: string, set: any) => {
  const errorMessage = error instanceof Error ? error.message : defaultMessage;
  console.error(defaultMessage, error);
  set({
    error: errorMessage,
    isLoading: false,
    isSearchingClients: false,
  });
  return errorMessage;
};

/**
 * Validate required booking data before submission
 * @param currentBooking - Current booking data to validate
 * @param agent - Agent information
 * @throws {Error} If validation fails
 */
const validateBookingData = (
  currentBooking: AgentCurrentBooking,
  agent: Agent | null
) => {
  if (!agent) throw new Error('Agent information not available');
  if (!currentBooking.client) throw new Error('Client information is required');
  if (!currentBooking.trip) throw new Error('Trip information is required');
  if (!currentBooking.route) throw new Error('Route information is required');
  if (currentBooking.selectedSeats.length === 0)
    throw new Error('At least one seat must be selected');

  // Validate round trip requirements
  if (currentBooking.tripType === 'round_trip') {
    if (!currentBooking.returnTrip)
      throw new Error('Return trip is required for round trip bookings');
    if (!currentBooking.returnRoute)
      throw new Error('Return route is required for round trip bookings');
    if (currentBooking.returnSelectedSeats.length === 0)
      throw new Error('Return seats must be selected for round trip bookings');
  }
};

/**
 * Generate QR code URL for booking
 * @param bookingNumber - Booking number to encode
 * @returns QR code URL
 */
const generateQrCodeUrl = (bookingNumber: string): string => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`Booking: ${bookingNumber}`)}`;
};

/**
 * Calculate discounted fare for seats
 * @param seats - Array of selected seats
 * @param route - Route information
 * @param discountRate - Discount rate percentage
 * @returns Calculated fare amount
 */
const calculateSeatFare = (
  seats: Seat[],
  route: Route | null,
  discountRate: number
): number => {
  if (!route || !seats.length) return 0;
  const baseFare = seats.length * route.baseFare;
  return baseFare * (1 - discountRate / 100);
};

/**
 * Agent booking form actions interface
 */
interface AgentBookingFormActions {
  // Navigation
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;

  // Trip setup
  setTripType: (tripType: 'one_way' | 'round_trip') => void;
  setRoute: (route: Route) => void;
  setReturnRoute: (route: Route | null) => void;
  setDepartureDate: (date: string) => void;
  setReturnDate: (date: string | null) => void;
  setTrip: (trip: Trip | null) => void;
  setReturnTrip: (trip: Trip | null) => void;

  // Client management
  setClient: (client: AgentClient | null) => void;
  createNewClient: (clientData: Omit<AgentClient, 'id' | 'hasAccount'>) => void;
  searchClients: (query: string) => Promise<void>;
  clearClientSearch: () => void;
  setClientSearchQuery: (query: string) => void;

  // Seat management
  fetchAvailableSeats: (tripId: string, isReturn?: boolean) => Promise<void>;
  toggleSeatSelection: (seat: Seat, isReturn?: boolean) => Promise<void>;
  ensureSeatReservations: (tripId: string) => Promise<void>;

  // Passenger management
  updatePassengers: (passengers: Passenger[]) => void;
  updatePassengerDetail: (
    index: number,
    field: keyof Passenger,
    value: string
  ) => void;

  // Pricing
  calculateFares: () => void;
  setPaymentMethod: (method: 'credit' | 'gateway' | 'free' | 'mib') => void;

  // Booking operations
  validateCurrentStep: () => string | null;
  createBooking: () => Promise<{
    bookingId: string;
    returnBookingId: string | null;
  }>;

  // Utility
  reset: () => void;
  setError: (error: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  setAgent: (agent: Agent) => void;
  validateAgentAccess: () => boolean;

  // QR Code utilities
  parseQrCodeData: typeof parseBookingQrCode;
  verifyQrCodeStorage: (bookingId: string) => Promise<boolean>;

  // Booking refresh utility
  refreshAgentData: () => Promise<void>;
  onBookingCreated?: (
    bookingId: string,
    returnBookingId?: string | null
  ) => Promise<void>;
  setOnBookingCreated: (
    callback?: (
      bookingId: string,
      returnBookingId?: string | null
    ) => Promise<void>
  ) => void;
}

const initialBooking: AgentCurrentBooking = {
  tripType: 'one_way',
  route: null,
  returnRoute: null,
  trip: null,
  returnTrip: null,
  departureDate: null,
  returnDate: null,
  client: null,
  passengers: [],
  selectedSeats: [],
  returnSelectedSeats: [],
  totalFare: 0,
  discountedFare: 0,
  discountRate: 0,
  paymentMethod: 'credit',
};

export const useAgentBookingFormStore = create<
  AgentBookingState & AgentBookingFormActions
>((set, get) => ({
  // Initial state
  currentBooking: { ...initialBooking },
  currentStep: 1,
  availableSeats: [],
  availableReturnSeats: [],
  clientSearchResults: [],
  isSearchingClients: false,
  clientSearchQuery: '',
  isLoading: false,
  error: null,
  agent: null,
  onBookingCreated: undefined,

  /**
   * Navigation methods
   */
  setCurrentStep: (step: number) => set({ currentStep: step }),

  nextStep: () => {
    const { currentStep, validateCurrentStep } = get();
    const error = validateCurrentStep();
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

  /**
   * Trip setup methods
   */
  setTripType: tripType => {
    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        tripType,
        returnDate:
          tripType === 'one_way' ? null : state.currentBooking.returnDate,
        returnTrip:
          tripType === 'one_way' ? null : state.currentBooking.returnTrip,
        returnRoute:
          tripType === 'one_way' ? null : state.currentBooking.returnRoute,
        returnSelectedSeats:
          tripType === 'one_way'
            ? []
            : state.currentBooking.returnSelectedSeats,
      },
    }));
    get().calculateFares();
  },

  setRoute: route => {
    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        route,
        trip: null, // Reset trip when route changes
        selectedSeats: [], // Reset selected seats
      },
    }));
    get().calculateFares();
  },

  setReturnRoute: returnRoute => {
    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        returnRoute,
        returnTrip: null, // Reset return trip
        returnSelectedSeats: [], // Reset return selected seats
      },
    }));
    get().calculateFares();
  },

  setDepartureDate: date => {
    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        departureDate: date,
        trip: null, // Reset trip when date changes
        selectedSeats: [], // Reset selected seats
      },
    }));
  },

  setReturnDate: date => {
    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        returnDate: date,
        returnTrip: null, // Reset return trip
        returnSelectedSeats: [], // Reset return selected seats
      },
    }));
  },

  setTrip: trip => {
    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        trip,
        selectedSeats: [], // Reset selected seats when trip changes
      },
    }));
    if (trip) {
      get().fetchAvailableSeats(trip.id, false);
    }
  },

  setReturnTrip: trip => {
    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        returnTrip: trip,
        returnSelectedSeats: [], // Reset return selected seats
      },
    }));
    if (trip) {
      get().fetchAvailableSeats(trip.id, true);
    }
  },

  /**
   * Client management methods
   */
  setClient: client => {
    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        client,
      },
    }));
  },

  createNewClient: clientData => {
    const newClient: AgentClient = {
      ...clientData,
      hasAccount: false, // New clients don't have accounts by default
    };

    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        client: newClient,
      },
    }));
  },

  searchClients: async (query: string) => {
    if (!query.trim()) {
      set({ clientSearchResults: [], isSearchingClients: false });
      return;
    }

    try {
      set({ isSearchingClients: true, error: null });

      const { agent } = get();

      if (!agent) {
        throw new Error('Agent information not available');
      }

      const searchResults: AgentClient[] = [];

      // Search existing agent clients - try both the view and direct table
      let agentClients: any[] = [];

      // First try the view
      const { data: viewData, error: viewError } = await supabase
        .from('agent_clients_with_details')
        .select('*')
        .eq('agent_id', agent.id)
        .or(
          `email.ilike.%${query}%,mobile_number.ilike.%${query}%,full_name.ilike.%${query}%`
        );

      if (viewError) {
        console.warn('Error with agent_clients_with_details view:', viewError);

        // Fallback to direct table query
        const { data: directData, error: directError } = await supabase
          .from('agent_clients')
          .select('*')
          .eq('agent_id', agent.id)
          .or(
            `email.ilike.%${query}%,mobile_number.ilike.%${query}%,full_name.ilike.%${query}%`
          );

        if (directError) {
          console.warn('Error searching agent_clients table:', directError);
        } else {
          agentClients = directData || [];
        }
      } else {
        agentClients = viewData || [];
      }

      // Add existing agent clients to results
      agentClients.forEach(client => {
        searchResults.push({
          id: client.id,
          name: client.full_name || client.email || 'Unknown',
          email: client.email || '',
          phone: client.mobile_number || '',
          idNumber: client.id_number,
          hasAccount: client.has_account || !!client.client_id,
          userProfileId: client.client_id,
        });
      });

      // Search all customer users (potential new clients for this agent)
      const { data: userProfiles, error: userProfilesError } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, mobile_number')
        .eq('role', 'customer')
        .or(
          `email.ilike.%${query}%,mobile_number.ilike.%${query}%,full_name.ilike.%${query}%`
        );

      if (userProfilesError) {
        console.error('Error searching user profiles:', userProfilesError);
        // Don't throw error here, just log it
      } else if (userProfiles && userProfiles.length > 0) {
        userProfiles.forEach(user => {
          // Check if this user is not already an agent client for this agent
          const existingClient = agentClients?.find(
            ac => ac.client_id === user.id
          );
          if (!existingClient) {
            searchResults.push({
              name: user.full_name || user.email || 'Unknown',
              email: user.email || '',
              phone: user.mobile_number || '',
              hasAccount: true,
              userProfileId: user.id,
            });
          }
        });
      }

      set({
        clientSearchResults: searchResults,
        isSearchingClients: false,
      });
    } catch (error) {
      handleError(error, 'Failed to search clients', set);
    }
  },

  clearClientSearch: () => {
    set({
      clientSearchResults: [],
      clientSearchQuery: '',
      isSearchingClients: false,
    });
  },

  setClientSearchQuery: (query: string) => {
    set({ clientSearchQuery: query });
  },

  // Seat management
  fetchAvailableSeats: async (tripId: string, isReturn = false) => {
    try {
      set({ isLoading: true, error: null });

      // Get trip details to find vessel
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('vessel_id')
        .eq('id', tripId)
        .single();

      if (tripError) throw tripError;

      // Get vessel layout data to understand aisle positions
      const { data: vesselLayout, error: layoutError } = await supabase
        .from('seat_layouts')
        .select('layout_data')
        .eq('vessel_id', tripData.vessel_id)
        .eq('is_active', true)
        .single();

      let layoutConfig = null;
      if (!layoutError && vesselLayout?.layout_data) {
        layoutConfig = vesselLayout.layout_data;
      }

      // Ensure seat reservations exist for this trip
      await get().ensureSeatReservations(tripId);

      // Get all seats for vessel with enhanced properties
      const { data: allVesselSeats, error: seatsError } = await supabase
        .from('seats')
        .select(
          `
                    id,
                    seat_number,
                    row_number,
                    is_window,
                    is_aisle,
                    seat_type,
                    seat_class,
                    is_disabled,
                    is_premium,
                    price_multiplier,
                    position_x,
                    position_y
                `
        )
        .eq('vessel_id', tripData.vessel_id)
        .order('row_number', { ascending: true })
        .order('seat_number', { ascending: true });

      if (seatsError) throw seatsError;

      if (!allVesselSeats || allVesselSeats.length === 0) {
        console.warn(`No seats found for vessel ${tripData.vessel_id}`);
        set(state => ({
          [isReturn ? 'availableReturnSeats' : 'availableSeats']: [],
        }));
        return;
      }

      // Get seat reservations with seat details for this trip
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
                    seat:seat_id(
                        id,
                        vessel_id,
                        seat_number,
                        row_number,
                        is_window,
                        is_aisle,
                        seat_type,
                        seat_class,
                        is_disabled,
                        is_premium,
                        price_multiplier,
                        position_x,
                        position_y
                    )
                `
          )
          .eq('trip_id', tripId)
          .order('seat(row_number)', { ascending: true })
          .order('seat(seat_number)', { ascending: true });

      if (reservationsError) throw reservationsError;

      // If no seat reservations exist, use vessel seats as fallback
      if (!seatReservations || seatReservations.length === 0) {
        console.warn(
          `No seat reservations found for trip ${tripId}, using vessel seats as fallback`
        );

        // Determine if seat is actually an aisle based on layout config
        const fallbackSeats: Seat[] = allVesselSeats.map(seat => {
          let isAisle = seat.is_aisle;
          if (layoutConfig && layoutConfig.aisles) {
            isAisle = layoutConfig.aisles.includes(seat.position_x);
          }

          return {
            id: seat.id,
            number: seat.seat_number,
            rowNumber: seat.row_number,
            isWindow: seat.is_window,
            isAisle,
            isAvailable: true,
            isSelected: false,
            // Enhanced properties
            seatType: seat.seat_type || 'standard',
            seatClass: seat.seat_class || 'economy',
            isDisabled: seat.is_disabled || false,
            isPremium: seat.is_premium || false,
            priceMultiplier: seat.price_multiplier || 1.0,
            positionX: seat.position_x,
            positionY: seat.position_y,
          };
        });

        set(state => ({
          [isReturn ? 'availableReturnSeats' : 'availableSeats']: fallbackSeats,
          isLoading: false,
        }));
        return;
      }

      // Create a map of seat reservations for quick lookup
      const reservationMap = new Map();
      seatReservations.forEach(reservation => {
        if (
          reservation.seat &&
          typeof reservation.seat === 'object' &&
          'id' in reservation.seat
        ) {
          reservationMap.set((reservation.seat as any).id, reservation);
        }
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

        // Determine aisle position using layout data if available
        let isAisle = vesselSeat.is_aisle;
        if (layoutConfig && layoutConfig.aisles) {
          const seatPosition = vesselSeat.position_x || vesselSeat.row_number;
          isAisle = layoutConfig.aisles.includes(seatPosition);
        }

        return {
          id: vesselSeat.id,
          number: vesselSeat.seat_number,
          rowNumber: vesselSeat.row_number,
          isWindow: vesselSeat.is_window,
          isAisle,
          isAvailable,
          isSelected: false,
          // Enhanced seat properties
          seatType: vesselSeat.seat_type || 'standard',
          seatClass: vesselSeat.seat_class || 'economy',
          isDisabled: vesselSeat.is_disabled || false,
          isPremium: vesselSeat.is_premium || false,
          priceMultiplier: vesselSeat.price_multiplier || 1,
          positionX: vesselSeat.position_x || vesselSeat.row_number, // Fallback to row_number if position_x not available
          positionY: vesselSeat.position_y || 1, // Fallback to 1 if position_y not available
        };
      });

      set(state => ({
        [isReturn ? 'availableReturnSeats' : 'availableSeats']: allSeats,
        isLoading: false,
      }));
    } catch (error: any) {
      handleError(error, 'Failed to fetch available seats', set);
    }
  },

  ensureSeatReservations: async (tripId: string) => {
    try {
      // Check if seat reservations already exist for this trip
      const { data: existingReservations, error: checkError } = await supabase
        .from('seat_reservations')
        .select('id')
        .eq('trip_id', tripId)
        .limit(1);

      if (checkError) throw checkError;

      // If reservations don't exist, create them
      if (!existingReservations || existingReservations.length === 0) {
        // Get trip details to find vessel
        const { data: tripData, error: tripError } = await supabase
          .from('trips')
          .select('vessel_id')
          .eq('id', tripId)
          .single();

        if (tripError) throw tripError;

        // Get all seats for this vessel
        const { data: vesselSeats, error: seatsError } = await supabase
          .from('seats')
          .select('id')
          .eq('vessel_id', tripData.vessel_id);

        if (seatsError) throw seatsError;

        if (vesselSeats && vesselSeats.length > 0) {
          // Create seat reservations for all seats
          const seatReservationsToCreate = vesselSeats.map((seat: any) => ({
            trip_id: tripId,
            seat_id: seat.id,
            is_available: true,
            is_reserved: false,
          }));

          const { error: createError } = await supabase
            .from('seat_reservations')
            .upsert(seatReservationsToCreate, {
              onConflict: 'trip_id,seat_id',
              ignoreDuplicates: true,
            });

          if (createError) {
            console.error(
              'Error creating seat reservations for trip:',
              tripId,
              createError
            );
          }
        }
      }
    } catch (error: any) {
      console.error('Error ensuring seat reservations:', error);
    }
  },

  toggleSeatSelection: async (seat: Seat, isReturn = false) => {
    const { currentBooking } = get();
    const targetSeats = isReturn
      ? currentBooking.returnSelectedSeats
      : currentBooking.selectedSeats;

    if (!seat.isAvailable) {
      console.warn('Seat not available:', seat.number);
      return;
    }

    const isSelected = targetSeats.some(s => s.id === seat.id);

    if (isSelected) {
      // Remove seat
      const newSeats = targetSeats.filter(s => s.id !== seat.id);
      set(state => ({
        currentBooking: {
          ...state.currentBooking,
          [isReturn ? 'returnSelectedSeats' : 'selectedSeats']: newSeats,
          // Update passengers to match seat count for departure seats
          passengers: isReturn
            ? state.currentBooking.passengers
            : newSeats.map(
                (_, index) =>
                  state.currentBooking.passengers[index] || {
                    fullName: '',
                    idNumber: '',
                    specialAssistance: '',
                  }
              ),
        },
      }));
    } else {
      // Add seat
      const newSeats = [...targetSeats, { ...seat, isSelected: true }];
      set(state => ({
        currentBooking: {
          ...state.currentBooking,
          [isReturn ? 'returnSelectedSeats' : 'selectedSeats']: newSeats,
          // Update passengers to match seat count for departure seats
          passengers: isReturn
            ? state.currentBooking.passengers
            : newSeats.map(
                (_, index) =>
                  state.currentBooking.passengers[index] || {
                    fullName: '',
                    idNumber: '',
                    specialAssistance: '',
                  }
              ),
        },
      }));
    }

    // Update available seats display
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

    get().calculateFares();
  },

  // Passenger management
  updatePassengers: passengers => {
    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        passengers,
      },
    }));
  },

  updatePassengerDetail: (index, field, value) => {
    const { currentBooking } = get();
    const updatedPassengers = [...currentBooking.passengers];

    if (updatedPassengers[index]) {
      updatedPassengers[index] = {
        ...updatedPassengers[index],
        [field]: value,
      };

      set(state => ({
        currentBooking: {
          ...state.currentBooking,
          passengers: updatedPassengers,
        },
      }));
    }
  },

  // Pricing
  calculateFares: () => {
    const { currentBooking, agent } = get();

    // Only calculate fare if we have the minimum required data
    if (!currentBooking.route) {
      set(state => ({
        currentBooking: {
          ...state.currentBooking,
          totalFare: 0,
          discountedFare: 0,
          discountRate: 0,
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

    // Only log warnings if we have some data but validation fails
    if (
      !fareCalculation.isValid &&
      (currentBooking.selectedSeats.length > 0 ||
        currentBooking.returnSelectedSeats.length > 0)
    ) {
      console.warn(
        'Fare calculation validation failed:',
        fareCalculation.errors
      );
    }

    // Apply agent discount
    const discountRate = Number(agent?.discountRate) || 0;
    const discountCalculation = calculateDiscountedFare(
      fareCalculation.totalFare,
      discountRate
    );

    if (!discountCalculation.isValid) {
      console.warn(
        'Discount calculation validation failed:',
        discountCalculation.errors
      );
    }

    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        totalFare: fareCalculation.totalFare,
        discountedFare: discountCalculation.discountedFare,
        discountRate,
      },
    }));
  },

  setPaymentMethod: method => {
    set(state => ({
      currentBooking: {
        ...state.currentBooking,
        paymentMethod: method,
      },
    }));
  },

  // Booking operations
  validateCurrentStep: () => {
    const { currentBooking, currentStep } = get();

    switch (currentStep) {
      case 1: // Route and Date
        if (!currentBooking.route) return 'Please select a route';
        if (!currentBooking.departureDate)
          return 'Please select departure date';
        if (currentBooking.tripType === 'round_trip') {
          if (!currentBooking.returnRoute) return 'Please select return route';
          if (!currentBooking.returnDate) return 'Please select return date';
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

      case 3: // Client Information
        if (!currentBooking.client) return 'Please provide client information';
        if (!currentBooking.client.name) return 'Client name is required';
        if (!currentBooking.client.email) return 'Client email is required';
        if (!currentBooking.client.phone) return 'Client phone is required';
        // ID number is optional for all clients
        break;

      case 4: // Seat Selection
        if (currentBooking.selectedSeats.length === 0)
          return 'Please select departure seats';
        if (
          currentBooking.tripType === 'round_trip' &&
          currentBooking.returnSelectedSeats.length === 0
        ) {
          return 'Please select return seats';
        }
        break;

      case 5: // Passenger Details
        if (
          currentBooking.passengers.length !==
          currentBooking.selectedSeats.length
        ) {
          return 'Number of passengers must match selected seats';
        }
        for (let i = 0; i < currentBooking.passengers.length; i++) {
          if (!currentBooking.passengers[i].fullName.trim()) {
            return `Passenger ${i + 1} name is required`;
          }
        }
        break;

      case 6: // Payment
        if (!currentBooking.paymentMethod)
          return 'Please select a payment method';
        break;
    }

    return null; // No errors
  },

  createBooking: async () => {
    try {
      set({ isLoading: true, error: null });

      // Add user authentication like customer booking
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('User must be authenticated to create booking');
      }

      const { currentBooking, agent } = get();

      // Ensure agent data is properly loaded
      if (!agent) {
        // Try to get agent data from the agent store
        const agentStore = useAgentStore.getState();
        if (agentStore.agent) {
          // Use agent data from agent store
          const agentData = agentStore.agent;
          set({ agent: agentData });
        } else {
          // Create a fallback agent for testing (remove this in production)
          const fallbackAgent: Agent = {
            id: 'fallback-agent-id',
            agentId: 'TRA-001',
            name: 'Test Agent',
            email: 'test@agent.com',
            creditBalance: 1000,
            creditCeiling: 5000,
            discountRate: 10,
            freeTicketsAllocation: 5,
            freeTicketsRemaining: 5,
          };
          set({ agent: fallbackAgent });
        }
      }

      validateBookingData(currentBooking, agent);

      // TypeScript assertion: agent is guaranteed to be non-null after validation
      if (!agent) throw new Error('Agent validation failed');
      const validAgent = agent;

      // Use the database function to create/get agent client
      const { data: agentClientData, error: clientError } = await supabase.rpc(
        'get_or_create_agent_client',
        {
          p_agent_id: validAgent.id,
          p_email: currentBooking.client!.email,
          p_full_name: currentBooking.client!.name,
          p_mobile_number: currentBooking.client!.phone,
          p_id_number: currentBooking.client!.idNumber || null,
          p_client_id: currentBooking.client!.userProfileId || null,
        }
      );

      if (clientError) {
        console.error('Client creation error:', clientError);
        throw new Error(`Failed to process client: ${clientError.message}`);
      }

      const agentClientId = agentClientData;

      // Determine the booking user_id: Always use agent ID for agent bookings to ensure update permissions
      // Store client's user ID separately if they have an account
      const bookingUserId = validAgent.id; // Always use agent ID for agent bookings

      // Calculate fares for commission tracking
      const originalFare =
        currentBooking.selectedSeats.length *
        (currentBooking.route?.baseFare || 0);
      const discountedFare =
        originalFare * (1 - (validAgent.discountRate || 0) / 100);
      const commissionAmount = originalFare - discountedFare;

      // Create the booking WITHOUT QR code data first
      // Set status based on payment method - MIB payments start as pending_payment
      const bookingData = {
        user_id: bookingUserId, // Always agent ID for permissions
        agent_id: validAgent.id,
        agent_client_id: agentClientId,
        trip_id: currentBooking.trip!.id,
        total_fare: discountedFare, // Store discounted fare in database
        payment_method_type: currentBooking.paymentMethod,
        status:
          currentBooking.paymentMethod === 'mib'
            ? ('pending_payment' as const)
            : ('confirmed' as const),
        is_round_trip: currentBooking.tripType === 'round_trip',
        return_booking_id: null, // We'll handle return trips separately if needed
      };

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();

      if (bookingError) {
        console.error('Booking creation error:', bookingError);
        throw new Error(`Failed to create booking: ${bookingError.message}`);
      }

      // Record commission transaction if commission exists
      if (commissionAmount > 0) {
        try {
          await supabase.from('agent_credit_transactions').insert({
            agent_id: validAgent.id,
            amount: commissionAmount,
            transaction_type: 'commission',
            booking_id: booking.id,
            description: `Commission earned for booking ${currentBooking.route?.fromIsland?.name || 'Unknown'} to ${currentBooking.route?.toIsland?.name || 'Unknown'}`,
            balance_after: validAgent.creditBalance, // Current balance (commission doesn't affect credit balance)
          });
        } catch (commissionError) {
          console.warn(
            'Failed to record commission transaction:',
            commissionError
          );
          // Don't throw error - booking was created successfully
        }
      }

      // Generate QR code URL using the auto-generated booking number
      const qrCodeUrl = generateQrCodeUrl(booking.booking_number);

      // Update booking with QR code URL
      const { error: qrUpdateError } = await supabase
        .from('bookings')
        .update({ qr_code_url: qrCodeUrl })
        .eq('id', booking.id)
        .select('id, qr_code_url');

      if (qrUpdateError) {
        console.error('Failed to update departure QR code URL:', qrUpdateError);
        // Don't throw error - booking was created successfully, just QR code failed
      }

      // Create passengers and seat reservations
      const passengerInserts = currentBooking.passengers.map(
        (passenger, index) => ({
          booking_id: booking.id,
          seat_id: currentBooking.selectedSeats[index]?.id,
          passenger_name: passenger.fullName,
          passenger_contact_number: currentBooking.client!.phone,
          special_assistance_request: passenger.specialAssistance || null,
        })
      );

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

      // Reserve seats using the same utility as customer booking
      const seatIds = currentBooking.selectedSeats.map(seat => seat.id);
      const seatConfirmation = await confirmSeatReservations(
        currentBooking.trip!.id,
        seatIds,
        booking.id
      );

      if (
        !seatConfirmation.success ||
        seatConfirmation.failed_seats.length > 0
      ) {
        // Clean up booking and passengers if seat reservation fails
        await supabase.from('passengers').delete().eq('booking_id', booking.id);
        await supabase.from('bookings').delete().eq('id', booking.id);
        throw new Error(
          `Failed to reserve seats: ${seatConfirmation.failed_seats.join(', ')}`
        );
      }

      // Create payment record for all payment methods (like customer booking)
      if (currentBooking.paymentMethod === 'mib') {
        // For MIB, create pending payment record
        const { error: paymentError } = await supabase.from('payments').insert({
          booking_id: booking.id,
          payment_method: 'mib',
          amount: discountedFare,
          currency: 'MVR',
          status: 'pending', // Start with pending for MIB
        });

        if (paymentError) {
          console.error('Failed to create MIB payment record:', paymentError);
          // Don't throw error - booking was created successfully
        }
      } else {
        // For other payment methods (credit/free), create completed payment record
        const { error: paymentError } = await supabase.from('payments').insert({
          booking_id: booking.id,
          payment_method: currentBooking.paymentMethod,
          amount: discountedFare,
          currency: 'MVR',
          status: 'completed', // Mark as completed for immediate confirmation
        });

        if (paymentError) {
          console.error('Failed to create payment record:', paymentError);
          // Don't throw error - booking was created successfully
        }

        // Update booking status to confirmed for non-MIB payments
        const { error: statusUpdateError } = await supabase
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('id', booking.id);

        if (statusUpdateError) {
          console.error('Failed to update booking status:', statusUpdateError);
          // Don't throw error - booking was created successfully
        }
      }

      // Handle credit payment
      if (currentBooking.paymentMethod === 'credit') {
        const newBalance = validAgent.creditBalance - discountedFare;

        if (newBalance < 0) {
          // Clean up everything if insufficient credit
          await supabase
            .from('seat_reservations')
            .delete()
            .eq('booking_id', booking.id);
          await supabase
            .from('passengers')
            .delete()
            .eq('booking_id', booking.id);
          await supabase.from('bookings').delete().eq('id', booking.id);
          throw new Error('Insufficient credit balance');
        }

        // Update agent credit balance
        const { error: creditError } = await supabase
          .from('user_profiles')
          .update({ credit_balance: newBalance })
          .eq('id', validAgent.id);

        if (creditError) {
          console.warn('Failed to update credit balance:', creditError);
        }

        // Create credit transaction record
        try {
          await supabase.from('agent_credit_transactions').insert({
            agent_id: validAgent.id,
            amount: -discountedFare,
            transaction_type: 'deduction',
            booking_id: booking.id,
            description: `Booking payment for ${currentBooking.route?.fromIsland?.name || 'Unknown'} to ${currentBooking.route?.toIsland?.name || 'Unknown'}`,
            balance_after: newBalance,
          });
        } catch (transactionError) {
          console.warn(
            'Failed to create credit transaction record:',
            transactionError
          );
        }
      }

      // Handle free ticket payment
      if (currentBooking.paymentMethod === 'free') {
        const ticketsNeeded = currentBooking.selectedSeats.length;

        if (validAgent.freeTicketsRemaining < ticketsNeeded) {
          // Clean up booking if insufficient free tickets
          await supabase
            .from('seat_reservations')
            .delete()
            .eq('booking_id', booking.id);
          await supabase
            .from('passengers')
            .delete()
            .eq('booking_id', booking.id);
          await supabase.from('bookings').delete().eq('id', booking.id);
          throw new Error(
            `Insufficient free tickets. Need ${ticketsNeeded}, have ${validAgent.freeTicketsRemaining}`
          );
        }

        const newFreeTicketsRemaining =
          validAgent.freeTicketsRemaining - ticketsNeeded;

        // Update agent free tickets remaining
        const { error: freeTicketError } = await supabase
          .from('user_profiles')
          .update({ free_tickets_remaining: newFreeTicketsRemaining })
          .eq('id', validAgent.id);

        if (freeTicketError) {
          console.warn(
            'Failed to update free tickets remaining:',
            freeTicketError
          );
        } else {
          // Update local agent state
          set(state => ({
            ...state,
            agent: state.agent
              ? {
                  ...state.agent,
                  freeTicketsRemaining: newFreeTicketsRemaining,
                }
              : null,
          }));
        }
      }

      // Handle return trip for round-trip bookings
      let returnBookingId = null;
      if (
        currentBooking.tripType === 'round_trip' &&
        currentBooking.returnTrip
      ) {
        // Calculate return trip fares for commission tracking
        const returnOriginalFare =
          currentBooking.returnSelectedSeats.length *
          (currentBooking.returnRoute?.baseFare || 0);
        const returnDiscountedFare =
          returnOriginalFare * (1 - (validAgent.discountRate || 0) / 100);
        const returnCommissionAmount =
          returnOriginalFare - returnDiscountedFare;

        const returnBookingData = {
          user_id: bookingUserId,
          agent_id: validAgent.id,
          agent_client_id: agentClientId,
          trip_id: currentBooking.returnTrip.id,
          total_fare: returnDiscountedFare,
          payment_method_type: currentBooking.paymentMethod,
          status:
            currentBooking.paymentMethod === 'mib'
              ? ('pending_payment' as const)
              : ('confirmed' as const),
          is_round_trip: true,
          return_booking_id: null,
        };

        const { data: returnBooking, error: returnBookingError } =
          await supabase
            .from('bookings')
            .insert(returnBookingData)
            .select()
            .single();

        if (returnBookingError) {
          console.error('Return booking creation error:', returnBookingError);
          throw new Error(
            `Failed to create return booking: ${returnBookingError.message}`
          );
        }

        returnBookingId = returnBooking.id;

        // Record commission transaction for return trip if commission exists
        if (returnCommissionAmount > 0) {
          try {
            await supabase.from('agent_credit_transactions').insert({
              agent_id: validAgent.id,
              amount: returnCommissionAmount,
              transaction_type: 'commission',
              booking_id: returnBooking.id,
              description: `Commission earned for return booking ${currentBooking.returnRoute?.fromIsland?.name || 'Unknown'} to ${currentBooking.returnRoute?.toIsland?.name || 'Unknown'}`,
              balance_after: validAgent.creditBalance, // Current balance (commission doesn't affect credit balance)
            });
          } catch (commissionError) {
            console.warn(
              'Failed to record return commission transaction:',
              commissionError
            );
            // Don't throw error - booking was created successfully
          }
        }

        // Generate return QR code URL using the auto-generated booking number
        const returnQrCodeUrl = generateQrCodeUrl(returnBooking.booking_number);

        // Update return booking with QR code URL
        const { error: returnQrUpdateError } = await supabase
          .from('bookings')
          .update({ qr_code_url: returnQrCodeUrl })
          .eq('id', returnBooking.id)
          .select('id, qr_code_url');

        if (returnQrUpdateError) {
          console.error(
            'Failed to update return QR code URL:',
            returnQrUpdateError
          );
        }

        // Create return trip passengers and seat reservations
        const returnPassengerInserts = currentBooking.passengers.map(
          (passenger, index) => ({
            booking_id: returnBooking.id,
            seat_id: currentBooking.returnSelectedSeats[index]?.id,
            passenger_name: passenger.fullName,
            passenger_contact_number: currentBooking.client!.phone,
            special_assistance_request: passenger.specialAssistance || null,
          })
        );

        await supabase.from('passengers').insert(returnPassengerInserts);

        // Reserve return seats using the same utility as customer booking
        const returnSeatIds = currentBooking.returnSelectedSeats.map(
          seat => seat.id
        );
        const returnSeatConfirmation = await confirmSeatReservations(
          currentBooking.returnTrip!.id,
          returnSeatIds,
          returnBooking.id
        );

        if (
          !returnSeatConfirmation.success ||
          returnSeatConfirmation.failed_seats.length > 0
        ) {
          console.error(
            'Failed to reserve return seats:',
            returnSeatConfirmation.failed_seats
          );
          // Don't fail the main booking for return seat issues, but log the error
        }

        // Create payment record for return trip (all payment methods like customer booking)
        if (currentBooking.paymentMethod === 'mib') {
          // For MIB, create pending payment record for return trip
          const { error: returnPaymentError } = await supabase
            .from('payments')
            .insert({
              booking_id: returnBooking.id,
              payment_method: 'mib',
              amount: returnDiscountedFare,
              currency: 'MVR',
              status: 'pending', // Start with pending for MIB
            });

          if (returnPaymentError) {
            console.error(
              'Failed to create MIB payment record for return trip:',
              returnPaymentError
            );
            // Don't throw error - booking was created successfully
          }
        } else {
          // For other payment methods (credit/free), create completed payment record
          const { error: returnPaymentError } = await supabase
            .from('payments')
            .insert({
              booking_id: returnBooking.id,
              payment_method: currentBooking.paymentMethod,
              amount: returnDiscountedFare,
              currency: 'MVR',
              status: 'completed', // Mark as completed for immediate confirmation
            });

          if (returnPaymentError) {
            console.error(
              'Failed to create return payment record:',
              returnPaymentError
            );
          }

          // Update return booking status to confirmed for non-MIB payments
          const { error: returnStatusUpdateError } = await supabase
            .from('bookings')
            .update({ status: 'confirmed' })
            .eq('id', returnBooking.id);

          if (returnStatusUpdateError) {
            console.error(
              'Failed to update return booking status:',
              returnStatusUpdateError
            );
          }
        }

        if (currentBooking.paymentMethod === 'credit') {
          const returnFare =
            currentBooking.returnSelectedSeats.length *
            (currentBooking.returnRoute?.baseFare || 0) *
            (1 - (validAgent.discountRate || 0) / 100);
          const currentBalance = await supabase
            .from('user_profiles')
            .select('credit_balance')
            .eq('id', validAgent.id)
            .single();

          if (currentBalance.data) {
            const newBalance = currentBalance.data.credit_balance - returnFare;
            await supabase
              .from('user_profiles')
              .update({ credit_balance: newBalance })
              .eq('id', validAgent.id);
          }
        }

        if (currentBooking.paymentMethod === 'free') {
          const returnTicketsNeeded = currentBooking.returnSelectedSeats.length;
          const currentAgent = get().agent;
          if (
            currentAgent &&
            currentAgent.freeTicketsRemaining >= returnTicketsNeeded
          ) {
            const newFreeTicketsRemaining =
              currentAgent.freeTicketsRemaining - returnTicketsNeeded;
            await supabase
              .from('user_profiles')
              .update({ free_tickets_remaining: newFreeTicketsRemaining })
              .eq('id', validAgent.id);

            set(state => ({
              ...state,
              agent: state.agent
                ? {
                    ...state.agent,
                    freeTicketsRemaining: newFreeTicketsRemaining,
                  }
                : null,
            }));
          }
        }
      }

      // Refresh bookings list after successful creation
      try {
        // Call the callback if it exists (for external refresh)
        const { onBookingCreated } = get();
        if (onBookingCreated) {
          await onBookingCreated(booking.id, returnBookingId);
        }
      } catch (refreshError) {
        console.warn('Failed to refresh bookings list:', refreshError);
        // Don't throw error as booking was successful
      }

      set({ isLoading: false });

      // For MIB payments, return additional data needed for payment processing
      if (currentBooking.paymentMethod === 'mib') {
        return {
          bookingId: booking.id,
          returnBookingId,
          booking_number: booking.booking_number,
        };
      }

      return { bookingId: booking.id, returnBookingId };
    } catch (error: any) {
      // Clean up any temporary seat reservations if booking fails (like customer booking)
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

      handleError(error, 'Failed to create booking', set);
      throw error;
    }
  },

  // Utility
  reset: () => {
    set({
      currentBooking: { ...initialBooking },
      currentStep: 1,
      availableSeats: [],
      availableReturnSeats: [],
      clientSearchResults: [],
      isSearchingClients: false,
      clientSearchQuery: '',
      error: null,
    });
  },

  setError: error => set({ error }),
  setLoading: isLoading => set({ isLoading }),
  setAgent: agent => set({ agent }),

  validateAgentAccess: () => {
    const { agent } = get();
    return agent !== null && agent.id !== undefined;
  },

  setOnBookingCreated: callback => set({ onBookingCreated: callback }),

  // QR Code utilities
  parseQrCodeData: parseBookingQrCode,

  verifyQrCodeStorage: async (bookingId: string) => {
    try {
      const { data: booking, error } = await supabase
        .from('bookings')
        .select('id, qr_code_url')
        .eq('id', bookingId)
        .single();

      if (error) {
        console.error(
          'Error retrieving booking for QR code verification:',
          error
        );
        return false;
      }

      if (!booking?.qr_code_url) {
        console.warn('No QR code URL found for booking:', bookingId);
        return false;
      }

      // Verify the QR code URL format
      if (
        !booking.qr_code_url.startsWith(
          'https://api.qrserver.com/v1/create-qr-code/'
        )
      ) {
        console.error('Invalid QR code URL format for booking:', bookingId);
        return false;
      }

      return true;
    } catch (error) {
      handleError(error, 'Failed to verify QR code storage', set);
      return false;
    }
  },

  // Booking refresh utility - triggers external refresh via callback
  refreshAgentData: async () => {
    try {
      const { onBookingCreated } = get();
      if (onBookingCreated) {
        // Trigger the external refresh callback
        await onBookingCreated('refresh', null);
      }
    } catch (error) {
      // Error refreshing agent data
    }
  },
}));
