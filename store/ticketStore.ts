import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import type { TicketStoreState } from '@/types/booking';
import type { Booking, Route, BookingStatus } from '@/types';

interface TicketStoreActions {
    validateTicket: (bookingNumber: string) => Promise<{
        isValid: boolean;
        booking: Booking | null;
        message: string;
        isOwnBooking?: boolean;
    }>;
    setError: (error: string | null) => void;
    setLoading: (isLoading: boolean) => void;
}

interface TicketStore extends TicketStoreState, TicketStoreActions { }

export const useTicketStore = create<TicketStore>((set, get) => ({
    // State
    isLoading: false,
    error: null,

    // Actions
    validateTicket: async (bookingNumber: string) => {
        const { setError, setLoading } = get();

        if (!bookingNumber?.trim()) {
            return {
                isValid: false,
                booking: null,
                message: "Please enter a booking number"
            };
        }

        // Clean and format booking number
        const cleanBookingNumber = bookingNumber.trim().toUpperCase();

        setLoading(true);
        setError(null);

        try {
            // Get current user for ownership check
            const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();

            // Try to find the specific booking with exact match
            const { data: basicBooking, error: basicError } = await supabase
                .from('bookings')
                .select('id, booking_number, user_id, agent_id, agent_client_id, status, check_in_status')
                .eq('booking_number', cleanBookingNumber)
                .maybeSingle();

            let bookingData = basicBooking;

            // If the basic query had an error, try case-insensitive search
            if (basicError) {
                const { data: caseInsensitiveBooking, error: caseError } = await supabase
                    .from('bookings')
                    .select('id, booking_number, user_id, agent_id, agent_client_id, status, check_in_status')
                    .ilike('booking_number', cleanBookingNumber)
                    .maybeSingle();

                if (caseInsensitiveBooking) {
                    bookingData = caseInsensitiveBooking;
                }
            }

            // If still no booking found, try pattern matching
            if (!bookingData && !basicError) {
                const { data: patternBookings, error: patternError } = await supabase
                    .from('bookings')
                    .select('id, booking_number, user_id, agent_id, agent_client_id, status, check_in_status')
                    .like('booking_number', `%${cleanBookingNumber}%`)
                    .limit(5);

                if (patternBookings && patternBookings.length === 1) {
                    bookingData = patternBookings[0];
                }
            }

            // If no booking found with direct queries, try the RPC function as fallback
            if (!bookingData) {
                try {
                    const { data: rpcData, error: rpcError } = await supabase
                        .rpc('validate_booking_public', {
                            p_booking_number: cleanBookingNumber
                        });

                    if (!rpcError && rpcData && rpcData.length > 0) {
                        bookingData = rpcData[0];
                    }
                } catch (rpcError) {
                    // RPC function failed, continue with null booking
                }
            }

            // If still no booking found - this could be a fake/fraudulent ticket
            if (!bookingData) {
                return {
                    isValid: false,
                    booking: null,
                    message: "Ticket not found. This may be a fake or fraudulent ticket."
                };
            }

            // FIRST: Try to get complete data using the validation function (works for all tickets)
            let finalBookingData: any = null;
            let fetchedTripData: any = null;
            let isOwnBooking = false;

            try {
                // Use the validation function to get complete, reliable data
                const { data: validationData, error: validationError } = await supabase
                    .rpc('validate_ticket_details', {
                        p_booking_number: cleanBookingNumber
                    });

                // Debug: Log the validation function result
                console.log('Validation function result:', { validationData, validationError });

                if (!validationError && validationData && validationData.length > 0) {
                    const ticket = validationData[0];

                    // Create complete booking data from validation function
                    finalBookingData = {
                        id: ticket.booking_id,
                        booking_number: ticket.booking_number,
                        status: ticket.status,
                        total_fare: ticket.total_fare || 0,
                        qr_code_url: null, // We'll try to get this separately if it's the user's own booking
                        check_in_status: ticket.check_in_status,
                        agent_id: ticket.agent_id,
                        agent_client_id: ticket.agent_client_id,
                        user_id: ticket.user_id,
                        created_at: new Date().toISOString(),
                        trip_id: null
                    };

                    // Create complete trip data from validation function
                    fetchedTripData = {
                        travel_date: ticket.travel_date,
                        departure_time: ticket.departure_time,
                        route: {
                            from_island: {
                                name: ticket.from_island_name || 'Unknown',
                                zone: ticket.from_island_zone || 'A'
                            },
                            to_island: {
                                name: ticket.to_island_name || 'Unknown',
                                zone: ticket.to_island_zone || 'A'
                            },
                            base_fare: ticket.base_fare || 0
                        },
                        vessel: { name: ticket.vessel_name || 'Unknown Vessel' }
                    };

                    // Check ownership using the validation data
                    if (currentUser) {
                        if (ticket.agent_id === currentUser.id) {
                            isOwnBooking = true;
                        } else if (!ticket.agent_id && ticket.user_id === currentUser.id) {
                            isOwnBooking = true;
                        } else if (ticket.agent_client_id) {
                            try {
                                const { data: clientData, error: clientError } = await supabase
                                    .from('agent_clients')
                                    .select('client_id')
                                    .eq('id', ticket.agent_client_id)
                                    .single();

                                if (!clientError && clientData?.client_id === currentUser.id) {
                                    isOwnBooking = true;
                                }
                            } catch (clientCheckError) {
                                // Client check failed, continue with false
                            }
                        }
                    }

                    // If this is the user's own booking, try to get additional data like QR code
                    if (isOwnBooking) {
                        try {
                            const { data: ownBookingData, error: ownError } = await supabase
                                .from('bookings')
                                .select('qr_code_url, total_fare, created_at')
                                .eq('id', ticket.booking_id)
                                .single();

                            if (!ownError && ownBookingData) {
                                finalBookingData.qr_code_url = ownBookingData.qr_code_url;
                                finalBookingData.total_fare = ownBookingData.total_fare || ticket.total_fare;
                                finalBookingData.created_at = ownBookingData.created_at;
                            }
                        } catch (ownBookingError) {
                            // Continue with validation data
                        }
                    }

                    finalBookingData.trip = fetchedTripData;
                }
            } catch (functionError) {
                // If validation function fails, try the view approach
                console.log('Validation function failed:', functionError);

                try {
                    const { data: viewData, error: viewError } = await supabase
                        .from('ticket_validation_view')
                        .select('*')
                        .eq('booking_number', cleanBookingNumber)
                        .single();

                    console.log('View query result:', { viewData, viewError });

                    if (!viewError && viewData) {
                        finalBookingData = {
                            id: viewData.booking_id,
                            booking_number: viewData.booking_number,
                            status: viewData.status,
                            total_fare: viewData.total_fare || 0,
                            qr_code_url: null,
                            check_in_status: viewData.check_in_status,
                            agent_id: viewData.agent_id,
                            agent_client_id: viewData.agent_client_id,
                            user_id: viewData.user_id,
                            created_at: new Date().toISOString(),
                            trip_id: null
                        };

                        fetchedTripData = {
                            travel_date: viewData.travel_date,
                            departure_time: viewData.departure_time,
                            route: {
                                from_island: {
                                    name: viewData.from_island_name || 'Unknown',
                                    zone: viewData.from_island_zone || 'A'
                                },
                                to_island: {
                                    name: viewData.to_island_name || 'Unknown',
                                    zone: viewData.to_island_zone || 'A'
                                },
                                base_fare: viewData.base_fare || 0
                            },
                            vessel: { name: viewData.vessel_name || 'Unknown Vessel' }
                        };

                        // Check ownership using the view data
                        if (currentUser) {
                            if (viewData.agent_id === currentUser.id) {
                                isOwnBooking = true;
                            } else if (!viewData.agent_id && viewData.user_id === currentUser.id) {
                                isOwnBooking = true;
                            } else if (viewData.agent_client_id) {
                                try {
                                    const { data: clientData, error: clientError } = await supabase
                                        .from('agent_clients')
                                        .select('client_id')
                                        .eq('id', viewData.agent_client_id)
                                        .single();

                                    if (!clientError && clientData?.client_id === currentUser.id) {
                                        isOwnBooking = true;
                                    }
                                } catch (clientCheckError) {
                                    // Client check failed, continue with false
                                }
                            }
                        }

                        finalBookingData.trip = fetchedTripData;
                    }
                } catch (viewError) {
                    console.log('View query also failed:', viewError);
                }
            }

            // ENHANCED FALLBACK: If validation function and view didn't work, try manual data assembly
            if (!finalBookingData && bookingData) {
                console.log('Using enhanced fallback method with manual data assembly');

                // Try to get trip data using basic joins
                try {
                    const { data: tripInfo, error: tripInfoError } = await supabase
                        .from('bookings')
                        .select(`
                            id,
                            booking_number,
                            status,
                            total_fare,
                            check_in_status,
                            agent_id,
                            agent_client_id,
                            user_id,
                            created_at,
                            trip_id
                        `)
                        .eq('id', bookingData.id)
                        .single();

                    if (!tripInfoError && tripInfo && tripInfo.trip_id) {
                        // Get trip details separately
                        const { data: tripDetails, error: tripError } = await supabase
                            .from('trips')
                            .select(`
                                travel_date,
                                departure_time,
                                route_id,
                                vessel_id
                            `)
                            .eq('id', tripInfo.trip_id)
                            .single();

                        if (!tripError && tripDetails) {
                            // Get route details
                            const { data: routeDetails, error: routeError } = await supabase
                                .from('routes')
                                .select(`
                                    from_island_id,
                                    to_island_id,
                                    base_fare
                                `)
                                .eq('id', tripDetails.route_id)
                                .single();

                            // Get islands and vessel details
                            let fromIsland = { name: 'Unknown', zone: 'A' };
                            let toIsland = { name: 'Unknown', zone: 'A' };
                            let vessel = { name: 'Unknown Vessel' };

                            if (!routeError && routeDetails) {
                                // Get from island
                                try {
                                    const { data: fromIslandData } = await supabase
                                        .from('islands')
                                        .select('name, zone')
                                        .eq('id', routeDetails.from_island_id)
                                        .single();
                                    if (fromIslandData) fromIsland = fromIslandData;
                                } catch (e) { }

                                // Get to island
                                try {
                                    const { data: toIslandData } = await supabase
                                        .from('islands')
                                        .select('name, zone')
                                        .eq('id', routeDetails.to_island_id)
                                        .single();
                                    if (toIslandData) toIsland = toIslandData;
                                } catch (e) { }
                            }

                            // Get vessel
                            try {
                                const { data: vesselData } = await supabase
                                    .from('vessels')
                                    .select('name')
                                    .eq('id', tripDetails.vessel_id)
                                    .single();
                                if (vesselData) vessel = vesselData;
                            } catch (e) { }

                            // Assemble the data
                            finalBookingData = {
                                ...tripInfo,
                                qr_code_url: null, // Will be fetched separately for own bookings
                                trip_id: tripInfo.trip_id
                            };

                            fetchedTripData = {
                                travel_date: tripDetails.travel_date,
                                departure_time: tripDetails.departure_time,
                                route: {
                                    from_island: fromIsland,
                                    to_island: toIsland,
                                    base_fare: routeDetails?.base_fare || 0
                                },
                                vessel: vessel
                            };

                            finalBookingData.trip = fetchedTripData;

                            console.log('Manual assembly successful:', {
                                travel_date: tripDetails.travel_date,
                                from_island: fromIsland.name,
                                to_island: toIsland.name,
                                vessel: vessel.name
                            });
                        }
                    }
                } catch (manualError) {
                    console.log('Manual assembly failed:', manualError);
                }
            }

            // ORIGINAL FALLBACK: If enhanced fallback didn't work, use the original method
            if (!finalBookingData) {
                // Check ownership using basic booking data
                if (currentUser && bookingData) {
                    if (bookingData.agent_id === currentUser.id) {
                        isOwnBooking = true;
                    } else if (!bookingData.agent_id && bookingData.user_id === currentUser.id) {
                        isOwnBooking = true;
                    } else if (bookingData.agent_client_id) {
                        try {
                            const { data: clientData, error: clientError } = await supabase
                                .from('agent_clients')
                                .select('client_id')
                                .eq('id', bookingData.agent_client_id)
                                .single();

                            if (!clientError && clientData?.client_id === currentUser.id) {
                                isOwnBooking = true;
                            }
                        } catch (clientCheckError) {
                            // Client check failed, continue with false
                        }
                    }
                }

                // Try the original full booking query
                const { data: fullBookingData, error: fullError } = await supabase
                    .from('bookings')
                    .select(`
                        id,
                        booking_number,
                        status,
                        total_fare,
                        qr_code_url,
                        check_in_status,
                        agent_id,
                        agent_client_id,
                        user_id,
                        created_at,
                        trip_id,
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
                        )
                    `)
                    .eq('id', bookingData.id)
                    .single();

                if (fullBookingData) {
                    finalBookingData = fullBookingData;
                    fetchedTripData = fullBookingData.trip;
                } else if (bookingData) {
                    // Last resort: use basic booking data
                    finalBookingData = {
                        ...bookingData,
                        total_fare: 0,
                        qr_code_url: null,
                        check_in_status: bookingData.check_in_status || false,
                        created_at: new Date().toISOString(),
                        trip_id: null,
                        trip: null
                    };
                }
            }

            if (!finalBookingData) {
                return {
                    isValid: false,
                    booking: null,
                    message: "Could not retrieve booking details",
                    isOwnBooking
                };
            }

            // Get passenger data
            let passengers: any[] = [];
            try {
                const { data: passengerData, error: passengerError } = await supabase
                    .from('passengers')
                    .select(`
                        passenger_name,
                        passenger_contact_number,
                        special_assistance_request,
                        seat:seat_id(
                            seat_number,
                            row_number,
                            is_window,
                            is_aisle
                        )
                    `)
                    .eq('booking_id', finalBookingData.id);

                if (!passengerError && passengerData) {
                    passengers = passengerData;
                }
            } catch (passengerError) {
                // Error fetching passengers, continue with empty array
            }

            // Parse QR code data
            let qrData = null;
            if (finalBookingData.qr_code_url) {
                try {
                    qrData = JSON.parse(finalBookingData.qr_code_url);
                } catch (qrParseError) {
                    // QR parsing failed, continue without QR data
                }
            }

            // Determine booking type
            let bookingType: 'customer' | 'agent' = finalBookingData.agent_id ? 'agent' : 'customer';
            let clientName = 'Unknown';
            let clientEmail = '';
            let clientPhone = '';

            // Get client information based on booking type
            if (bookingType === 'agent' && finalBookingData.agent_id) {
                // Use QR data for client info if available
                if (qrData?.clientName) {
                    clientName = qrData.clientName;
                    clientEmail = qrData.clientEmail || '';
                } else if (finalBookingData.agent_client_id) {
                    // Fetch from agent_clients table
                    try {
                        const { data: clientData, error: clientError } = await supabase
                            .from('agent_clients')
                            .select(`
                                full_name,
                                email,
                                mobile_number,
                                client_id,
                                client:client_id(
                                    full_name,
                                    email,
                                    mobile_number
                                )
                            `)
                            .eq('id', finalBookingData.agent_client_id)
                            .single();

                        if (!clientError && clientData) {
                            if (clientData.client) {
                                const client = Array.isArray(clientData.client) ? clientData.client[0] : clientData.client;
                                clientName = client?.full_name || 'Unknown Client';
                                clientEmail = client?.email || '';
                                clientPhone = client?.mobile_number || '';
                            } else {
                                clientName = clientData.full_name || 'Unknown Client';
                                clientEmail = clientData.email || '';
                                clientPhone = clientData.mobile_number || '';
                            }
                        }
                    } catch (clientFetchError) {
                        // Error fetching client info, continue with default
                    }
                }
            } else if (bookingType === 'customer' && finalBookingData.user_id) {
                try {
                    const { data: userProfile, error: userError } = await supabase
                        .from('user_profiles')
                        .select('full_name, email, mobile_number')
                        .eq('id', finalBookingData.user_id)
                        .single();

                    if (!userError && userProfile) {
                        clientName = userProfile.full_name || 'Unknown Customer';
                        clientEmail = userProfile.email || '';
                        clientPhone = userProfile.mobile_number || '';
                    }
                } catch (userFetchError) {
                    // Error fetching user info, continue with default
                }
            }

            // Handle trip data - we should have reliable data from validation function or fallback
            let tripData: any = fetchedTripData || finalBookingData?.trip;

            // If trip is an array, take the first element
            if (Array.isArray(tripData) && tripData.length > 0) {
                tripData = tripData[0];
            }

            // Only create default data if absolutely no data could be retrieved (should be very rare now)
            if (!tripData) {
                tripData = {
                    travel_date: new Date().toISOString().split('T')[0], // This should rarely be used now
                    departure_time: '00:00',
                    route: {
                        from_island: { name: 'Unknown', zone: 'A' },
                        to_island: { name: 'Unknown', zone: 'A' },
                        base_fare: 0
                    },
                    vessel: { name: 'Unknown Vessel' }
                };
            }

            // Create the booking object
            const booking: Booking = {
                id: finalBookingData.id,
                bookingNumber: finalBookingData.booking_number,
                status: finalBookingData.status as BookingStatus,
                departureDate: tripData.travel_date,
                departureTime: tripData.departure_time,
                tripType: qrData?.type?.includes('return') ? 'round_trip' : 'one_way',
                route: {
                    id: '',
                    fromIsland: {
                        id: '',
                        name: tripData.route?.from_island?.name || 'Unknown',
                        zone: tripData.route?.from_island?.zone || 'A'
                    },
                    toIsland: {
                        id: '',
                        name: tripData.route?.to_island?.name || 'Unknown',
                        zone: tripData.route?.to_island?.zone || 'A'
                    },
                    baseFare: tripData.route?.base_fare || 0,
                    duration: '2h'
                },
                passengers: passengers.map((p: any) => ({
                    id: '',
                    fullName: p.passenger_name || 'Unknown',
                    idNumber: p.passenger_contact_number || '',
                    specialAssistance: p.special_assistance_request || ''
                })),
                seats: passengers.map((p: any) => ({
                    id: '',
                    number: p.seat?.seat_number || 'N/A',
                    rowNumber: p.seat?.row_number || 0,
                    isWindow: p.seat?.is_window || false,
                    isAisle: p.seat?.is_aisle || false,
                    isAvailable: false,
                    isSelected: false
                })),
                totalFare: finalBookingData.total_fare || 0,
                qrCodeUrl: finalBookingData.qr_code_url,
                checkInStatus: finalBookingData.check_in_status || false,
                vessel: {
                    id: '',
                    name: tripData.vessel?.name || 'Unknown Vessel'
                },
                createdAt: finalBookingData.created_at || '',
                updatedAt: '',
                bookingType: bookingType,
                clientName,
                clientEmail,
                clientPhone,
                agentId: finalBookingData.agent_id || null,
                isAgentBooking: bookingType === 'agent'
            };

            // Validate the booking status and date for fraud detection
            const currentDate = new Date();
            const departureDate = new Date(tripData.travel_date);

            // Check if we have a valid departure date (only invalid if it's NaN or if we explicitly used fallback default)
            const todayFallback = new Date().toISOString().split('T')[0];
            const isValidDepartureDate = !isNaN(departureDate.getTime()) &&
                tripData.travel_date &&
                tripData.travel_date !== '' &&
                // Only consider it invalid if we used fallback AND no real data was found
                !(tripData.travel_date === todayFallback &&
                    (!fetchedTripData || !finalBookingData.trip));

            console.log('Date validation debug:', {
                'tripData.travel_date': tripData.travel_date,
                'todayFallback': todayFallback,
                'departureDate': departureDate,
                'isValidDepartureDate': isValidDepartureDate,
                'fetchedTripData': !!fetchedTripData,
                'finalBookingData.trip': !!finalBookingData.trip
            });

            // Set both dates to start of day for accurate comparison
            const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
            const ticketDate = new Date(departureDate.getFullYear(), departureDate.getMonth(), departureDate.getDate());

            const isValidStatus = finalBookingData.status === 'confirmed';
            const isCheckedIn = finalBookingData.check_in_status;

            let message = '';
            let isValid = false;

            // Priority order for validation messages:
            // 1. Status check (cancelled, etc.)
            // 2. Date validation (expired, today, future) - THIS IS CRITICAL FOR FRAUD DETECTION
            // 3. Already used/checked in (only relevant for valid dates)

            if (!isValidStatus) {
                if (finalBookingData.status === 'cancelled') {
                    message = `Ticket is CANCELLED`;
                } else {
                    message = `Ticket is ${finalBookingData.status.toUpperCase()}`;
                }
                isValid = false;
            } else if (!isValidDepartureDate) {
                // Could not retrieve actual travel date - treat as suspicious
                message = `Unable to verify travel date - ticket validation incomplete`;
                isValid = false;
            } else if (ticketDate < today) {
                // Ticket is for a past date - EXPIRED regardless of check-in status
                message = `Ticket has expired (travel date was ${departureDate.toLocaleDateString()})`;
                isValid = false;
            } else if (ticketDate.getTime() === today.getTime()) {
                // Ticket is for today
                if (isCheckedIn) {
                    message = `Ticket already used for travel today`;
                    isValid = false;
                } else {
                    message = `Valid ticket for travel today (${departureDate.toLocaleDateString()})`;
                    isValid = true;
                }
            } else if (ticketDate > today) {
                // Ticket is for future date
                if (isCheckedIn) {
                    // This shouldn't normally happen (check-in for future travel)
                    message = `Ticket already used for travel (future date: ${departureDate.toLocaleDateString()})`;
                    isValid = false;
                } else {
                    message = `Valid ticket for travel on ${departureDate.toLocaleDateString()}`;
                    isValid = true;
                }
            } else {
                // Fallback case
                message = `Ticket status unclear`;
                isValid = false;
            }

            return {
                isValid,
                booking,
                message,
                isOwnBooking
            };

        } catch (error) {
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

    setError: (error: string | null) => set({ error }),
    setLoading: (isLoading: boolean) => set({ isLoading }),
})); 