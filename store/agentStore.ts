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
            testConnection: async () => {
                try {
                    const { data, error } = await supabase.from('user_profiles').select('id').limit(1);
                    if (error) {
                        console.error('Database connection test failed:', error);
                        return false;
                    }
                    console.log('Database connection test successful');
                    return true;
                } catch (error) {
                    console.error('Database connection test error:', error);
                    return false;
                }
            },

            getAgentProfile: async (agentId: string) => {
                try {
                    console.log('Fetching agent profile for ID:', agentId);

                    // Try the main function first
                    let { data, error } = await supabase.rpc('get_agent_profile', {
                        agent_user_id: agentId
                    });

                    // If there's a type mismatch error, try the simpler function
                    if (error && error.code === '42804') {
                        console.log('Type mismatch detected, trying simpler function...');
                        const result = await supabase.rpc('get_agent_profile_simple', {
                            agent_user_id: agentId
                        });
                        data = result.data;
                        error = result.error;
                    }

                    console.log('Agent profile response:', { data, error });

                    if (error) {
                        console.error('Error in getAgentProfile:', error);
                        throw error;
                    }

                    if (!data || data.length === 0) {
                        console.log('No agent profile found for ID:', agentId);
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
                    const { data, error } = await supabase.rpc('get_agent_clients_with_stats', {
                        agent_user_id: agentId
                    });

                    if (error) throw error;

                    return (data || []).map((client: any) => ({
                        id: client.id,
                        name: client.name,
                        email: client.email,
                        phone: client.phone,
                        bookingsCount: Number(client.bookingscount), // lowercase from database
                    }));
                } catch (error) {
                    console.error('Error fetching agent clients:', error);
                    throw error;
                }
            },

            getAgentBookings: async (agentId: string) => {
                try {
                    const { data, error } = await supabase.rpc('get_agent_bookings', {
                        agent_user_id: agentId
                    });

                    if (error) throw error;

                    return (data || []).map((booking: any) => ({
                        id: booking.id,
                        clientId: booking.clientid, // lowercase from database
                        clientName: booking.clientname, // lowercase from database
                        origin: booking.origin,
                        destination: booking.destination,
                        departureDate: booking.departuredate, // lowercase from database
                        returnDate: booking.returndate, // lowercase from database
                        passengerCount: Number(booking.passengercount), // lowercase from database
                        totalAmount: Number(booking.totalamount), // lowercase from database
                        discountedAmount: Number(booking.discountedamount), // lowercase from database
                        status: booking.status as Booking['status'],
                        bookingDate: booking.bookingdate, // lowercase from database
                        paymentMethod: booking.paymentmethod as Booking['paymentMethod'], // lowercase from database
                        commission: Number(booking.commission),
                    }));
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
                const { bookings } = get();
                return bookings.filter(booking => booking.clientId === clientId);
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