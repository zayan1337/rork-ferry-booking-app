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

            // Determine the booking user_id: client's user ID if they have an account, otherwise agent's ID
            const bookingUserId = currentBooking.client.userProfileId || agent.id;

            // Create the booking
            const bookingData = {
                user_id: bookingUserId,
                agent_id: agent.id,
                agent_client_id: agentClientId,
                trip_id: currentBooking.trip.id,
                total_fare: currentBooking.discountedFare,
                payment_method_type: currentBooking.paymentMethod,
                status: 'confirmed' as const,
                is_round_trip: currentBooking.tripType === 'round_trip',
                return_booking_id: null // We'll handle return trips separately if needed
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

            // Generate QR code data for the booking
            const qrCodeData = JSON.stringify({
                bookingNumber: booking.booking_number,
                bookingId: booking.id,
                clientName: currentBooking.client.name,
                tripId: currentBooking.trip.id,
                route: `${currentBooking.route?.fromIsland?.name || 'Unknown'} → ${currentBooking.route?.toIsland?.name || 'Unknown'}`,
                departureDate: currentBooking.trip.travel_date || currentBooking.departureDate,
                departureTime: currentBooking.trip.departure_time,
                passengers: currentBooking.passengers.length,
                seats: currentBooking.selectedSeats.map(seat => seat.number),
                totalFare: currentBooking.discountedFare,
                agentId: agent.id,
                agentName: agent.name || agent.email,
                timestamp: new Date().toISOString(),
                type: 'agent-booking'
            });

            // Update booking with QR code data
            const { error: qrUpdateError } = await supabase
                .from('bookings')
                .update({ qr_code_url: qrCodeData })
                .eq('id', booking.id);

            if (qrUpdateError) {
                console.warn('Failed to update QR code data:', qrUpdateError);
                // Don't throw error as booking is already created
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
                    return_booking_id: null
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

                // Generate QR code data for return booking
                const returnQrCodeData = JSON.stringify({
                    bookingNumber: returnBooking.booking_number,
                    bookingId: returnBooking.id,
                    clientName: currentBooking.client.name,
                    tripId: currentBooking.returnTrip.id,
                    route: `${currentBooking.returnRoute?.fromIsland?.name || 'Unknown'} → ${currentBooking.returnRoute?.toIsland?.name || 'Unknown'}`,
                    departureDate: currentBooking.returnTrip.travel_date || currentBooking.returnDate,
                    departureTime: currentBooking.returnTrip.departure_time,
                    passengers: currentBooking.passengers.length,
                    seats: currentBooking.returnSelectedSeats.map(seat => seat.number),
                    totalFare: (currentBooking.returnSelectedSeats.length * (currentBooking.returnRoute?.baseFare || 0)) * (1 - (agent.discountRate || 0) / 100),
                    agentId: agent.id,
                    agentName: agent.name || agent.email,
                    timestamp: new Date().toISOString(),
                    type: 'agent-booking-return'
                });

                // Update return booking with QR code data
                const { error: returnQrUpdateError } = await supabase
                    .from('bookings')
                    .update({ qr_code_url: returnQrCodeData })
                    .eq('id', returnBooking.id);

                if (returnQrUpdateError) {
                    console.warn('Failed to update return booking QR code data:', returnQrUpdateError);
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

    // Debug function to test database connectivity
    testDatabaseConnections: async () => {
        try {
            const { agent } = get();
            if (!agent) {
                return;
            }

            // Test 1: Check if agent_clients table exists and has data
            const { data: agentClientsTest, error: agentClientsError } = await supabase
                .from('agent_clients')
                .select('count')
                .eq('agent_id', agent.id)
                .limit(1);

            // Test 2: Check if agent_clients_with_details view exists
            const { data: viewTest, error: viewError } = await supabase
                .from('agent_clients_with_details')
                .select('*')
                .eq('agent_id', agent.id)
                .limit(1);

            // Test 3: Check user_profiles table
            const { data: userProfilesTest, error: userProfilesError } = await supabase
                .from('user_profiles')
                .select('id, full_name, email, role')
                .eq('role', 'customer')
                .limit(3);

            // Test 4: Check function exists
            const { data: functionTest, error: functionError } = await supabase
                .rpc('get_or_create_agent_client', {
                    p_agent_id: agent.id,
                    p_email: 'test@example.com',
                    p_full_name: 'Test User'
                });

        } catch (error) {
            console.error('Database test error:', error);
        }
    },
})); 