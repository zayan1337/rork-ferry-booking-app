import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import type { TicketStoreState } from '@/types/booking';
import type { Booking, Route, BookingStatus } from '@/types';

interface TicketStoreActions {
    validateTicket: (bookingNumber: string) => Promise<{
        isValid: boolean;
        booking: Booking | null;
        message: string;
        isOwnBooking?: boolean; // New field to indicate if booking belongs to current user
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

        setLoading(true);
        setError(null);

        try {
            // Get current user for ownership check
            const { data: { user: currentUser } } = await supabase.auth.getUser();

            // First, try a basic search to quickly check if booking exists (this might be restricted by RLS)
            let basicData = null;
            let basicError = null;

            try {
                const basicQuery = await supabase
                    .from('bookings')
                    .select('id, booking_number, user_id, agent_id, agent_client_id, status')
                    .eq('booking_number', bookingNumber)
                    .single();

                basicData = basicQuery.data;
                basicError = basicQuery.error;
            } catch (err) {
                basicError = err;
            }

            // If basic search found nothing due to RLS restrictions, use a public validation function
            let dbBooking = basicData;
            let queryError = basicError;

            if (!basicData && basicError) {
                // Use a database function that can read any booking for validation
                const { data: publicData, error: publicError } = await supabase
                    .rpc('validate_booking_public', {
                        p_booking_number: bookingNumber
                    });

                if (!publicError && publicData && publicData.length > 0) {
                    dbBooking = publicData[0];
                    queryError = null;
                } else {
                    // If the public function also fails, booking truly doesn't exist
                    return {
                        isValid: false,
                        booking: null,
                        message: "Booking not found"
                    };
                }
            }

            // If we still don't have booking data, return not found
            if (!dbBooking) {
                return {
                    isValid: false,
                    booking: null,
                    message: "Booking not found"
                };
            }

            // Check if this booking belongs to the current user
            let isOwnBooking = false;
            if (currentUser) {
                if (dbBooking.agent_id === currentUser.id) {
                    // Current user is the agent who created this booking
                    isOwnBooking = true;
                } else if (!dbBooking.agent_id && dbBooking.user_id === currentUser.id) {
                    // Current user is the customer who created this booking
                    isOwnBooking = true;
                } else if (dbBooking.agent_client_id) {
                    // Check if the current user is the client in an agent booking
                    try {
                        const { data: clientData, error: clientError } = await supabase
                            .from('agent_clients')
                            .select('client_id')
                            .eq('id', dbBooking.agent_client_id)
                            .single();

                        if (!clientError && clientData?.client_id === currentUser.id) {
                            isOwnBooking = true;
                        }
                    } catch (clientCheckError) {
                        // Silently handle client check errors
                    }
                }
            }

            // Now fetch full booking details for validation
            let fullBookingData;

            if (isOwnBooking || !basicError) {
                // User can access this booking normally, or basic search worked
                const { data: fullData, error: fullError } = await supabase
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

                if (!fullError && fullData) {
                    fullBookingData = fullData;
                } else {
                    // Use basic data if full details failed
                    fullBookingData = dbBooking;
                }
            } else {
                // Use the public validation function to get full details
                const { data: publicFullData, error: publicFullError } = await supabase
                    .rpc('get_booking_details_public', {
                        p_booking_number: bookingNumber
                    });

                if (!publicFullError && publicFullData && publicFullData.length > 0) {
                    fullBookingData = publicFullData[0];
                } else {
                    // Fallback to basic data
                    fullBookingData = dbBooking;
                }
            }

            if (!fullBookingData || !fullBookingData.trip || !fullBookingData.trip.route) {
                return {
                    isValid: false,
                    booking: null,
                    message: "Invalid booking data",
                    isOwnBooking
                };
            }

            // Parse QR code data for additional information
            let qrData = null;
            if (fullBookingData.qr_code_url) {
                try {
                    qrData = JSON.parse(fullBookingData.qr_code_url);
                } catch (qrParseError) {
                    // Silently handle QR parsing errors
                }
            }

            // Determine booking type and get client information
            let bookingType: 'customer' | 'agent' = 'customer';
            let clientName = 'Unknown';
            let clientEmail = '';
            let clientPhone = '';
            let agentInfo = null;

            // Use QR data if available for type detection and client info
            if (qrData) {
                if (qrData.type === 'agent-booking' || qrData.type === 'agent-booking-return') {
                    bookingType = 'agent';
                    clientName = qrData.clientName || 'Unknown Client';
                    clientEmail = qrData.clientEmail || '';
                } else if (qrData.type === 'customer-booking') {
                    bookingType = 'customer';
                }
            }

            // Determine booking type from database if QR data is not clear
            if (!qrData || (!qrData.type)) {
                bookingType = fullBookingData.agent_id ? 'agent' : 'customer';
            }

            // Fetch additional details based on booking type
            if (bookingType === 'agent' && fullBookingData.agent_id) {
                try {
                    // Fetch agent profile
                    const { data: agentProfile, error: agentError } = await supabase
                        .from('user_profiles')
                        .select('id, full_name, email, mobile_number')
                        .eq('id', fullBookingData.agent_id)
                        .single();

                    if (!agentError && agentProfile) {
                        agentInfo = agentProfile;
                    }

                    // Fetch client info if agent_client_id exists and we don't have it from QR
                    if (fullBookingData.agent_client_id && !qrData?.clientName) {
                        const { data: clientData, error: clientError } = await supabase
                            .from('agent_clients')
                            .select(`
                                id,
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
                            .eq('id', fullBookingData.agent_client_id)
                            .single();

                        if (!clientError && clientData) {
                            if (clientData.client_id && clientData.client) {
                                // Client has account
                                const nestedClient = Array.isArray(clientData.client) ? clientData.client[0] : clientData.client;
                                clientName = nestedClient?.full_name || 'Unknown Client';
                                clientEmail = nestedClient?.email || '';
                                clientPhone = nestedClient?.mobile_number || '';
                            } else {
                                // Client doesn't have account
                                clientName = clientData.full_name || 'Unknown Client';
                                clientEmail = clientData.email || '';
                                clientPhone = clientData.mobile_number || '';
                            }
                        } else {
                            if (!qrData?.clientName) {
                                clientName = 'Unknown Client';
                            }
                        }
                    }

                    // If we still don't have client info, use agent info as fallback
                    if (clientName === 'Unknown' || clientName === 'Unknown Client') {
                        clientName = agentInfo?.full_name || 'Unknown Client';
                        clientEmail = agentInfo?.email || '';
                        clientPhone = agentInfo?.mobile_number || '';
                    }
                } catch (agentFetchError) {
                    if (!qrData?.clientName) {
                        clientName = 'Unknown Client';
                    }
                }
            } else if (bookingType === 'customer' && fullBookingData.user_id) {
                // This is a customer booking
                try {
                    const { data: userProfile, error: userError } = await supabase
                        .from('user_profiles')
                        .select('full_name, email, mobile_number')
                        .eq('id', fullBookingData.user_id)
                        .single();

                    if (!userError && userProfile) {
                        clientName = userProfile.full_name || 'Unknown Customer';
                        clientEmail = userProfile.email || '';
                        clientPhone = userProfile.mobile_number || '';
                    }
                } catch (userFetchError) {
                    clientName = 'Unknown Customer';
                }
            }

            // Transform database result to our Booking interface
            const booking: Booking = {
                id: fullBookingData.id,
                bookingNumber: fullBookingData.booking_number,
                status: fullBookingData.status as BookingStatus,
                departureDate: fullBookingData.trip.travel_date,
                departureTime: fullBookingData.trip.departure_time,
                tripType: qrData?.type?.includes('return') ? 'round_trip' : 'one_way',
                route: {
                    id: '',
                    fromIsland: {
                        id: '',
                        name: fullBookingData.trip.route.from_island.name,
                        zone: fullBookingData.trip.route.from_island.zone
                    },
                    toIsland: {
                        id: '',
                        name: fullBookingData.trip.route.to_island.name,
                        zone: fullBookingData.trip.route.to_island.zone
                    },
                    baseFare: fullBookingData.trip.route.base_fare,
                    duration: '2h'
                },
                passengers: (fullBookingData.passengers || []).map((p: any) => ({
                    id: '',
                    fullName: p.passenger_name,
                    idNumber: p.passenger_contact_number,
                    specialAssistance: p.special_assistance_request
                })),
                seats: (fullBookingData.passengers || []).map((p: any) => ({
                    id: '',
                    number: p.seat?.seat_number || 'N/A',
                    rowNumber: p.seat?.row_number || 0,
                    isWindow: p.seat?.is_window || false,
                    isAisle: p.seat?.is_aisle || false,
                    isAvailable: false,
                    isSelected: false
                })),
                totalFare: fullBookingData.total_fare,
                qrCodeUrl: fullBookingData.qr_code_url,
                checkInStatus: fullBookingData.check_in_status,
                vessel: {
                    id: '',
                    name: fullBookingData.trip.vessel?.name || 'Unknown Vessel'
                },
                createdAt: '',
                updatedAt: '',
                // Additional fields for better validation display
                bookingType: bookingType,
                clientName,
                clientEmail,
                clientPhone,
                agentId: fullBookingData.agent_id || null,
                isAgentBooking: bookingType === 'agent'
            };

            // Validate the booking
            const currentDate = new Date();
            const departureDate = new Date(fullBookingData.trip.travel_date);
            const isValidDate = departureDate >= new Date(currentDate.setHours(0, 0, 0, 0));
            const isValidStatus = fullBookingData.status === 'confirmed';

            let message = '';
            let isValid = false;

            if (!isValidStatus) {
                message = `${bookingType === 'agent' ? 'Agent' : 'Customer'} ticket is ${fullBookingData.status}`;
                isValid = false;
            } else if (!isValidDate) {
                message = `${bookingType === 'agent' ? 'Agent' : 'Customer'} ticket has expired`;
                isValid = false;
            } else {
                // Check if it's for today or future
                const today = new Date().toDateString();
                const tripDate = departureDate.toDateString();

                const typeText = bookingType === 'agent' ? 'Agent' : 'Customer';
                const clientText = bookingType === 'agent' ? ` for ${clientName}` : '';

                if (tripDate === today) {
                    message = `Valid ${typeText} ticket${clientText} for travel today`;
                    isValid = true;
                } else if (departureDate > new Date()) {
                    message = `Valid ${typeText} ticket${clientText} for travel on ${departureDate.toLocaleDateString()}`;
                    isValid = true;
                } else {
                    message = `${typeText} ticket has expired`;
                    isValid = false;
                }
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