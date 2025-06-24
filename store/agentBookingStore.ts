import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import type { Route, Seat, Passenger, Trip } from '@/types';
import type { Agent } from '@/types/agent';

export interface AgentClient {
    id?: string; // Optional for new clients
    name: string;
    email: string;
    phone: string;
    idNumber?: string;
    hasAccount: boolean;
    userProfileId?: string; // If client has an account
}

export interface AgentCurrentBooking {
    // Trip details
    tripType: 'one_way' | 'round_trip';
    route: Route | null;
    returnRoute: Route | null;
    trip: Trip | null;
    returnTrip: Trip | null;
    departureDate: string | null;
    returnDate: string | null;

    // Client details
    client: AgentClient | null;

    // Passengers and seats
    passengers: Passenger[];
    selectedSeats: Seat[];
    returnSelectedSeats: Seat[];

    // Pricing
    totalFare: number;
    discountedFare: number;
    discountRate: number;

    // Payment
    paymentMethod: 'credit' | 'gateway' | 'free';
}

interface AgentBookingState {
    // Current booking data
    currentBooking: AgentCurrentBooking;
    currentStep: number;

    // Available data
    availableSeats: Seat[];
    availableReturnSeats: Seat[];

    // Client search functionality
    clientSearchResults: AgentClient[];
    isSearchingClients: boolean;
    clientSearchQuery: string;

    // State flags
    isLoading: boolean;
    error: string | null;

    // Agent info
    agent: Agent | null;

    // Callback for when booking is created
    onBookingCreated?: (bookingId: string, returnBookingId?: string | null) => Promise<void>;
}

interface AgentBookingActions {
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

    // Passenger management
    updatePassengers: (passengers: Passenger[]) => void;
    updatePassengerDetail: (index: number, field: keyof Passenger, value: string) => void;

    // Pricing
    calculateFares: () => void;
    setPaymentMethod: (method: 'credit' | 'gateway' | 'free') => void;

    // Booking operations
    validateCurrentStep: () => string | null;
    createBooking: () => Promise<{ bookingId: string; returnBookingId: string | null }>;

    // Utility
    reset: () => void;
    setError: (error: string | null) => void;
    setLoading: (isLoading: boolean) => void;
    setAgent: (agent: Agent) => void;

    // QR Code utilities
    parseQrCodeData: (qrCodeString: string) => any | null;
    generateQrCodeData: (booking: any, agent: Agent, type?: string) => string;
    validateQrCodeData: (qrCodeData: any) => boolean;
    verifyQrCodeStorage: (bookingId: string) => Promise<boolean>;
    testQrCodeFunctionality: () => Promise<void>;
    debugClientAccountQrIssue: () => Promise<any>;
    fixMissingQrCodes: () => Promise<void>;

    // Booking refresh utility
    refreshAgentData: () => Promise<void>;
    onBookingCreated?: (bookingId: string, returnBookingId?: string | null) => Promise<void>;
    setOnBookingCreated: (callback: (bookingId: string, returnBookingId?: string | null) => Promise<void>) => void;
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

export const useAgentBookingStore = create<AgentBookingState & AgentBookingActions>((set, get) => ({
    // State
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

    // Navigation
    setCurrentStep: (step: number) => set({ currentStep: step }),

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

    // Trip setup
    setTripType: (tripType) => {
        set(state => ({
            currentBooking: {
                ...state.currentBooking,
                tripType,
                returnDate: tripType === 'one_way' ? null : state.currentBooking.returnDate,
                returnTrip: tripType === 'one_way' ? null : state.currentBooking.returnTrip,
                returnRoute: tripType === 'one_way' ? null : state.currentBooking.returnRoute,
                returnSelectedSeats: tripType === 'one_way' ? [] : state.currentBooking.returnSelectedSeats,
            }
        }));
        get().calculateFares();
    },

    setRoute: (route) => {
        set(state => ({
            currentBooking: {
                ...state.currentBooking,
                route,
                trip: null, // Reset trip when route changes
                selectedSeats: [], // Reset selected seats
            }
        }));
        get().calculateFares();
    },

    setReturnRoute: (returnRoute) => {
        set(state => ({
            currentBooking: {
                ...state.currentBooking,
                returnRoute,
                returnTrip: null, // Reset return trip
                returnSelectedSeats: [], // Reset return selected seats
            }
        }));
        get().calculateFares();
    },

    setDepartureDate: (date) => {
        set(state => ({
            currentBooking: {
                ...state.currentBooking,
                departureDate: date,
                trip: null, // Reset trip when date changes
                selectedSeats: [], // Reset selected seats
            }
        }));
    },

    setReturnDate: (date) => {
        set(state => ({
            currentBooking: {
                ...state.currentBooking,
                returnDate: date,
                returnTrip: null, // Reset return trip
                returnSelectedSeats: [], // Reset return selected seats
            }
        }));
    },

    setTrip: (trip) => {
        set(state => ({
            currentBooking: {
                ...state.currentBooking,
                trip,
                selectedSeats: [], // Reset selected seats when trip changes
            }
        }));
        if (trip) {
            get().fetchAvailableSeats(trip.id, false);
        }
    },

    setReturnTrip: (trip) => {
        set(state => ({
            currentBooking: {
                ...state.currentBooking,
                returnTrip: trip,
                returnSelectedSeats: [], // Reset return selected seats
            }
        }));
        if (trip) {
            get().fetchAvailableSeats(trip.id, true);
        }
    },

    // Client management
    setClient: (client) => {
        set(state => ({
            currentBooking: {
                ...state.currentBooking,
                client,
            }
        }));
    },

    createNewClient: (clientData) => {
        const newClient: AgentClient = {
            ...clientData,
            hasAccount: false, // New clients don't have accounts by default
        };

        set(state => ({
            currentBooking: {
                ...state.currentBooking,
                client: newClient,
            }
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
                .or(`email.ilike.%${query}%,mobile_number.ilike.%${query}%,full_name.ilike.%${query}%`);

            if (viewError) {
                console.warn('Error with agent_clients_with_details view:', viewError);

                // Fallback to direct table query
                const { data: directData, error: directError } = await supabase
                    .from('agent_clients')
                    .select('*')
                    .eq('agent_id', agent.id)
                    .or(`email.ilike.%${query}%,mobile_number.ilike.%${query}%,full_name.ilike.%${query}%`);

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
                .or(`email.ilike.%${query}%,mobile_number.ilike.%${query}%,full_name.ilike.%${query}%`);

            if (userProfilesError) {
                console.error('Error searching user profiles:', userProfilesError);
                // Don't throw error here, just log it
            } else if (userProfiles && userProfiles.length > 0) {
                userProfiles.forEach(user => {
                    // Check if this user is not already an agent client for this agent
                    const existingClient = agentClients?.find(ac => ac.client_id === user.id);
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
                isSearchingClients: false
            });

        } catch (error: any) {
            console.error('Error searching clients:', error);
            set({
                error: error.message || 'Failed to search clients',
                isSearchingClients: false,
                clientSearchResults: []
            });
        }
    },

    clearClientSearch: () => {
        set({
            clientSearchResults: [],
            clientSearchQuery: '',
            isSearchingClients: false
        });
    },

    setClientSearchQuery: (query: string) => {
        set({ clientSearchQuery: query });
    },

    // Seat management - using the same logic as customer booking
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

            // Get all seats for vessel
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
                .select('*')
                .eq('trip_id', tripId);

            if (reservationsError) throw reservationsError;

            // Create reservation map
            const reservationMap = new Map();
            seatReservations?.forEach(reservation => {
                reservationMap.set(reservation.seat_id, reservation);
            });

            // Transform seats data
            const seats: Seat[] = allVesselSeats?.map(seat => {
                const reservation = reservationMap.get(seat.id);
                let isAvailable = true;

                if (reservation) {
                    isAvailable = reservation.is_available && !reservation.booking_id;

                    // Handle temporary reservations
                    if (reservation.is_reserved && reservation.reservation_expiry) {
                        const expiryTime = new Date(reservation.reservation_expiry);
                        const currentTime = new Date();
                        isAvailable = currentTime > expiryTime ? reservation.is_available : false;
                    }
                }

                return {
                    id: seat.id,
                    number: seat.seat_number,
                    rowNumber: seat.row_number,
                    isWindow: seat.is_window,
                    isAisle: seat.is_aisle,
                    isAvailable,
                    isSelected: false,
                };
            }) || [];

            set(state => ({
                [isReturn ? 'availableReturnSeats' : 'availableSeats']: seats,
                isLoading: false,
            }));

        } catch (error: any) {
            console.error('Error fetching available seats:', error);
            set({
                error: 'Failed to fetch available seats',
                isLoading: false
            });
        }
    },

    toggleSeatSelection: async (seat: Seat, isReturn = false) => {
        const { currentBooking } = get();
        const targetSeats = isReturn ? currentBooking.returnSelectedSeats : currentBooking.selectedSeats;

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
                    passengers: isReturn ? state.currentBooking.passengers : newSeats.map((_, index) =>
                        state.currentBooking.passengers[index] || {
                            fullName: '',
                            idNumber: '',
                            specialAssistance: '',
                        }
                    )
                }
            }));
        } else {
            // Add seat
            const newSeats = [...targetSeats, { ...seat, isSelected: true }];
            set(state => ({
                currentBooking: {
                    ...state.currentBooking,
                    [isReturn ? 'returnSelectedSeats' : 'selectedSeats']: newSeats,
                    // Update passengers to match seat count for departure seats
                    passengers: isReturn ? state.currentBooking.passengers : newSeats.map((_, index) =>
                        state.currentBooking.passengers[index] || {
                            fullName: '',
                            idNumber: '',
                            specialAssistance: '',
                        }
                    )
                }
            }));
        }

        // Update available seats display
        const availableSeats = isReturn ? get().availableReturnSeats : get().availableSeats;
        const updatedAvailableSeats = availableSeats.map(s =>
            s.id === seat.id ? { ...s, isSelected: !isSelected } : s
        );

        set(state => ({
            [isReturn ? 'availableReturnSeats' : 'availableSeats']: updatedAvailableSeats
        }));

        get().calculateFares();
    },

    // Passenger management
    updatePassengers: (passengers) => {
        set(state => ({
            currentBooking: {
                ...state.currentBooking,
                passengers,
            }
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
                }
            }));
        }
    },

    // Pricing
    calculateFares: () => {
        const { currentBooking, agent } = get();

        let totalFare = 0;

        // Calculate base fare
        if (currentBooking.route && currentBooking.selectedSeats.length > 0) {
            totalFare += currentBooking.selectedSeats.length * (currentBooking.route.baseFare || 0);
        }

        if (currentBooking.returnRoute && currentBooking.returnSelectedSeats.length > 0) {
            totalFare += currentBooking.returnSelectedSeats.length * (currentBooking.returnRoute.baseFare || 0);
        }

        // Apply agent discount
        const discountRate = agent?.discountRate || 0;
        const discountedFare = totalFare * (1 - discountRate / 100);

        set(state => ({
            currentBooking: {
                ...state.currentBooking,
                totalFare,
                discountedFare,
                discountRate,
            }
        }));
    },

    setPaymentMethod: (method) => {
        set(state => ({
            currentBooking: {
                ...state.currentBooking,
                paymentMethod: method,
            }
        }));
    },

    // Booking operations
    validateCurrentStep: () => {
        const { currentBooking, currentStep } = get();

        switch (currentStep) {
            case 1: // Route and Date
                if (!currentBooking.route) return 'Please select a route';
                if (!currentBooking.departureDate) return 'Please select departure date';
                if (currentBooking.tripType === 'round_trip') {
                    if (!currentBooking.returnRoute) return 'Please select return route';
                    if (!currentBooking.returnDate) return 'Please select return date';
                }
                break;

            case 2: // Trip Selection
                if (!currentBooking.trip) return 'Please select a departure trip';
                if (currentBooking.tripType === 'round_trip' && !currentBooking.returnTrip) {
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
                if (currentBooking.selectedSeats.length === 0) return 'Please select departure seats';
                if (currentBooking.tripType === 'round_trip' && currentBooking.returnSelectedSeats.length === 0) {
                    return 'Please select return seats';
                }
                break;

            case 5: // Passenger Details
                if (currentBooking.passengers.length !== currentBooking.selectedSeats.length) {
                    return 'Number of passengers must match selected seats';
                }
                for (let i = 0; i < currentBooking.passengers.length; i++) {
                    if (!currentBooking.passengers[i].fullName.trim()) {
                        return `Passenger ${i + 1} name is required`;
                    }
                }
                break;

            case 6: // Payment
                if (!currentBooking.paymentMethod) return 'Please select a payment method';
                break;
        }

        return null; // No errors
    },

    createBooking: async () => {
        try {
            set({ isLoading: true, error: null });

            const { currentBooking, agent } = get();

            if (!agent) throw new Error('Agent information not available');
            if (!currentBooking.client) throw new Error('Client information is required');
            if (!currentBooking.trip) throw new Error('Trip information is required');

            // Validate all data
            const validationError = get().validateCurrentStep();
            if (validationError) throw new Error(validationError);

            // Use the database function to create/get agent client
            const { data: agentClientData, error: clientError } = await supabase
                .rpc('get_or_create_agent_client', {
                    p_agent_id: agent.id,
                    p_email: currentBooking.client.email,
                    p_full_name: currentBooking.client.name,
                    p_mobile_number: currentBooking.client.phone,
                    p_id_number: currentBooking.client.idNumber || null,
                    p_client_id: currentBooking.client.userProfileId || null
                });

            if (clientError) {
                console.error('Client creation error:', clientError);
                throw new Error(`Failed to process client: ${clientError.message}`);
            }

            const agentClientId = agentClientData;

            // Determine the booking user_id: Always use agent ID for agent bookings to ensure update permissions
            // Store client's user ID separately if they have an account
            const bookingUserId = agent.id; // Always use agent ID for agent bookings

            // Create the booking WITHOUT QR code data first
            const bookingData = {
                user_id: bookingUserId, // Always agent ID for permissions
                agent_id: agent.id,
                agent_client_id: agentClientId,
                trip_id: currentBooking.trip.id,
                total_fare: currentBooking.discountedFare,
                payment_method_type: currentBooking.paymentMethod,
                status: 'confirmed' as const,
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

            // Now generate QR code data with actual booking details
            const finalQrCodeData = JSON.stringify({
                bookingNumber: booking.booking_number,
                bookingId: booking.id,
                tripId: currentBooking.trip.id,
                departureDate: currentBooking.trip.travel_date || currentBooking.departureDate,
                departureTime: currentBooking.trip.departure_time,
                passengers: currentBooking.passengers.length,
                seats: currentBooking.selectedSeats.map(seat => seat.number),
                totalFare: currentBooking.discountedFare,
                timestamp: new Date().toISOString(),
                // Agent-specific additional fields
                clientName: currentBooking.client.name,
                clientEmail: currentBooking.client.email,
                clientHasAccount: currentBooking.client.hasAccount,
                clientUserProfileId: currentBooking.client.userProfileId || null,
                agentId: agent.id,
                agentName: agent.name || agent.email,
                agentClientId: agentClientId,
                type: 'agent-booking'
            });

            // Debug: Log QR code generation details
            console.log('QR Code Generation Details:', {
                bookingId: booking.id,
                bookingNumber: booking.booking_number,
                clientHasAccount: currentBooking.client.hasAccount,
                clientUserProfileId: currentBooking.client.userProfileId,
                bookingUserId: bookingUserId,
                agentId: agent.id,
                qrDataLength: finalQrCodeData.length,
            });

            // Update booking with QR code data (with actual booking number and ID)
            console.log('Attempting to update QR code for booking:', booking.id, 'Data length:', finalQrCodeData.length);

            // Check if QR data is too long (PostgreSQL text field limit is usually much larger, but let's be safe)
            if (finalQrCodeData.length > 10000) {
                console.warn('QR code data is very long:', finalQrCodeData.length, 'characters. Truncating...');
                // In case of very long data, we could truncate or simplify
            }

            // Enhanced QR code update with retry mechanism
            let qrUpdateSuccess = false;
            let qrUpdateAttempts = 0;
            const maxRetries = 3;

            while (!qrUpdateSuccess && qrUpdateAttempts < maxRetries) {
                qrUpdateAttempts++;

                const { data: qrUpdateResult, error: qrUpdateError } = await supabase
                    .from('bookings')
                    .update({ qr_code_url: finalQrCodeData })
                    .eq('id', booking.id)
                    .select('id, qr_code_url, booking_number');

                if (qrUpdateError) {
                    console.error(`QR code update attempt ${qrUpdateAttempts} failed:`, qrUpdateError);

                    if (qrUpdateAttempts === 1) {
                        // On first failure, log detailed error information
                        console.error('QR Update Error Details:', {
                            bookingId: booking.id,
                            bookingNumber: booking.booking_number,
                            error: qrUpdateError,
                            errorCode: qrUpdateError.code,
                            errorMessage: qrUpdateError.message,
                            errorDetails: qrUpdateError.details,
                            errorHint: qrUpdateError.hint,
                            qrDataLength: finalQrCodeData.length,
                            qrDataPreview: finalQrCodeData.substring(0, 100) + '...',
                            clientType: currentBooking.client.hasAccount ? 'with_account' : 'without_account',
                            bookingUserId: bookingUserId,
                            agentId: agent.id
                        });
                    }

                    // Wait before retry
                    if (qrUpdateAttempts < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 500 * qrUpdateAttempts));
                    }
                } else {
                    console.log(`QR code update attempt ${qrUpdateAttempts} succeeded for booking:`, booking.booking_number, 'ID:', booking.id);
                    qrUpdateSuccess = true;

                    // Verify the QR code was actually stored
                    await new Promise(resolve => setTimeout(resolve, 200));

                    try {
                        const { data: verifyData, error: verifyError } = await supabase
                            .from('bookings')
                            .select('qr_code_url, booking_number')
                            .eq('id', booking.id)
                            .single();

                        if (verifyError) {
                            console.error('Failed to verify QR code storage:', verifyError);
                            qrUpdateSuccess = false; // Retry if verification fails
                        } else if (!verifyData.qr_code_url) {
                            console.error('QR code verification failed: No data found in database for booking:', booking.id);
                            console.error('Verification result:', verifyData);
                            qrUpdateSuccess = false; // Retry if no data found
                        } else {
                            console.log('QR code verification successful for booking:', verifyData.booking_number);
                            console.log('Stored QR data length:', verifyData.qr_code_url.length);
                            console.log('QR data preview:', verifyData.qr_code_url.substring(0, 100) + '...');
                        }
                    } catch (verifyException) {
                        console.error('Exception during QR code verification:', verifyException);
                        qrUpdateSuccess = false; // Retry if verification throws
                    }
                }
            }

            if (!qrUpdateSuccess) {
                console.error(`Failed to update QR code after ${maxRetries} attempts for booking:`, booking.id);
                // Don't throw error - booking was created successfully, just QR code failed
                // We can fix QR codes later using the fixMissingQrCodes function
            }

            // Create passengers and seat reservations
            const passengerInserts = currentBooking.passengers.map((passenger, index) => ({
                booking_id: booking.id,
                seat_id: currentBooking.selectedSeats[index]?.id,
                passenger_name: passenger.fullName,
                passenger_contact_number: currentBooking.client!.phone,
                special_assistance_request: passenger.specialAssistance || null,
            }));

            const { error: passengersError } = await supabase
                .from('passengers')
                .insert(passengerInserts);

            if (passengersError) {
                // Clean up booking if passenger creation fails
                await supabase.from('bookings').delete().eq('id', booking.id);
                throw new Error(`Failed to create passengers: ${passengersError.message}`);
            }

            // Reserve seats
            const seatReservations = currentBooking.selectedSeats.map(seat => ({
                trip_id: currentBooking.trip!.id,
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

            // Handle credit payment
            if (currentBooking.paymentMethod === 'credit') {
                const newBalance = agent.creditBalance - currentBooking.discountedFare;

                if (newBalance < 0) {
                    // Clean up everything if insufficient credit
                    await supabase.from('seat_reservations').delete().eq('booking_id', booking.id);
                    await supabase.from('passengers').delete().eq('booking_id', booking.id);
                    await supabase.from('bookings').delete().eq('id', booking.id);
                    throw new Error('Insufficient credit balance');
                }

                // Update agent credit balance
                const { error: creditError } = await supabase
                    .from('user_profiles')
                    .update({ credit_balance: newBalance })
                    .eq('id', agent.id);

                if (creditError) {
                    console.warn('Failed to update credit balance:', creditError);
                }

                // Create credit transaction record
                try {
                    await supabase
                        .from('agent_credit_transactions')
                        .insert({
                            agent_id: agent.id,
                            amount: -currentBooking.discountedFare,
                            transaction_type: 'deduction',
                            booking_id: booking.id,
                            description: `Booking payment for ${currentBooking.route?.fromIsland?.name || 'Unknown'} to ${currentBooking.route?.toIsland?.name || 'Unknown'}`,
                            balance_after: newBalance,
                        });
                } catch (transactionError) {
                    console.warn('Failed to create credit transaction record:', transactionError);
                }
            }

            // Handle free ticket payment
            if (currentBooking.paymentMethod === 'free') {
                const ticketsNeeded = currentBooking.selectedSeats.length;

                if (agent.freeTicketsRemaining < ticketsNeeded) {
                    // Clean up booking if insufficient free tickets
                    await supabase.from('seat_reservations').delete().eq('booking_id', booking.id);
                    await supabase.from('passengers').delete().eq('booking_id', booking.id);
                    await supabase.from('bookings').delete().eq('id', booking.id);
                    throw new Error(`Insufficient free tickets. Need ${ticketsNeeded}, have ${agent.freeTicketsRemaining}`);
                }

                const newFreeTicketsRemaining = agent.freeTicketsRemaining - ticketsNeeded;

                // Update agent free tickets remaining
                const { error: freeTicketError } = await supabase
                    .from('user_profiles')
                    .update({ free_tickets_remaining: newFreeTicketsRemaining })
                    .eq('id', agent.id);

                if (freeTicketError) {
                    console.warn('Failed to update free tickets remaining:', freeTicketError);
                } else {
                    // Update local agent state
                    set(state => ({
                        ...state,
                        agent: state.agent ? {
                            ...state.agent,
                            freeTicketsRemaining: newFreeTicketsRemaining
                        } : null
                    }));
                }

                // Create free ticket transaction record
                try {
                    await supabase
                        .from('agent_credit_transactions')
                        .insert({
                            agent_id: agent.id,
                            amount: 0, // Free tickets don't affect credit balance
                            transaction_type: 'deduction',
                            booking_id: booking.id,
                            description: `Free ticket booking for ${currentBooking.route?.fromIsland?.name || 'Unknown'} to ${currentBooking.route?.toIsland?.name || 'Unknown'} (${ticketsNeeded} tickets used)`,
                            balance_after: agent.creditBalance, // Credit balance unchanged
                        });
                } catch (transactionError) {
                    console.warn('Failed to create free ticket transaction record:', transactionError);
                }
            }

            // Handle return trip for round-trip bookings
            let returnBookingId = null;
            if (currentBooking.tripType === 'round_trip' && currentBooking.returnTrip) {
                const returnBookingData = {
                    user_id: bookingUserId,
                    agent_id: agent.id,
                    agent_client_id: agentClientId,
                    trip_id: currentBooking.returnTrip.id,
                    total_fare: (currentBooking.returnSelectedSeats.length * (currentBooking.returnRoute?.baseFare || 0)) * (1 - (agent.discountRate || 0) / 100),
                    payment_method_type: currentBooking.paymentMethod,
                    status: 'confirmed' as const,
                    is_round_trip: true,
                    return_booking_id: null,
                };

                const { data: returnBooking, error: returnBookingError } = await supabase
                    .from('bookings')
                    .insert(returnBookingData)
                    .select()
                    .single();

                if (returnBookingError) {
                    console.error('Return booking creation error:', returnBookingError);
                    throw new Error(`Failed to create return booking: ${returnBookingError.message}`);
                }

                returnBookingId = returnBooking.id;

                // Generate return QR code data with actual booking details
                const finalReturnQrCodeData = JSON.stringify({
                    bookingNumber: returnBooking.booking_number,
                    bookingId: returnBooking.id,
                    tripId: currentBooking.returnTrip.id,
                    departureDate: currentBooking.returnTrip.travel_date || currentBooking.returnDate,
                    departureTime: currentBooking.returnTrip.departure_time,
                    passengers: currentBooking.passengers.length,
                    seats: currentBooking.returnSelectedSeats.map(seat => seat.number),
                    totalFare: (currentBooking.returnSelectedSeats.length * (currentBooking.returnRoute?.baseFare || 0)) * (1 - (agent.discountRate || 0) / 100),
                    timestamp: new Date().toISOString(),
                    // Agent-specific additional fields
                    clientName: currentBooking.client.name,
                    clientEmail: currentBooking.client.email,
                    clientHasAccount: currentBooking.client.hasAccount,
                    clientUserProfileId: currentBooking.client.userProfileId || null,
                    agentId: agent.id,
                    agentName: agent.name || agent.email,
                    agentClientId: agentClientId,
                    type: 'agent-booking-return'
                });

                // Debug: Log return QR code generation details
                console.log('Return QR Code Generation Details:', {
                    returnBookingId: returnBooking.id,
                    returnBookingNumber: returnBooking.booking_number,
                    clientHasAccount: currentBooking.client.hasAccount,
                    returnQrDataLength: finalReturnQrCodeData.length,
                });

                // Update return booking with QR code data
                console.log('Attempting to update return QR code for booking:', returnBooking.id, 'Data length:', finalReturnQrCodeData.length);

                // Enhanced return QR code update with retry mechanism
                let returnQrUpdateSuccess = false;
                let returnQrUpdateAttempts = 0;
                const maxReturnRetries = 3;

                while (!returnQrUpdateSuccess && returnQrUpdateAttempts < maxReturnRetries) {
                    returnQrUpdateAttempts++;

                    const { data: returnQrUpdateResult, error: returnQrUpdateError } = await supabase
                        .from('bookings')
                        .update({ qr_code_url: finalReturnQrCodeData })
                        .eq('id', returnBooking.id)
                        .select('id, qr_code_url, booking_number');

                    if (returnQrUpdateError) {
                        console.error(`Return QR code update attempt ${returnQrUpdateAttempts} failed:`, returnQrUpdateError);

                        if (returnQrUpdateAttempts === 1) {
                            // On first failure, log detailed error information
                            console.error('Return QR Update Error Details:', {
                                returnBookingId: returnBooking.id,
                                returnBookingNumber: returnBooking.booking_number,
                                error: returnQrUpdateError,
                                errorCode: returnQrUpdateError.code,
                                errorMessage: returnQrUpdateError.message,
                                errorDetails: returnQrUpdateError.details,
                                errorHint: returnQrUpdateError.hint,
                                qrDataLength: finalReturnQrCodeData.length,
                                clientType: currentBooking.client.hasAccount ? 'with_account' : 'without_account',
                                bookingUserId: bookingUserId,
                                agentId: agent.id
                            });
                        }

                        // Wait before retry
                        if (returnQrUpdateAttempts < maxReturnRetries) {
                            await new Promise(resolve => setTimeout(resolve, 500 * returnQrUpdateAttempts));
                        }
                    } else {
                        console.log(`Return QR code update attempt ${returnQrUpdateAttempts} succeeded for booking:`, returnBooking.booking_number, 'ID:', returnBooking.id);
                        returnQrUpdateSuccess = true;

                        // Verify return QR code storage
                        await new Promise(resolve => setTimeout(resolve, 200));

                        try {
                            const { data: returnVerifyData, error: returnVerifyError } = await supabase
                                .from('bookings')
                                .select('qr_code_url, booking_number')
                                .eq('id', returnBooking.id)
                                .single();

                            if (returnVerifyError) {
                                console.error('Failed to verify return QR code storage:', returnVerifyError);
                                returnQrUpdateSuccess = false; // Retry if verification fails
                            } else if (!returnVerifyData.qr_code_url) {
                                console.error('Return QR code verification failed: No data found for booking:', returnBooking.id);
                                console.error('Return verification result:', returnVerifyData);
                                returnQrUpdateSuccess = false; // Retry if no data found
                            } else {
                                console.log('Return QR code verification successful for booking:', returnVerifyData.booking_number);
                                console.log('Return stored QR data length:', returnVerifyData.qr_code_url.length);
                                console.log('Return QR data preview:', returnVerifyData.qr_code_url.substring(0, 100) + '...');
                            }
                        } catch (returnVerifyException) {
                            console.error('Exception during return QR code verification:', returnVerifyException);
                            returnQrUpdateSuccess = false; // Retry if verification throws
                        }
                    }
                }

                if (!returnQrUpdateSuccess) {
                    console.error(`Failed to update return QR code after ${maxReturnRetries} attempts for booking:`, returnBooking.id);
                    // Don't throw error - booking was created successfully, just QR code failed
                }

                // Create return trip passengers
                const returnPassengerInserts = currentBooking.passengers.map((passenger, index) => ({
                    booking_id: returnBooking.id,
                    seat_id: currentBooking.returnSelectedSeats[index]?.id,
                    passenger_name: passenger.fullName,
                    passenger_contact_number: currentBooking.client!.phone,
                    special_assistance_request: passenger.specialAssistance || null,
                }));

                const { error: returnPassengersError } = await supabase
                    .from('passengers')
                    .insert(returnPassengerInserts);

                if (returnPassengersError) {
                    console.warn('Failed to create return passengers:', returnPassengersError);
                }

                // Reserve return seats
                const returnSeatReservations = currentBooking.returnSelectedSeats.map(seat => ({
                    trip_id: currentBooking.returnTrip!.id,
                    seat_id: seat.id,
                    booking_id: returnBooking.id,
                    is_available: false,
                    is_reserved: false,
                }));

                const { error: returnSeatError } = await supabase
                    .from('seat_reservations')
                    .upsert(returnSeatReservations, { onConflict: 'trip_id,seat_id' });

                if (returnSeatError) {
                    console.warn('Failed to reserve return seats:', returnSeatError);
                }

                // Handle credit payment for return trip
                if (currentBooking.paymentMethod === 'credit') {
                    const returnFare = (currentBooking.returnSelectedSeats.length * (currentBooking.returnRoute?.baseFare || 0)) * (1 - (agent.discountRate || 0) / 100);
                    const currentBalance = await supabase
                        .from('user_profiles')
                        .select('credit_balance')
                        .eq('id', agent.id)
                        .single();

                    if (currentBalance.data) {
                        const newBalance = currentBalance.data.credit_balance - returnFare;

                        const { error: returnCreditError } = await supabase
                            .from('user_profiles')
                            .update({ credit_balance: newBalance })
                            .eq('id', agent.id);

                        if (returnCreditError) {
                            console.warn('Failed to update credit balance for return trip:', returnCreditError);
                        }

                        // Create credit transaction record for return trip
                        try {
                            await supabase
                                .from('agent_credit_transactions')
                                .insert({
                                    agent_id: agent.id,
                                    amount: -returnFare,
                                    transaction_type: 'deduction',
                                    booking_id: returnBooking.id,
                                    description: `Return booking payment for ${currentBooking.returnRoute?.fromIsland?.name || 'Unknown'} to ${currentBooking.returnRoute?.toIsland?.name || 'Unknown'}`,
                                    balance_after: newBalance,
                                });
                        } catch (transactionError) {
                            console.warn('Failed to create return credit transaction record:', transactionError);
                        }
                    }
                }

                // Handle free ticket payment for return trip
                if (currentBooking.paymentMethod === 'free') {
                    const returnTicketsNeeded = currentBooking.returnSelectedSeats.length;

                    // Get current free tickets remaining (may have been updated by departure booking)
                    const currentAgent = get().agent;
                    if (!currentAgent || currentAgent.freeTicketsRemaining < returnTicketsNeeded) {
                        console.warn(`Insufficient free tickets for return trip. Need ${returnTicketsNeeded}, have ${currentAgent?.freeTicketsRemaining || 0}`);
                    } else {
                        const newFreeTicketsRemaining = currentAgent.freeTicketsRemaining - returnTicketsNeeded;

                        // Update agent free tickets remaining for return trip
                        const { error: returnFreeTicketError } = await supabase
                            .from('user_profiles')
                            .update({ free_tickets_remaining: newFreeTicketsRemaining })
                            .eq('id', agent.id);

                        if (returnFreeTicketError) {
                            console.warn('Failed to update free tickets remaining for return trip:', returnFreeTicketError);
                        } else {
                            // Update local agent state for return trip
                            set(state => ({
                                ...state,
                                agent: state.agent ? {
                                    ...state.agent,
                                    freeTicketsRemaining: newFreeTicketsRemaining
                                } : null
                            }));
                        }

                        // Create free ticket transaction record for return trip
                        try {
                            await supabase
                                .from('agent_credit_transactions')
                                .insert({
                                    agent_id: agent.id,
                                    amount: 0, // Free tickets don't affect credit balance
                                    transaction_type: 'deduction',
                                    booking_id: returnBooking.id,
                                    description: `Free ticket return booking for ${currentBooking.returnRoute?.fromIsland?.name || 'Unknown'} to ${currentBooking.returnRoute?.toIsland?.name || 'Unknown'} (${returnTicketsNeeded} tickets used)`,
                                    balance_after: agent.creditBalance, // Credit balance unchanged
                                });
                        } catch (transactionError) {
                            console.warn('Failed to create return free ticket transaction record:', transactionError);
                        }
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
            return { bookingId: booking.id, returnBookingId };

        } catch (error: any) {
            console.error('Error creating booking:', error);
            set({
                error: error.message || 'Failed to create booking',
                isLoading: false
            });
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

    setError: (error) => set({ error }),
    setLoading: (isLoading) => set({ isLoading }),
    setAgent: (agent) => set({ agent }),

    setOnBookingCreated: (callback) => set({ onBookingCreated: callback }),

    // QR Code utilities
    parseQrCodeData: (qrCodeString: string) => {
        try {
            const qrData = JSON.parse(qrCodeString);
            return qrData;
        } catch (error) {
            console.error('Error parsing QR code data:', error);
            return null;
        }
    },

    generateQrCodeData: (booking: any, agent: Agent, type: string = 'agent-booking') => {
        try {
            // Match user booking structure with agent-specific additions
            const qrCodeData = {
                bookingNumber: booking.booking_number || booking.bookingNumber,
                bookingId: booking.id,
                tripId: booking.trip_id || booking.tripId,
                departureDate: booking.travel_date || booking.departureDate,
                departureTime: booking.departure_time || booking.departureTime,
                passengers: booking.passengers?.length || booking.passengerCount || 0,
                seats: booking.seats || [],
                totalFare: booking.total_fare || booking.totalAmount || 0,
                timestamp: new Date().toISOString(),
                // Agent-specific additional fields
                clientName: booking.clientName || booking.client?.name || 'Unknown Client',
                agentId: agent.id,
                agentName: agent.name || agent.email,
                type: type
            };

            return JSON.stringify(qrCodeData);
        } catch (error) {
            console.error('Error generating QR code data:', error);
            return '';
        }
    },

    validateQrCodeData: (qrCodeData: any) => {
        try {
            // Check required fields
            const requiredFields = [
                'bookingNumber',
                'bookingId',
                'tripId',
                'departureDate',
                'agentId',
                'type'
            ];

            for (const field of requiredFields) {
                if (!qrCodeData[field]) {
                    console.warn(`Missing required QR code field: ${field}`);
                    return false;
                }
            }

            // Validate booking type
            const validTypes = ['agent-booking', 'agent-booking-return', 'customer-booking'];
            if (!validTypes.includes(qrCodeData.type)) {
                console.warn(`Invalid QR code type: ${qrCodeData.type}`);
                return false;
            }

            // Validate timestamp format
            if (qrCodeData.timestamp && isNaN(Date.parse(qrCodeData.timestamp))) {
                console.warn('Invalid timestamp in QR code data');
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error validating QR code data:', error);
            return false;
        }
    },

    verifyQrCodeStorage: async (bookingId: string) => {
        try {
            const { data: booking, error } = await supabase
                .from('bookings')
                .select('id, qr_code_url')
                .eq('id', bookingId)
                .single();

            if (error) {
                console.error('Error retrieving booking for QR code verification:', error);
                return false;
            }

            if (!booking?.qr_code_url) {
                console.warn('No QR code data found for booking:', bookingId);
                return false;
            }

            // Try to parse the QR code data
            const qrData = get().parseQrCodeData(booking.qr_code_url);
            if (!qrData) {
                console.error('Failed to parse stored QR code data for booking:', bookingId);
                return false;
            }

            // Validate the QR code structure
            const isValid = get().validateQrCodeData(qrData);
            if (!isValid) {
                console.error('Invalid QR code structure for booking:', bookingId);
                return false;
            }

            console.log('QR code successfully verified for booking:', bookingId);
            return true;
        } catch (error) {
            console.error('Error verifying QR code storage:', error);
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
            console.error('Error in refreshAgentData:', error);
        }
    },

    // QR Code debugging and testing
    testQrCodeFunctionality: async () => {
        try {
            const { agent } = get();
            if (!agent) {
                console.error('No agent available for QR code testing');
                return;
            }

            // Test QR code generation
            const mockBooking = {
                id: 'test-booking-id',
                booking_number: 'TRA-TEST-001',
                clientName: 'Test Client',
                trip_id: 'test-trip-id',
                origin: 'Test Origin',
                destination: 'Test Destination',
                travel_date: '2024-01-20',
                departure_time: '14:30',
                passengers: [{ fullName: 'Test Passenger' }],
                seats: ['A1', 'A2'],
                total_fare: 500,
                totalAmount: 500
            };

            console.log('Testing QR code generation...');
            const qrCodeData = get().generateQrCodeData(mockBooking, agent, 'agent-booking');
            console.log('Generated QR code data:', qrCodeData);

            // Test QR code parsing
            console.log('Testing QR code parsing...');
            const parsedData = get().parseQrCodeData(qrCodeData);
            console.log('Parsed QR code data:', parsedData);

            // Test QR code validation
            console.log('Testing QR code validation...');
            const isValid = get().validateQrCodeData(parsedData);
            console.log('QR code validation result:', isValid);

            // Test database connection for QR code storage
            console.log('Testing database connection for QR codes...');
            const { data: testResult, error: testError } = await supabase
                .from('bookings')
                .select('id, qr_code_url, user_id, agent_id')
                .limit(5);

            if (testError) {
                console.error('Database connection test failed:', testError);
            } else {
                console.log('Database connection successful for QR codes');
                if (testResult && testResult.length > 0) {
                    console.log('Sample bookings QR codes:');
                    testResult.forEach((booking, index) => {
                        console.log(`Booking ${index + 1}:`, {
                            id: booking.id,
                            user_id: booking.user_id,
                            agent_id: booking.agent_id,
                            hasQrCode: !!booking.qr_code_url,
                            qrCodeLength: booking.qr_code_url?.length || 0
                        });
                    });
                }
            }

            // Test permissions for different user types
            console.log('Testing QR code update permissions...');

            // Test updating as agent
            try {
                const testQrData = JSON.stringify({ test: 'agent-test', timestamp: new Date().toISOString() });
                const { data: agentTestResult, error: agentTestError } = await supabase
                    .from('bookings')
                    .select('id')
                    .eq('agent_id', agent.id)
                    .limit(1);

                if (agentTestResult && agentTestResult.length > 0) {
                    const testBookingId = agentTestResult[0].id;
                    const { error: updateError } = await supabase
                        .from('bookings')
                        .update({ qr_code_url: testQrData })
                        .eq('id', testBookingId);

                    if (updateError) {
                        console.error('QR code update permission test failed:', updateError);
                    } else {
                        console.log('QR code update permission test passed for agent');

                        // Restore original QR code if it existed
                        const originalQr = testResult?.find(b => b.id === testBookingId)?.qr_code_url;
                        if (originalQr) {
                            await supabase
                                .from('bookings')
                                .update({ qr_code_url: originalQr })
                                .eq('id', testBookingId);
                        }
                    }
                } else {
                    console.log('No agent bookings found for permission test');
                }
            } catch (permError) {
                console.error('Permission test exception:', permError);
            }

        } catch (error) {
            console.error('QR code functionality test error:', error);
        }
    },

    // Test QR code issues specifically for clients with accounts
    debugClientAccountQrIssue: async () => {
        try {
            const { agent } = get();
            if (!agent) {
                console.error('No agent available for client account QR debug');
                return;
            }

            console.log('Debugging QR code issues for clients with accounts...');

            // Check recent agent bookings with different client types
            const { data: recentBookings, error: bookingsError } = await supabase
                .from('bookings')
                .select(`
                    id,
                    booking_number,
                    user_id,
                    agent_id,
                    agent_client_id,
                    qr_code_url,
                    agent_clients(id, client_id),
                    user_profiles(id, full_name)
                `)
                .eq('agent_id', agent.id)
                .order('created_at', { ascending: false })
                .limit(10);

            if (bookingsError) {
                console.error('Failed to fetch recent bookings for debug:', bookingsError);
                return;
            }

            console.log('Recent agent bookings analysis:');
            recentBookings?.forEach((booking: any, index: number) => {
                const clientHasAccount = !!(booking.agent_clients && booking.agent_clients.client_id);
                console.log(`Booking ${index + 1}:`, {
                    id: booking.id,
                    bookingNumber: booking.booking_number,
                    userId: booking.user_id,
                    agentClientId: booking.agent_client_id,
                    clientHasAccount: clientHasAccount,
                    hasQrCode: !!booking.qr_code_url,
                    qrCodeLength: booking.qr_code_url?.length || 0,
                    clientName: (booking.user_profiles && booking.user_profiles.full_name) || 'Unknown'
                });
            });

            return recentBookings;
        } catch (error) {
            console.error('Client account QR debug error:', error);
        }
    },

    // Fix missing QR codes for agent bookings
    fixMissingQrCodes: async () => {
        try {
            const { agent } = get();
            if (!agent) {
                console.error('No agent available for QR code fix');
                return;
            }

            console.log('Fixing missing QR codes for agent bookings...');

            // Find agent bookings without QR codes
            const { data: missingQrBookings, error: fetchError } = await supabase
                .from('bookings')
                .select(`
                    id,
                    booking_number,
                    user_id,
                    agent_id,
                    agent_client_id,
                    qr_code_url,
                    total_fare,
                    is_round_trip,
                    trip:trip_id(
                        id,
                        travel_date,
                        departure_time
                    ),
                    passengers(
                        passenger_name,
                        seat:seat_id(seat_number)
                    ),
                    agent_clients(
                        id,
                        full_name,
                        client_id
                    )
                `)
                .eq('agent_id', agent.id)
                .or('qr_code_url.is.null,qr_code_url.eq.')
                .order('created_at', { ascending: false })
                .limit(10);

            if (fetchError) {
                console.error('Failed to fetch bookings with missing QR codes:', fetchError);
                return;
            }

            if (!missingQrBookings || missingQrBookings.length === 0) {
                console.log('No bookings found with missing QR codes');
                return;
            }

            console.log(`Found ${missingQrBookings.length} bookings with missing QR codes`);

            // Fix each booking's QR code
            for (const booking of missingQrBookings) {
                try {
                    const bookingData = booking as any; // Type assertion for complex nested data
                    const clientHasAccount = !!(bookingData.agent_clients && bookingData.agent_clients.client_id);
                    const clientName = (bookingData.agent_clients && bookingData.agent_clients.full_name) || 'Unknown Client';

                    // Generate QR code data
                    const qrCodeData = JSON.stringify({
                        bookingNumber: bookingData.booking_number,
                        bookingId: bookingData.id,
                        tripId: (bookingData.trip && bookingData.trip.id) || null,
                        departureDate: (bookingData.trip && bookingData.trip.travel_date) || null,
                        departureTime: (bookingData.trip && bookingData.trip.departure_time) || null,
                        passengers: (bookingData.passengers && bookingData.passengers.length) || 0,
                        seats: (bookingData.passengers && bookingData.passengers.map((p: any) => p.seat?.seat_number).filter(Boolean)) || [],
                        totalFare: bookingData.total_fare,
                        timestamp: new Date().toISOString(),
                        clientName: clientName,
                        clientEmail: (bookingData.agent_clients && bookingData.agent_clients.full_name) || 'Unknown Email',
                        clientHasAccount: clientHasAccount,
                        clientUserProfileId: (bookingData.agent_clients && bookingData.agent_clients.client_id) || null,
                        agentId: agent.id,
                        agentName: agent.name || agent.email,
                        agentClientId: bookingData.agent_client_id,
                        type: bookingData.is_round_trip ? 'agent-booking-return' : 'agent-booking'
                    });

                    console.log(`Fixing QR code for booking ${bookingData.booking_number} (Client has account: ${clientHasAccount})`);

                    // Update the booking with QR code
                    const { error: updateError } = await supabase
                        .from('bookings')
                        .update({ qr_code_url: qrCodeData })
                        .eq('id', bookingData.id);

                    if (updateError) {
                        console.error(`Failed to fix QR code for booking ${bookingData.booking_number}:`, updateError);
                    } else {
                        console.log(`Successfully fixed QR code for booking ${bookingData.booking_number}`);
                    }

                    // Small delay to avoid overwhelming the database
                    await new Promise(resolve => setTimeout(resolve, 100));

                } catch (bookingError) {
                    console.error(`Error processing booking:`, bookingError);
                }
            }

            console.log('QR code fix process completed');

        } catch (error) {
            console.error('Error in fixMissingQrCodes:', error);
        }
    },


})); 