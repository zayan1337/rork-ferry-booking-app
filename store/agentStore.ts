import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Agent, AgentStats, Booking, Client, CreditTransaction } from '@/types/agent';
import { mockAgent, mockStats, mockBookings, mockClients, mockCreditTransactions } from '@/mocks/agent';

interface AgentState {
    agent: Agent | null;
    stats: AgentStats;
    bookings: Booking[];
    clients: Client[];
    creditTransactions: CreditTransaction[];
    isLoading: boolean;
    error: string | null;

    // Actions
    login: (agentId: string, password: string) => Promise<boolean>;
    logout: () => void;
    setAgent: (agent: Agent) => void;
    updateStats: () => Promise<void>;
    fetchBookings: () => Promise<void>;
    fetchClients: () => Promise<void>;
    getBookingsByClient: (clientId: string) => Booking[];
    createBooking: (bookingData: any) => Promise<string>;
    cancelBooking: (bookingId: string) => Promise<void>;
    updateBookingStatus: (bookingId: string, status: Booking['status']) => Promise<void>;
    clearError: () => void;
    reset: () => void;
    initializeFromAuthUser: (authUser: any) => void;
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
            isLoading: false,
            error: null,

            initializeFromAuthUser: (authUser: any) => {
                if (authUser?.profile?.role === 'agent') {
                    set({
                        agent: {
                            id: authUser.id,
                            name: authUser.profile.full_name,
                            email: authUser.email,
                            agentId: authUser.profile.agent_id || 'TRA-' + authUser.id.slice(-4),
                            creditCeiling: authUser.profile.credit_ceiling || 10000,
                            creditBalance: authUser.profile.credit_balance || 7500,
                            discountRate: authUser.profile.agent_discount || 12,
                            freeTicketsAllocation: authUser.profile.free_tickets_allocation || 10,
                            freeTicketsRemaining: authUser.profile.free_tickets_remaining || 7,
                        },
                        stats: mockStats,
                        bookings: mockBookings,
                        clients: mockClients,
                        creditTransactions: mockCreditTransactions,
                    });
                }
            },

            login: async (agentId: string, password: string) => {
                try {
                    set({ isLoading: true, error: null });

                    // Mock login - check credentials (for development only)
                    if (agentId === 'TRA-1234' && password === 'password') {
                        set({
                            agent: mockAgent,
                            stats: mockStats,
                            bookings: mockBookings,
                            clients: mockClients,
                            creditTransactions: mockCreditTransactions,
                            isLoading: false
                        });
                        return true;
                    } else {
                        set({
                            error: 'Invalid Agent ID or password',
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
                    set({ isLoading: true, error: null });
                    set({ stats: mockStats, isLoading: false });
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to update stats',
                        isLoading: false
                    });
                }
            },

            fetchBookings: async () => {
                try {
                    set({ isLoading: true, error: null });
                    set({ bookings: mockBookings, isLoading: false });
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to fetch bookings',
                        isLoading: false
                    });
                }
            },

            fetchClients: async () => {
                try {
                    set({ isLoading: true, error: null });
                    set({ clients: mockClients, isLoading: false });
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to fetch clients',
                        isLoading: false
                    });
                }
            },

            getBookingsByClient: (clientId: string) => {
                const { bookings } = get();
                return bookings.filter(booking => booking.clientId === clientId);
            },

            createBooking: async (bookingData: any) => {
                try {
                    set({ isLoading: true, error: null });

                    const newBooking: Booking = {
                        id: Math.random().toString(36).substr(2, 9),
                        clientId: bookingData.clientId || Math.random().toString(36).substr(2, 9),
                        ...bookingData,
                        status: 'pending' as const,
                        bookingDate: new Date().toISOString().split('T')[0],
                    };

                    const currentBookings = get().bookings;
                    set({
                        bookings: [newBooking, ...currentBookings],
                        isLoading: false
                    });

                    return newBooking.id;
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to create booking',
                        isLoading: false
                    });
                    throw error;
                }
            },

            cancelBooking: async (bookingId: string) => {
                try {
                    set({ isLoading: true, error: null });

                    const currentBookings = get().bookings;
                    const updatedBookings = currentBookings.map(booking =>
                        booking.id === bookingId
                            ? { ...booking, status: 'cancelled' as const }
                            : booking
                    );

                    set({ bookings: updatedBookings, isLoading: false });
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to cancel booking',
                        isLoading: false
                    });
                    throw error;
                }
            },

            updateBookingStatus: async (bookingId: string, status: Booking['status']) => {
                try {
                    set({ isLoading: true, error: null });

                    const currentBookings = get().bookings;
                    const updatedBookings = currentBookings.map(booking =>
                        booking.id === bookingId
                            ? { ...booking, status }
                            : booking
                    );

                    set({ bookings: updatedBookings, isLoading: false });
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to update booking status',
                        isLoading: false
                    });
                    throw error;
                }
            },

            clearError: () => set({ error: null }),

            reset: () => set({
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
            }),
        }),
        {
            name: 'agent-store',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
); 