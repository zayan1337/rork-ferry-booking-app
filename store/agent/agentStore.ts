import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Agent,
  AgentStats,
  Booking,
  Client,
  CreditTransaction,
} from '@/types/agent';
import { useAgentAuthStore } from './agentAuthStore';
import { useAgentClientsStore } from './agentClientsStore';
import { useAgentBookingsStore } from './agentBookingsStore';
import { useAgentStatsStore } from './agentStatsStore';
import { useAgentCreditStore } from './agentCreditStore';
import { usePaymentSessionStore } from '../paymentSessionStore';

/**
 * Main agent store state interface
 * Acts as a coordinating facade over individual agent stores
 *
 * This store aggregates state from multiple specialized stores:
 * - AgentAuthStore: Authentication and user data
 * - AgentClientsStore: Client management
 * - AgentBookingsStore: Booking operations
 * - AgentStatsStore: Statistics and analytics
 * - AgentCreditStore: Credit transactions
 */
interface AgentState {
  // Aggregated state from sub-stores
  agent: Agent | null;
  stats: AgentStats;
  bookings: Booking[];
  clients: Client[];
  creditTransactions: CreditTransaction[];
  translations: Record<string, string>;
  currentLanguage: string;
  textDirection: 'ltr' | 'rtl';

  // Loading states for different functionalities
  isInitializing: boolean; // For initial setup/login
  isLoadingBookings: boolean; // For bookings operations
  isLoadingClients: boolean; // For clients operations
  isLoadingCredit: boolean; // For credit transactions
  isLoadingStats: boolean; // For stats operations
  isLoadingProfile: boolean; // For profile operations

  // Legacy loading state (deprecated - use specific ones above)
  isLoading: boolean;
  error: string | null;

  // Authentication and initialization
  login: (agentId: string, password: string) => Promise<boolean>;
  logout: () => void;
  setAgent: (agent: Agent) => void;
  initializeFromAuthUser: (authUser: any) => Promise<void>;

  // Data fetching methods
  updateStats: () => Promise<void>;
  fetchBookings: () => Promise<void>;
  fetchClients: () => Promise<void>;
  fetchCreditTransactions: () => Promise<void>;
  refreshAllData: () => Promise<void>;

  // Booking operations
  getBookingsByClient: (clientId: string) => Booking[];
  createBooking: (bookingData: any) => Promise<string>;
  cancelBooking: (bookingId: string) => Promise<void>;
  updateBookingStatus: (
    bookingId: string,
    status: Booking['status']
  ) => Promise<void>;
  modifyBooking: (
    bookingId: string,
    modificationData: any
  ) => Promise<{ bookingId: string; returnBookingId: string | null }>;
  agentCancelBooking: (
    bookingId: string,
    cancellationData: {
      reason: string;
      refundPercentage?: number;
      refundMethod?: 'agent_credit' | 'original_payment' | 'bank_transfer';
      bankDetails?: {
        accountNumber: string;
        accountName: string;
        bankName: string;
      };
      agentNotes?: string;
      overrideFee?: boolean;
    }
  ) => Promise<string>;

  // Client operations
  addClientToAgent: (clientId: string) => Promise<void>;
  createAgentClient: (clientData: {
    name: string;
    email: string;
    phone: string;
    idNumber?: string;
  }) => Promise<string>;
  searchExistingUser: (email: string) => Promise<any | null>;
  addExistingUserAsClient: (userId: string) => Promise<void>;

  // Language and localization
  setLanguage: (languageCode: string) => Promise<void>;
  getTranslation: (key: string) => string;

  // QR Code utilities
  parseBookingQrCode: (qrCodeUrl: string) => any | null;
  getQrCodeDisplayData: (booking: Booking) => any | null;

  // Booking refresh utilities
  refreshBookingsData: () => Promise<void>;
  handleBookingCreated: (
    bookingId: string,
    returnBookingId?: string | null
  ) => Promise<void>;

  // Internal helper methods (delegated to sub-stores)
  getAgentProfile: (
    agentId: string
  ) => Promise<{ agent: Agent; stats: AgentStats } | null>;
  getAgentClients: (agentId: string) => Promise<Client[]>;
  getAgentBookings: (agentId: string) => Promise<Booking[]>;
  getAgentCreditTransactions: (
    agentId?: string
  ) => Promise<CreditTransaction[]>;
  getTranslations: (
    languageCode: string,
    context?: string
  ) => Promise<Record<string, string>>;
  getUserLanguage: (userId: string) => Promise<string>;
  getTextDirection: (languageCode: string) => 'ltr' | 'rtl';
  testConnection: () => Promise<boolean>;

  // Booking history and tracking
  getBookingModifications: (bookingId: string) => Promise<any[]>;
  getBookingCancellation: (bookingId: string) => Promise<any | null>;
  getBookingFullHistory: (bookingId: string) => Promise<any>;
  updateBookingStatusWithHistory: (
    bookingId: string,
    status: string,
    notes?: string
  ) => Promise<void>;

  // Local booking utility methods
  getLocalActiveBookings: () => Booking[];
  getLocalInactiveBookings: () => Booking[];
  getLocalStats: () => AgentStats;

  // State management
  clearError: () => void;
  reset: () => void;
  syncFromSubStores: () => void;
  isInitialized: () => boolean;
}

/**
 * Validate agent authentication for operations requiring agent ID
 * @param agent - Agent object to validate
 * @returns The validated agent object
 * @throws {Error} If agent is not authenticated
 */
const requireAgent = (agent: Agent | null): Agent => {
  if (!agent) {
    throw new Error('Agent not authenticated');
  }
  return agent;
};

export const useAgentStore = create<AgentState>()(
  persist(
    (set, get) => ({
      // Initial state
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

      // Individual loading states
      isInitializing: false,
      isLoadingBookings: false,
      isLoadingClients: false,
      isLoadingCredit: false,
      isLoadingStats: false,
      isLoadingProfile: false,

      // Legacy loading state
      isLoading: false,
      error: null,

      /**
       * Sync state from all sub-stores
       * This method aggregates state from individual stores into this main store
       */
      syncFromSubStores: () => {
        const authState = useAgentAuthStore.getState();
        const clientsState = useAgentClientsStore.getState();
        const bookingsState = useAgentBookingsStore.getState();
        const statsState = useAgentStatsStore.getState();
        const creditState = useAgentCreditStore.getState();

        // Determine if any sub-store has an error
        const hasError =
          authState.error ||
          clientsState.error ||
          bookingsState.error ||
          statsState.error ||
          creditState.error;

        // Calculate if any sub-store is loading
        const isSubStoreLoading =
          authState.isLoading ||
          clientsState.isLoading ||
          bookingsState.isLoading ||
          statsState.isLoading ||
          creditState.isLoading;

        set({
          agent: authState.agent,
          translations: authState.translations,
          currentLanguage: authState.currentLanguage,
          textDirection: authState.textDirection,
          clients: clientsState.clients,
          bookings: bookingsState.bookings,
          stats: statsState.stats,
          creditTransactions: creditState.creditTransactions,
          // Always update loading state based on sub-stores unless explicitly overridden
          isLoading: isSubStoreLoading,
          error: hasError,
        });
      },

      /**
       * Refresh all agent data with proper loading coordination
       * This method ensures consistent loading states across all data fetching
       */
      refreshAllData: async () => {
        const { agent } = get();
        if (!agent?.id) {
          console.warn('Cannot refresh agent data: agent not authenticated');
          return;
        }

        try {
          set({
            isLoadingBookings: true,
            isLoadingClients: true,
            isLoadingStats: true,
            isLoadingCredit: true,
            isLoadingProfile: true,
            error: null,
          });

          await Promise.all([
            useAgentAuthStore.getState().refreshAgentProfile(agent.id),
            useAgentClientsStore.getState().fetchClients(agent.id),
            useAgentBookingsStore.getState().fetchBookings(agent.id),
            useAgentStatsStore.getState().updateStats(agent.id),
            useAgentCreditStore.getState().fetchCreditTransactions(agent.id),
          ]);

          get().syncFromSubStores();
          set({
            isLoadingBookings: false,
            isLoadingClients: false,
            isLoadingStats: false,
            isLoadingCredit: false,
            isLoadingProfile: false,
          });
        } catch (error) {
          console.error('Error refreshing all agent data:', error);
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to refresh agent data',
            isLoadingBookings: false,
            isLoadingClients: false,
            isLoadingStats: false,
            isLoadingCredit: false,
            isLoadingProfile: false,
          });
        }
      },

      // ========================================
      // INTERNAL HELPER METHODS (Delegated to sub-stores)
      // ========================================

      testConnection: () => useAgentAuthStore.getState().testConnection(),
      getAgentProfile: (agentId: string) =>
        useAgentAuthStore.getState().getAgentProfile(agentId),
      getAgentClients: (agentId: string) =>
        useAgentClientsStore.getState().getAgentClients(agentId),
      getAgentBookings: (agentId: string) =>
        useAgentBookingsStore.getState().getAgentBookings(agentId),
      getAgentCreditTransactions: (agentId?: string) => {
        const { agent } = get();
        const targetAgentId = agentId || requireAgent(agent).id;
        return useAgentCreditStore
          .getState()
          .getAgentCreditTransactions(targetAgentId);
      },
      getTranslations: (languageCode: string, context?: string) =>
        useAgentAuthStore.getState().getTranslations(languageCode, context),
      getUserLanguage: (userId: string) =>
        useAgentAuthStore.getState().getUserLanguage(userId),
      getTextDirection: (languageCode: string) =>
        useAgentAuthStore.getState().getTextDirection(languageCode),

      // ========================================
      // AUTHENTICATION AND INITIALIZATION
      // ========================================

      /**
       * Initialize agent data from authenticated user
       * @param authUser - Authenticated user object from auth store
       */
      initializeFromAuthUser: async (authUser: any) => {
        if (authUser?.profile?.role !== 'agent') {
          return;
        }

        try {
          // Set initializing state immediately
          set({ isInitializing: true, error: null });

          // Initialize auth store first
          await useAgentAuthStore.getState().initializeFromAuthUser(authUser);

          // Sync to get the agent data
          get().syncFromSubStores();

          // Initialize other stores if agent is available
          const { agent } = useAgentAuthStore.getState();
          if (agent) {
            // Fetch all data with specific loading states
            set({
              isLoadingClients: true,
              isLoadingBookings: true,
              isLoadingStats: true,
              isLoadingCredit: true,
            });

            await Promise.all([
              useAgentClientsStore.getState().fetchClients(agent.id),
              useAgentBookingsStore.getState().fetchBookings(agent.id),
              useAgentStatsStore.getState().updateStats(agent.id),
              useAgentCreditStore.getState().fetchCreditTransactions(agent.id),
            ]);
          }

          // Final sync and clear all loading states
          get().syncFromSubStores();
          set({
            isInitializing: false,
            isLoadingClients: false,
            isLoadingBookings: false,
            isLoadingStats: false,
            isLoadingCredit: false,
            isLoading: false,
          });
        } catch (error) {
          console.error('Error initializing agent from auth user:', error);
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to initialize agent data',
            isInitializing: false,
            isLoadingClients: false,
            isLoadingBookings: false,
            isLoadingStats: false,
            isLoadingCredit: false,
            isLoading: false,
          });
        }
      },

      /**
       * Agent login
       * @param agentId - Agent ID for login
       * @param password - Password (currently not validated)
       * @returns Success status
       */
      login: async (agentId: string, password: string) => {
        try {
          set({ isInitializing: true, error: null });

          const success = await useAgentAuthStore
            .getState()
            .login(agentId, password);
          if (success) {
            const { agent } = useAgentAuthStore.getState();
            if (agent) {
              set({
                isLoadingClients: true,
                isLoadingBookings: true,
                isLoadingStats: true,
                isLoadingCredit: true,
              });

              await Promise.all([
                useAgentClientsStore.getState().fetchClients(agent.id),
                useAgentBookingsStore.getState().fetchBookings(agent.id),
                useAgentStatsStore.getState().updateStats(agent.id),
                useAgentCreditStore
                  .getState()
                  .fetchCreditTransactions(agent.id),
              ]);
            }
            get().syncFromSubStores();
            set({
              isInitializing: false,
              isLoadingClients: false,
              isLoadingBookings: false,
              isLoadingStats: false,
              isLoadingCredit: false,
              isLoading: false,
            });
          } else {
            set({ isInitializing: false, isLoading: false });
          }
          return success;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Login failed',
            isInitializing: false,
            isLoadingClients: false,
            isLoadingBookings: false,
            isLoadingStats: false,
            isLoadingCredit: false,
            isLoading: false,
          });
          return false;
        }
      },

      /**
       * Agent logout - reset all stores
       */
      logout: () => {
        useAgentAuthStore.getState().reset();
        useAgentClientsStore.getState().reset();
        useAgentBookingsStore.getState().reset();
        useAgentStatsStore.getState().reset();
        useAgentCreditStore.getState().reset();
         // Clear any active payment session tied to this device
        usePaymentSessionStore.getState().clearSession();
        get().syncFromSubStores();
      },

      /**
       * Set agent data
       * @param agent - Agent object to set
       */
      setAgent: (agent: Agent) => {
        useAgentAuthStore.getState().setAgent(agent);
        get().syncFromSubStores();
      },

      // ========================================
      // DATA FETCHING METHODS
      // ========================================

      /**
       * Update agent statistics from database
       */
      updateStats: async () => {
        const { agent } = get();
        if (!agent) return;

        try {
          set({ isLoadingStats: true });
          await useAgentStatsStore.getState().updateStats(agent.id);
          get().syncFromSubStores();
          set({ isLoadingStats: false });
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : 'Failed to update stats',
            isLoadingStats: false,
          });
        }
      },

      /**
       * Fetch agent bookings from database
       */
      fetchBookings: async () => {
        const { agent } = get();
        if (!agent) return;

        try {
          set({ isLoadingBookings: true });
          await useAgentBookingsStore.getState().fetchBookings(agent.id);
          get().syncFromSubStores();
          set({ isLoadingBookings: false });
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to fetch bookings',
            isLoadingBookings: false,
          });
        }
      },

      /**
       * Fetch agent clients from database
       */
      fetchClients: async () => {
        const { agent } = get();
        if (!agent) return;

        try {
          set({ isLoadingClients: true });
          await useAgentClientsStore.getState().fetchClients(agent.id);
          get().syncFromSubStores();
          set({ isLoadingClients: false });
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to fetch clients',
            isLoadingClients: false,
          });
        }
      },

      /**
       * Fetch agent credit transactions from database
       */
      fetchCreditTransactions: async () => {
        const { agent } = get();
        if (!agent) return;

        try {
          set({ isLoadingCredit: true });
          await useAgentCreditStore
            .getState()
            .fetchCreditTransactions(agent.id);
          get().syncFromSubStores();
          set({ isLoadingCredit: false });
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to fetch credit transactions',
            isLoadingCredit: false,
          });
        }
      },

      // ========================================
      // BOOKING OPERATIONS
      // ========================================

      /**
       * Get bookings for a specific client
       * @param clientId - Client ID to get bookings for
       * @returns Array of bookings for the client
       */
      getBookingsByClient: (clientId: string) => {
        return useAgentBookingsStore
          .getState()
          .getBookingsByClient(clientId, get().clients);
      },

      /**
       * Create a new booking
       * @param bookingData - Booking data to create
       * @returns Created booking ID
       */
      createBooking: async (bookingData: any) => {
        const agent = requireAgent(get().agent);
        const bookingId = await useAgentBookingsStore
          .getState()
          .createBooking(agent.id, bookingData);
        await get().refreshBookingsData();
        return bookingId;
      },

      /**
       * Cancel a booking
       * @param bookingId - Booking ID to cancel
       */
      cancelBooking: async (bookingId: string) => {
        await useAgentBookingsStore.getState().cancelBooking(bookingId);
        await get().refreshBookingsData();
      },

      /**
       * Update booking status
       * @param bookingId - Booking ID to update
       * @param status - New status for the booking
       */
      updateBookingStatus: async (
        bookingId: string,
        status: Booking['status']
      ) => {
        await useAgentBookingsStore
          .getState()
          .updateBookingStatus(bookingId, status);
        await get().refreshBookingsData();
      },

      /**
       * Modify an existing booking
       * @param bookingId - Booking ID to modify
       * @param modificationData - Modification data
       * @returns Modified booking information
       */
      modifyBooking: async (bookingId: string, modificationData: any) => {
        const agent = requireAgent(get().agent);
        const result = await useAgentBookingsStore
          .getState()
          .modifyBooking(agent.id, bookingId, modificationData);
        await get().refreshBookingsData();
        return result;
      },

      /**
       * Agent-initiated booking cancellation
       * @param bookingId - Booking ID to cancel
       * @param cancellationData - Cancellation details
       * @returns Cancellation ID
       */
      agentCancelBooking: async (bookingId: string, cancellationData: any) => {
        const agent = requireAgent(get().agent);
        const cancellationId = await useAgentBookingsStore
          .getState()
          .agentCancelBooking(agent.id, bookingId, cancellationData);
        await get().refreshBookingsData();
        return cancellationId;
      },

      // ========================================
      // CLIENT OPERATIONS
      // ========================================

      /**
       * Add existing client to agent
       * @param clientId - Client ID to add
       */
      addClientToAgent: async (clientId: string) => {
        const agent = requireAgent(get().agent);
        await useAgentClientsStore
          .getState()
          .addClientToAgent(agent.id, clientId);
        get().syncFromSubStores();
      },

      /**
       * Create new agent client
       * @param clientData - Client data to create
       * @returns Created client ID
       */
      createAgentClient: async (clientData: any) => {
        const agent = requireAgent(get().agent);

        try {
          set({ isLoadingClients: true, error: null });
          const clientId = await useAgentClientsStore
            .getState()
            .createAgentClient(agent.id, clientData);
          get().syncFromSubStores();
          set({ isLoadingClients: false });
          return clientId;
        } catch (error) {
          set({
            isLoadingClients: false,
            error:
              error instanceof Error
                ? error.message
                : 'Failed to create client',
          });
          throw error;
        }
      },

      /**
       * Search for existing user by email
       * @param email - Email to search for
       * @returns User data if found
       */
      searchExistingUser: (email: string) =>
        useAgentClientsStore.getState().searchExistingUser(email),

      /**
       * Add existing user as agent client
       * @param userId - User ID to add as client
       */
      addExistingUserAsClient: async (userId: string) => {
        const agent = requireAgent(get().agent);

        try {
          set({ isLoadingClients: true, error: null });
          await useAgentClientsStore
            .getState()
            .addExistingUserAsClient(agent.id, userId);
          get().syncFromSubStores();
          set({ isLoadingClients: false });
        } catch (error) {
          set({
            isLoadingClients: false,
            error:
              error instanceof Error ? error.message : 'Failed to add client',
          });
          throw error;
        }
      },

      // ========================================
      // LANGUAGE AND LOCALIZATION
      // ========================================

      /**
       * Set language and update translations
       * @param languageCode - Language code to set
       */
      setLanguage: async (languageCode: string) => {
        await useAgentAuthStore.getState().setLanguage(languageCode);
        get().syncFromSubStores();
      },

      /**
       * Get translation for a key
       * @param key - Translation key
       * @returns Translated text
       */
      getTranslation: (key: string) =>
        useAgentAuthStore.getState().getTranslation(key),

      // ========================================
      // QR CODE UTILITIES
      // ========================================

      /**
       * Parse QR code data for booking information
       * @param qrCodeUrl - QR code URL to parse
       * @returns Parsed booking data
       */
      parseBookingQrCode: (qrCodeUrl: string) => {
        return useAgentBookingsStore.getState().parseBookingQrCode(qrCodeUrl);
      },

      /**
       * Get QR code display data for booking
       * @param booking - Booking object
       * @returns QR code display data
       */
      getQrCodeDisplayData: (booking: Booking) => {
        return useAgentBookingsStore.getState().getQrCodeDisplayData(booking);
      },

      // ========================================
      // BOOKING REFRESH UTILITIES
      // ========================================

      /**
       * Refresh bookings data with updated stats and clients
       */
      refreshBookingsData: async () => {
        const { agent } = get();
        if (!agent) return;

        const bookingsStore = useAgentBookingsStore.getState();
        const statsStore = useAgentStatsStore.getState();
        const clientsStore = useAgentClientsStore.getState();

        const clientsFetcher = () => clientsStore.getAgentClients(agent.id);
        const statsFetcher = () => statsStore.getAgentProfile(agent.id);

        await bookingsStore.refreshBookingsData(
          agent.id,
          clientsFetcher,
          statsFetcher
        );
        get().syncFromSubStores();
      },

      /**
       * Handle booking creation callback
       * @param bookingId - Created booking ID
       * @param returnBookingId - Return booking ID if applicable
       */
      handleBookingCreated: async (
        bookingId: string,
        returnBookingId?: string | null
      ) => {
        const { agent } = get();
        if (!agent) return;

        const bookingsStore = useAgentBookingsStore.getState();
        const statsStore = useAgentStatsStore.getState();
        const clientsStore = useAgentClientsStore.getState();

        const clientsFetcher = () => clientsStore.getAgentClients(agent.id);
        const statsFetcher = () => statsStore.getAgentProfile(agent.id);

        await bookingsStore.handleBookingCreated(
          agent.id,
          bookingId,
          returnBookingId,
          clientsFetcher,
          statsFetcher
        );
        get().syncFromSubStores();
      },

      // ========================================
      // BOOKING HISTORY AND TRACKING
      // ========================================

      /**
       * Get booking modifications history
       * @param bookingId - Booking ID to get modifications for
       * @returns Array of modifications
       */
      getBookingModifications: (bookingId: string) =>
        useAgentBookingsStore.getState().getBookingModifications(bookingId),

      /**
       * Get booking cancellation details
       * @param bookingId - Booking ID to get cancellation for
       * @returns Cancellation details
       */
      getBookingCancellation: (bookingId: string) =>
        useAgentBookingsStore.getState().getBookingCancellation(bookingId),

      /**
       * Get full booking history
       * @param bookingId - Booking ID to get full history for
       * @returns Complete booking history
       */
      getBookingFullHistory: (bookingId: string) =>
        useAgentBookingsStore.getState().getBookingFullHistory(bookingId),

      /**
       * Update booking status with history tracking
       * @param bookingId - Booking ID to update
       * @param status - New status
       * @param notes - Optional notes for the update
       */
      updateBookingStatusWithHistory: async (
        bookingId: string,
        status: string,
        notes?: string
      ) => {
        const agent = requireAgent(get().agent);
        await useAgentBookingsStore
          .getState()
          .updateBookingStatusWithHistory(agent.id, bookingId, status, notes);
        await get().refreshBookingsData();
      },

      // ========================================
      // LOCAL UTILITY METHODS
      // ========================================

      /**
       * Get local active bookings from current state
       * @returns Array of active bookings
       */
      getLocalActiveBookings: () => {
        return useAgentBookingsStore.getState().getLocalActiveBookings();
      },

      /**
       * Get local inactive bookings from current state
       * @returns Array of inactive bookings
       */
      getLocalInactiveBookings: () => {
        return useAgentBookingsStore.getState().getLocalInactiveBookings();
      },

      /**
       * Get calculated local stats from current data
       * @returns Calculated agent statistics
       */
      getLocalStats: () => {
        const { bookings, clients } = get();
        return useAgentStatsStore.getState().getLocalStats(bookings, clients);
      },

      // ========================================
      // STATE MANAGEMENT
      // ========================================

      /**
       * Clear all error states across stores
       */
      clearError: () => {
        useAgentAuthStore.getState().clearError();
        useAgentClientsStore.getState().clearError();
        useAgentBookingsStore.getState().clearError();
        useAgentStatsStore.getState().clearError();
        useAgentCreditStore.getState().clearError();
        set({ error: null });
      },

      /**
       * Reset all stores to initial state
       */
      reset: () => {
        useAgentAuthStore.getState().reset();
        useAgentClientsStore.getState().reset();
        useAgentBookingsStore.getState().reset();
        useAgentStatsStore.getState().reset();
        useAgentCreditStore.getState().reset();
        get().syncFromSubStores();
      },

      /**
       * Check if agent data is properly initialized
       * @returns true if agent is available and not in initial loading state
       */
      isInitialized: () => {
        const state = get();
        return !!(state.agent && !state.isInitializing);
      },
    }),
    {
      name: 'agent-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        agent: state.agent,
        currentLanguage: state.currentLanguage,
        textDirection: state.textDirection,
      }),
    }
  )
);
