import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Agent, AgentStats, Booking, Client, CreditTransaction } from '@/types/agent';
import { supabase } from '@/utils/supabase';

interface AgentProfile {
    id: string;
    name: string;
    email: string;
    agentId: string;
    creditCeiling: number;
    creditBalance: number;
    discountRate: number;
    freeTicketsAllocation: number;
    freeTicketsRemaining: number;
    totalBookings: number;
    activeBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    totalRevenue: number;
    totalCommission: number;
    uniqueClients: number;
}

interface AgentState {
    agent: Agent | null;
    stats: AgentStats;
    bookings: Booking[];
    clients: Client[];
    creditTransactions: CreditTransaction[];
    translations: Record<string, string>;
    currentLanguage: string;
    textDirection: 'ltr' | 'rtl';
    isLoading: boolean;
    error: string | null;

    // Actions
    login: (agentId: string, password: string) => Promise<boolean>;
    logout: () => void;
    setAgent: (agent: Agent) => void;
    updateStats: () => Promise<void>;
    fetchBookings: () => Promise<void>;
    fetchClients: () => Promise<void>;
    fetchCreditTransactions: () => Promise<void>;
    getBookingsByClient: (clientId: string) => Booking[];
    createBooking: (bookingData: any) => Promise<string>;
    cancelBooking: (bookingId: string) => Promise<void>;
    updateBookingStatus: (bookingId: string, status: Booking['status']) => Promise<void>;
    addClientToAgent: (clientId: string) => Promise<void>;
    setLanguage: (languageCode: string) => Promise<void>;
    getTranslation: (key: string) => string;
    clearError: () => void;
    reset: () => void;
    initializeFromAuthUser: (authUser: any) => Promise<void>;

    // QR Code utilities
    parseBookingQrCode: (qrCodeUrl: string) => any | null;
    getQrCodeDisplayData: (booking: Booking) => any | null;

    // Booking refresh utilities
    refreshBookingsData: () => Promise<void>;
    handleBookingCreated: (bookingId: string, returnBookingId?: string | null) => Promise<void>;

    // Internal helper methods (now exposed)
    getAgentProfile: (agentId: string) => Promise<{ agent: Agent; stats: AgentStats } | null>;
    getAgentClients: (agentId: string) => Promise<Client[]>;
    getAgentBookings: (agentId: string) => Promise<Booking[]>;
    getAgentCreditTransactions: (agentId: string) => Promise<CreditTransaction[]>;
    getTranslations: (languageCode: string, context?: string) => Promise<Record<string, string>>;
    getUserLanguage: (userId: string) => Promise<string>;
    getTextDirection: (languageCode: string) => 'ltr' | 'rtl';
    testConnection: () => Promise<boolean>;
}

export const useAgentStore = create<AgentState>()(
    persist(
        (set, get) => ({
            agent: null,
            stats: {
                totalBookings: 0,
                activeBookings: 0,
                completedBookings: 0,
                cancelledBookings: 0,
                totalRevenue: 0,
                totalCommission: 0,
                uniqueClients: 0,
            },
            bookings: [],
            clients: [],
            creditTransactions: [],
            translations: {},
            currentLanguage: 'en',
            textDirection: 'ltr',
            isLoading: false,
            error: null,

            // Internal helper methods (integrated from services)
            testConnection: async (): Promise<boolean> => {
                try {
                    const { data, error } = await supabase.from('agents').select('id').limit(1);
                    if (!error) {
                        return true;
                    } else {
                        console.error('Database connection test failed:', error);
                        return false;
                    }
                } catch (error) {
                    console.error('Database connection test error:', error);
                    return false;
                }
            },

            getAgentProfile: async (agentId: string) => {
                try {
                    // Try the main function first
                    let { data, error } = await supabase.rpc('get_agent_profile', {
                        agent_user_id: agentId
                    });

                    // If there's a type mismatch error, try the simpler function
                    if (error && error.code === '42804') {
                        const result = await supabase.rpc('get_agent_profile_simple', {
                            agent_user_id: agentId
                        });
                        data = result.data;
                        error = result.error;
                    }

                    if (error) {
                        console.error('Error in getAgentProfile:', error);
                        throw error;
                    }

                    if (!data || data.length === 0) {
                        return null;
                    }

                    const profile = data[0] as AgentProfile;

                    const agent: Agent = {
                        id: String(profile.id || ''),
                        name: String(profile.name || ''),
                        email: String(profile.email || ''),
                        agentId: String((profile as any).agentid || profile.agentId || ''), // handle both cases
                        creditCeiling: Number((profile as any).creditceiling || profile.creditCeiling || 0), // handle both cases
                        creditBalance: Number((profile as any).creditbalance || profile.creditBalance || 0), // handle both cases
                        discountRate: Number((profile as any).discountrate || profile.discountRate || 0), // handle both cases
                        freeTicketsAllocation: Number((profile as any).freeticketsallocation || profile.freeTicketsAllocation || 0), // handle both cases
                        freeTicketsRemaining: Number((profile as any).freeticketsremaining || profile.freeTicketsRemaining || 0), // handle both cases
                    };

                    const stats: AgentStats = {
                        totalBookings: Number((profile as any).totalbookings || profile.totalBookings), // handle both cases
                        activeBookings: Number((profile as any).activebookings || profile.activeBookings), // handle both cases
                        completedBookings: Number((profile as any).completedbookings || profile.completedBookings), // handle both cases
                        cancelledBookings: Number((profile as any).cancelledbookings || profile.cancelledBookings), // handle both cases
                        totalRevenue: Number((profile as any).totalrevenue || profile.totalRevenue), // handle both cases
                        totalCommission: Number((profile as any).totalcommission || profile.totalCommission), // handle both cases
                        uniqueClients: Number((profile as any).uniqueclients || profile.uniqueClients), // handle both cases
                    };

                    return { agent, stats };
                } catch (error) {
                    console.error('Error fetching agent profile:', error);
                    throw error;
                }
            },

            getAgentClients: async (agentId: string) => {
                try {
                    // Use the comprehensive approach: query the view that handles both cases
                    const { data: clientData, error: clientError } = await supabase
                        .from('agent_clients_with_details')
                        .select('*')
                        .eq('agent_id', agentId);

                    if (clientError) {
                        throw clientError;
                    }

                    // Map the data - handle both clients with and without accounts
                    const mappedClients = (clientData || []).map((item: any) => ({
                        id: item.has_account ? item.client_id : item.id, // Use client_id for accounts, agent_clients id for no accounts
                        name: item.full_name || 'Unknown',
                        email: item.email || '',
                        phone: item.mobile_number || '',
                        bookingsCount: 0, // Will be updated with actual count below
                        hasAccount: item.has_account,
                        agentClientId: item.id, // Store the agent_clients record id
                    }));

                    // Now try to get booking counts for each client (both types)
                    try {
                        const { data: bookingCounts, error: bookingError } = await supabase
                            .from('bookings')
                            .select('user_id, agent_client_id')
                            .eq('agent_id', agentId);

                        if (!bookingError && bookingCounts) {
                            // Count bookings by both user_id and agent_client_id
                            const bookingCountsMap: Record<string, number> = {};

                            bookingCounts.forEach((booking: any) => {
                                // Count bookings for clients with accounts (user_id)
                                if (booking.user_id) {
                                    bookingCountsMap[booking.user_id] = (bookingCountsMap[booking.user_id] || 0) + 1;
                                }
                                // Count bookings for clients without accounts (agent_client_id)
                                if (booking.agent_client_id) {
                                    bookingCountsMap[booking.agent_client_id] = (bookingCountsMap[booking.agent_client_id] || 0) + 1;
                                }
                            });

                            // Update booking counts for all clients
                            mappedClients.forEach(client => {
                                if (client.hasAccount) {
                                    // For clients with accounts, use client.id (which is user_id)
                                    if (bookingCountsMap[client.id]) {
                                        client.bookingsCount = bookingCountsMap[client.id];
                                    }
                                } else {
                                    // For clients without accounts, use agentClientId (which is agent_clients.id)
                                    if (bookingCountsMap[client.agentClientId]) {
                                        client.bookingsCount = bookingCountsMap[client.agentClientId];
                                    }
                                }
                            });
                        }
                    } catch (bookingError) {
                        console.warn('Could not fetch booking counts:', bookingError);
                    }

                    return mappedClients;
                } catch (error) {
                    console.error('Error fetching agent clients:', error);

                    // Final fallback to stored procedure if view doesn't work
                    try {
                        const { data, error } = await supabase.rpc('get_agent_clients_with_stats', {
                            agent_user_id: agentId
                        });

                        if (!error && data) {
                            const mappedClients = (data || []).map((client: any) => ({
                                id: client.id,
                                name: client.name,
                                email: client.email,
                                phone: client.phone,
                                bookingsCount: Number(client.bookingscount),
                                hasAccount: true, // Stored procedure likely only returns clients with accounts
                            }));

                            return mappedClients;
                        }
                    } catch (rpcError) {
                        console.error('RPC fallback also failed:', rpcError);
                    }

                    throw error;
                }
            },

            getAgentBookings: async (agentId: string) => {
                try {
                    // Get ALL bookings for this agent with comprehensive trip, route, vessel, and passenger details
                    const { data: allAgentBookings, error: allBookingsError } = await supabase
                        .from('bookings')
                        .select(`
                            id,
                            booking_number,
                            user_id,
                            agent_client_id,
                            total_fare,
                            status,
                            created_at,
                            updated_at,
                            payment_method_type,
                            is_round_trip,
                            return_booking_id,
                            qr_code_url,
                            check_in_status,
                            trip:trip_id(
                                id,
                                route:route_id(
                                    id,
                                    from_island:from_island_id(
                                        id,
                                        name,
                                        zone
                                    ),
                                    to_island:to_island_id(
                                        id,
                                        name,
                                        zone
                                    ),
                                    base_fare
                                ),
                                travel_date,
                                departure_time,
                                vessel:vessel_id(
                                    id,
                                    name
                                )
                            ),
                            passengers(
                                id,
                                passenger_name,
                                passenger_contact_number,
                                special_assistance_request,
                                seat:seat_id(
                                    id,
                                    seat_number,
                                    row_number,
                                    is_window,
                                    is_aisle
                                )
                            ),
                            payments(
                                payment_method,
                                status
                            ),
                            agent_clients(
                                id,
                                full_name,
                                email,
                                mobile_number,
                                client_id
                            ),
                            user_profiles(
                                id,
                                full_name,
                                email,
                                mobile_number
                            )
                        `)
                        .eq('agent_id', agentId)
                        .order('created_at', { ascending: false });

                    if (allBookingsError) {
                        console.error('Error fetching all agent bookings:', allBookingsError);
                        throw allBookingsError;
                    }

                    const allBookings = (allAgentBookings || []).map((booking: any) => {
                        // Extract route and trip information
                        const route = booking.trip?.route ? {
                            id: booking.trip.route.id,
                            fromIsland: {
                                id: booking.trip.route.from_island.id,
                                name: booking.trip.route.from_island.name,
                                zone: booking.trip.route.from_island.zone,
                            },
                            toIsland: {
                                id: booking.trip.route.to_island.id,
                                name: booking.trip.route.to_island.name,
                                zone: booking.trip.route.to_island.zone,
                            },
                            baseFare: booking.trip.route.base_fare,
                        } : null;

                        // Extract vessel information
                        const vessel = booking.trip?.vessel ? {
                            id: booking.trip.vessel.id,
                            name: booking.trip.vessel.name
                        } : null;

                        // Extract passengers and seats
                        const passengers = booking.passengers?.map((passenger: any) => ({
                            id: passenger.id,
                            fullName: passenger.passenger_name,
                            contactNumber: passenger.passenger_contact_number,
                            specialAssistance: passenger.special_assistance_request,
                            seat: passenger.seat ? {
                                id: passenger.seat.id,
                                number: passenger.seat.seat_number,
                                rowNumber: passenger.seat.row_number,
                                isWindow: passenger.seat.is_window,
                                isAisle: passenger.seat.is_aisle,
                            } : null
                        })) || [];

                        // Get payment information
                        const payment = booking.payments?.[0] ? {
                            method: booking.payments[0].payment_method,
                            status: booking.payments[0].status
                        } : null;

                        // Determine client information based on booking type
                        let clientInfo = {
                            clientId: '',
                            clientName: 'Unknown Client',
                            clientEmail: '',
                            clientPhone: '',
                            hasAccount: false,
                            userId: undefined as string | undefined,
                            agentClientId: undefined as string | undefined,
                        };

                        if (booking.user_id && !booking.agent_client_id) {
                            // Booking for client WITH account (user_profiles only)
                            clientInfo = {
                                clientId: booking.user_id,
                                clientName: booking.user_profiles?.full_name || 'Unknown Client',
                                clientEmail: booking.user_profiles?.email || '',
                                clientPhone: booking.user_profiles?.mobile_number || '',
                                hasAccount: true,
                                userId: booking.user_id,
                                agentClientId: undefined,
                            };
                        } else if (booking.agent_client_id) {
                            // Booking for client WITHOUT account or WITH account via agent_clients
                            const hasAccount = !!booking.agent_clients?.client_id;
                            clientInfo = {
                                clientId: booking.agent_client_id,
                                clientName: booking.agent_clients?.full_name || booking.agent_clients?.email || 'Unknown Client',
                                clientEmail: booking.agent_clients?.email || '',
                                clientPhone: booking.agent_clients?.mobile_number || '',
                                hasAccount,
                                userId: hasAccount ? booking.agent_clients?.client_id : undefined,
                                agentClientId: booking.agent_client_id,
                            };
                        }

                        // Build the comprehensive booking object
                        return {
                            id: booking.id,
                            bookingNumber: booking.booking_number,
                            clientId: clientInfo.clientId,
                            clientName: clientInfo.clientName,
                            clientEmail: clientInfo.clientEmail,
                            clientPhone: clientInfo.clientPhone,
                            origin: route?.fromIsland?.name || 'Unknown Origin',
                            destination: route?.toIsland?.name || 'Unknown Destination',
                            departureDate: booking.trip?.travel_date || booking.created_at,
                            departureTime: booking.trip?.departure_time || '',
                            returnDate: undefined, // Handle return trips separately if needed
                            passengerCount: passengers.length,
                            passengers: passengers,
                            vessel: vessel,
                            route: route,
                            seats: passengers.map((passenger: any) => passenger.seat).filter(Boolean),
                            totalAmount: Number(booking.total_fare || 0),
                            discountedAmount: Number(booking.total_fare || 0),
                            status: booking.status as Booking['status'],
                            bookingDate: booking.created_at,
                            updatedAt: booking.updated_at,
                            paymentMethod: (booking.payment_method_type || 'gateway') as Booking['paymentMethod'],
                            payment: payment,
                            commission: 0, // Calculate if needed
                            userId: clientInfo.userId,
                            agentClientId: clientInfo.agentClientId,
                            clientHasAccount: clientInfo.hasAccount,
                            isRoundTrip: booking.is_round_trip || false,
                            returnBookingId: booking.return_booking_id,
                            qrCodeUrl: booking.qr_code_url,
                            checkInStatus: booking.check_in_status,
                            tripType: booking.is_round_trip ? 'round_trip' as const : 'one_way' as const,
                        };
                    });

                    return allBookings;
                } catch (error) {
                    console.error('Error fetching agent bookings:', error);
                    throw error;
                }
            },

            getAgentCreditTransactions: async (agentId: string) => {
                try {
                    const { data, error } = await supabase.rpc('get_agent_credit_transactions', {
                        agent_user_id: agentId
                    });

                    if (error) throw error;

                    return (data || []).map((transaction: any) => ({
                        id: transaction.id,
                        date: transaction.date,
                        amount: Number(transaction.amount),
                        type: transaction.type as CreditTransaction['type'],
                        bookingId: transaction.bookingid, // lowercase from database
                        description: transaction.description,
                        balance: Number(transaction.balance),
                    }));
                } catch (error) {
                    console.error('Error fetching agent credit transactions:', error);
                    throw error;
                }
            },

            getTranslations: async (languageCode: string, context?: string) => {
                try {
                    let query = supabase
                        .from('translations')
                        .select('key, translation')
                        .eq('language_code', languageCode);

                    if (context) {
                        query = query.eq('context', context);
                    }

                    const { data, error } = await query;

                    if (error) throw error;

                    const translations: Record<string, string> = {};
                    (data || []).forEach((item: any) => {
                        translations[item.key] = item.translation;
                    });

                    return translations;
                } catch (error) {
                    console.error('Error fetching translations:', error);
                    throw error;
                }
            },

            getUserLanguage: async (userId: string) => {
                try {
                    const { data, error } = await supabase
                        .from('user_profiles')
                        .select('preferred_language')
                        .eq('id', userId)
                        .single();

                    if (error) throw error;

                    return data?.preferred_language || 'en';
                } catch (error) {
                    console.error('Error fetching user language:', error);
                    return 'en'; // Default to English
                }
            },

            getTextDirection: (languageCode: string) => {
                const rtlLanguages = ['ar', 'he', 'fa', 'ur', 'dv']; // Include Dhivehi (dv)
                return rtlLanguages.includes(languageCode) ? 'rtl' : 'ltr';
            },

            // Main store actions
            initializeFromAuthUser: async (authUser: any) => {
                if (authUser?.profile?.role === 'agent') {
                    try {
                        set({ isLoading: true, error: null });

                        // Fetch real data from Supabase
                        const profileData = await get().getAgentProfile(authUser.id);

                        if (profileData) {
                            // Get user's preferred language
                            const userLanguage = await get().getUserLanguage(authUser.id);

                            const [bookings, clients, creditTransactions, translations] = await Promise.all([
                                get().getAgentBookings(authUser.id),
                                get().getAgentClients(authUser.id),
                                get().getAgentCreditTransactions(authUser.id),
                                get().getTranslations(userLanguage, 'agent_module'),
                            ]);

                            set({
                                agent: profileData.agent,
                                stats: profileData.stats,
                                bookings,
                                clients,
                                creditTransactions,
                                translations,
                                currentLanguage: userLanguage,
                                textDirection: get().getTextDirection(userLanguage),
                                isLoading: false,
                            });
                        } else {
                            // Fallback to creating agent profile from auth user
                            set({
                                agent: {
                                    id: authUser.id,
                                    name: authUser.profile.full_name,
                                    email: authUser.email,
                                    agentId: 'TRA-' + authUser.id.slice(-4),
                                    creditCeiling: authUser.profile.credit_ceiling || 10000,
                                    creditBalance: authUser.profile.credit_balance || 0,
                                    discountRate: authUser.profile.agent_discount || 12,
                                    freeTicketsAllocation: authUser.profile.free_tickets_allocation || 10,
                                    freeTicketsRemaining: authUser.profile.free_tickets_remaining || 10,
                                },
                                stats: {
                                    totalBookings: 0,
                                    activeBookings: 0,
                                    completedBookings: 0,
                                    cancelledBookings: 0,
                                    totalRevenue: 0,
                                    totalCommission: 0,
                                    uniqueClients: 0,
                                },
                                bookings: [],
                                clients: [],
                                creditTransactions: [],
                                isLoading: false,
                            });
                        }
                    } catch (error) {
                        console.error('Error initializing agent from auth user:', error);
                        set({
                            error: error instanceof Error ? error.message : 'Failed to initialize agent data',
                            isLoading: false,
                        });
                    }
                }
            },

            login: async (agentId: string, password: string) => {
                try {
                    set({ isLoading: true, error: null });

                    // Note: This should be integrated with your actual auth system
                    // For now, we'll assume authentication is handled separately
                    // and this is just for loading agent data by agent ID

                    // Extract user ID from agent ID if needed
                    // This is a placeholder - adjust based on your auth system
                    const userIdFromAgentId = agentId.replace('TRA-', '');

                    const profileData = await get().getAgentProfile(userIdFromAgentId);

                    if (profileData) {
                        const [bookings, clients, creditTransactions] = await Promise.all([
                            get().getAgentBookings(userIdFromAgentId),
                            get().getAgentClients(userIdFromAgentId),
                            get().getAgentCreditTransactions(userIdFromAgentId),
                        ]);

                        set({
                            agent: profileData.agent,
                            stats: profileData.stats,
                            bookings,
                            clients,
                            creditTransactions,
                            isLoading: false
                        });
                        return true;
                    } else {
                        set({
                            error: 'Agent not found',
                            isLoading: false
                        });
                        return false;
                    }
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Login failed',
                        isLoading: false
                    });
                    return false;
                }
            },

            logout: () => {
                set({
                    agent: null,
                    stats: {
                        totalBookings: 0,
                        activeBookings: 0,
                        completedBookings: 0,
                        cancelledBookings: 0,
                        totalRevenue: 0,
                        totalCommission: 0,
                        uniqueClients: 0,
                    },
                    bookings: [],
                    clients: [],
                    creditTransactions: [],
                    isLoading: false,
                    error: null,
                });
            },

            setAgent: (agent: Agent) => set({ agent }),

            updateStats: async () => {
                try {
                    const { agent } = get();
                    if (!agent) return;

                    set({ isLoading: true, error: null });

                    const profileData = await get().getAgentProfile(agent.id);
                    if (profileData) {
                        set({
                            agent: profileData.agent,
                            stats: profileData.stats,
                            isLoading: false,
                        });
                    }
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to update stats',
                        isLoading: false,
                    });
                }
            },

            fetchBookings: async () => {
                try {
                    const { agent } = get();
                    if (!agent) return;

                    set({ isLoading: true, error: null });

                    const bookings = await get().getAgentBookings(agent.id);
                    set({ bookings, isLoading: false });

                    // Also refresh stats after fetching bookings
                    await get().updateStats();
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to fetch bookings',
                        isLoading: false,
                    });
                }
            },

            fetchClients: async () => {
                try {
                    const { agent } = get();
                    if (!agent) return;

                    set({ isLoading: true, error: null });

                    const clients = await get().getAgentClients(agent.id);
                    set({ clients, isLoading: false });
                } catch (error) {
                    console.error('Error in fetchClients:', error);
                    set({
                        error: error instanceof Error ? error.message : 'Failed to fetch clients',
                        isLoading: false,
                    });
                }
            },

            fetchCreditTransactions: async () => {
                try {
                    const { agent } = get();
                    if (!agent) return;

                    set({ isLoading: true, error: null });

                    const creditTransactions = await get().getAgentCreditTransactions(agent.id);
                    set({ creditTransactions, isLoading: false });
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to fetch credit transactions',
                        isLoading: false,
                    });
                }
            },

            getBookingsByClient: (clientId: string) => {
                const { bookings, clients } = get();

                // Find the client to determine if they have an account
                const client = clients.find(c => c.id === clientId);

                if (!client) {
                    return [];
                }

                // Filter bookings based on client type
                const filtered = bookings.filter(booking => {
                    if (client.hasAccount) {
                        // For clients with accounts, match by userId
                        const match1 = booking.userId === clientId;
                        const match2 = booking.clientId === clientId;
                        return match1 || match2;
                    } else {
                        // For clients without accounts, match by agentClientId
                        // The booking's agentClientId should match the client's agentClientId (agent_clients.id)
                        const match1 = booking.agentClientId === client.agentClientId;
                        // Also check if booking's clientId matches (this should be the same as agentClientId for clients without accounts)
                        const match2 = booking.clientId === client.agentClientId;
                        // Final fallback: direct ID match
                        const match3 = booking.agentClientId === clientId;
                        return match1 || match2 || match3;
                    }
                });

                return filtered;
            },

            createBooking: async (bookingData: any) => {
                try {
                    const { agent } = get();
                    if (!agent) throw new Error('Agent not authenticated');

                    set({ isLoading: true, error: null });

                    const { data, error } = await supabase
                        .from('bookings')
                        .insert({
                            agent_id: agent.id,
                            user_id: bookingData.clientId,
                            trip_id: bookingData.tripId,
                            total_fare: bookingData.totalAmount,
                            payment_method_type: bookingData.paymentMethod,
                            status: 'pending',
                        })
                        .select('id')
                        .single();

                    if (error) throw error;

                    // Refresh bookings after creating new one
                    await get().fetchBookings();
                    await get().updateStats();

                    set({ isLoading: false });
                    return data.id;
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to create booking',
                        isLoading: false,
                    });
                    throw error;
                }
            },

            cancelBooking: async (bookingId: string) => {
                try {
                    set({ isLoading: true, error: null });

                    const { error } = await supabase
                        .from('bookings')
                        .update({ status: 'cancelled' })
                        .eq('id', bookingId);

                    if (error) throw error;

                    // Refresh bookings and stats
                    await get().fetchBookings();
                    await get().updateStats();

                    set({ isLoading: false });
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to cancel booking',
                        isLoading: false,
                    });
                    throw error;
                }
            },

            updateBookingStatus: async (bookingId: string, status: Booking['status']) => {
                try {
                    set({ isLoading: true, error: null });

                    const { error } = await supabase
                        .from('bookings')
                        .update({ status })
                        .eq('id', bookingId);

                    if (error) throw error;

                    // Refresh bookings and stats
                    await get().fetchBookings();
                    await get().updateStats();

                    set({ isLoading: false });
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to update booking status',
                        isLoading: false,
                    });
                    throw error;
                }
            },

            addClientToAgent: async (clientId: string) => {
                try {
                    const { agent } = get();
                    if (!agent) throw new Error('Agent not authenticated');

                    set({ isLoading: true, error: null });

                    const { error } = await supabase
                        .from('agent_clients')
                        .insert({
                            agent_id: agent.id,
                            user_profile_id: clientId,
                        });

                    if (error) throw error;

                    // Refresh clients after adding new one
                    await get().fetchClients();

                    set({ isLoading: false });
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to add client',
                        isLoading: false,
                    });
                    throw error;
                }
            },

            setLanguage: async (languageCode: string) => {
                try {
                    set({ isLoading: true, error: null });

                    const [translations] = await Promise.all([
                        get().getTranslations(languageCode, 'agent_module'),
                    ]);

                    set({
                        currentLanguage: languageCode,
                        textDirection: get().getTextDirection(languageCode),
                        translations,
                        isLoading: false,
                    });

                    // Update user profile with new language preference
                    const { agent } = get();
                    if (agent) {
                        await supabase
                            .from('user_profiles')
                            .update({ preferred_language: languageCode })
                            .eq('id', agent.id);
                    }
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to set language',
                        isLoading: false,
                    });
                }
            },

            getTranslation: (key: string) => {
                const { translations, currentLanguage } = get();
                return translations[key] || key;
            },

            clearError: () => set({ error: null }),

            // QR Code utilities
            parseBookingQrCode: (qrCodeUrl: string) => {
                try {
                    if (!qrCodeUrl) return null;

                    // Handle both direct JSON string and URL-encoded JSON
                    let qrData;
                    if (qrCodeUrl.startsWith('{')) {
                        qrData = JSON.parse(qrCodeUrl);
                    } else {
                        // If it's a URL, extract the data parameter
                        const url = new URL(qrCodeUrl);
                        const dataParam = url.searchParams.get('data');
                        if (dataParam) {
                            qrData = JSON.parse(decodeURIComponent(dataParam));
                        } else {
                            qrData = JSON.parse(qrCodeUrl);
                        }
                    }

                    return qrData;
                } catch (error) {
                    console.error('Error parsing booking QR code:', error);
                    return null;
                }
            },

            getQrCodeDisplayData: (booking: Booking) => {
                try {
                    if (!booking.qrCodeUrl) return null;

                    const qrData = get().parseBookingQrCode(booking.qrCodeUrl);
                    if (!qrData) return null;

                    return {
                        bookingNumber: qrData.bookingNumber || booking.bookingNumber,
                        tripType: qrData.type || booking.tripType,
                        route: qrData.route || `${booking.origin} → ${booking.destination}`,
                        departureDate: qrData.departureDate || booking.departureDate,
                        departureTime: qrData.departureTime || booking.departureTime,
                        passengers: qrData.passengers || booking.passengerCount,
                        seats: Array.isArray(qrData.seats) ? qrData.seats.join(', ') : 'N/A',
                        clientName: qrData.clientName || booking.clientName,
                        agentName: qrData.agentName || 'Unknown Agent',
                        totalFare: qrData.totalFare || booking.totalAmount,
                        timestamp: qrData.timestamp || booking.bookingDate,
                        isAgentBooking: qrData.type?.includes('agent-booking') || false,
                        isReturnTrip: qrData.type === 'agent-booking-return' || false,
                    };
                } catch (error) {
                    console.error('Error extracting QR code display data:', error);
                    return null;
                }
            },

            // Booking refresh utilities
            refreshBookingsData: async () => {
                try {
                    const { agent } = get();
                    if (!agent) return;

                    set({ isLoading: true, error: null });

                    // Fetch fresh bookings, clients, and stats
                    const [bookings, clients, stats] = await Promise.all([
                        get().getAgentBookings(agent.id),
                        get().getAgentClients(agent.id),
                        get().getAgentProfile(agent.id).then(data => data?.stats)
                    ]);

                    set({
                        bookings,
                        clients,
                        stats: stats || get().stats,
                        isLoading: false
                    });
                } catch (error) {
                    console.error('Error refreshing bookings data:', error);
                    set({
                        error: error instanceof Error ? error.message : 'Failed to refresh bookings',
                        isLoading: false,
                    });
                }
            },

            handleBookingCreated: async (bookingId: string, returnBookingId?: string | null) => {
                if (bookingId === 'refresh') {
                    // Special case for refresh trigger
                    await get().refreshBookingsData();
                } else {
                    // Normal booking creation - refresh all data
                    await get().refreshBookingsData();
                }
            },

            reset: () => {
                set({
                    agent: null,
                    stats: {
                        totalBookings: 0,
                        activeBookings: 0,
                        completedBookings: 0,
                        cancelledBookings: 0,
                        totalRevenue: 0,
                        totalCommission: 0,
                        uniqueClients: 0,
                    },
                    bookings: [],
                    clients: [],
                    creditTransactions: [],
                    translations: {},
                    currentLanguage: 'en',
                    textDirection: 'ltr',
                    isLoading: false,
                    error: null,
                });
            },
        }),
        {
            name: 'agent-store',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                agent: state.agent,
                currentLanguage: state.currentLanguage,
                textDirection: state.textDirection,
            }),
        }
    )
); 