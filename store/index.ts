// Import hooks for internal use
import { useBookingStore } from './bookingStore';
import { useRouteStore, useTripStore } from './routeStore';
import { useSeatStore } from './seatStore';
import { useBookingOperationsStore } from './bookingOperationsStore';
import { useUserBookingsStore } from './userBookingsStore';
import { useTicketStore } from './ticketStore';

// ========================================
// CORE BOOKING STATE MANAGEMENT
// ========================================

// Core booking state management
export { useBookingStore } from './bookingStore';

// Route and trip management
export { useRouteStore, useTripStore } from './routeStore';

// Seat management and reservations
export { useSeatStore } from './seatStore';

// Booking operations (confirm, cancel, modify)
export { useBookingOperationsStore } from './bookingOperationsStore';

// User bookings management
export { useUserBookingsStore } from './userBookingsStore';

// Ticket validation
export { useTicketStore } from './ticketStore';

// ========================================
// AUTHENTICATION AND USER MANAGEMENT
// ========================================

// Authentication store
export { useAuthStore } from './authStore';

// FAQ management
export { useFaqStore } from './faqStore';

// ========================================
// AGENT STORES - CLEANED AND OPTIMIZED
// ========================================

/**
 * Main agent store - Coordinating facade over all agent functionality
 * Use this as the primary interface for agent operations
 * 
 * Features:
 * - Agent authentication and profile management
 * - Client management and search
 * - Booking operations and history
 * - Statistics and analytics
 * - Credit transaction tracking
 * - Multi-language support
 */
export { useAgentStore } from './agent/agentStore';

/**
 * Agent authentication and profile store
 * Handles login, logout, language preferences, and profile data
 */
export { useAgentAuthStore } from './agent/agentAuthStore';

/**
 * Agent booking form store
 * Manages the multi-step booking creation process for agents
 */
export { useAgentBookingFormStore } from './agent/agentBookingFormStore';

/**
 * Agent bookings management store
 * Handles booking operations, history, and tracking
 */
export { useAgentBookingsStore } from './agent/agentBookingsStore';

/**
 * Agent clients management store
 * Manages client creation, search, and association with agents
 */
export { useAgentClientsStore } from './agent/agentClientsStore';

/**
 * Agent statistics store
 * Provides real-time and calculated statistics for agent performance
 */
export { useAgentStatsStore } from './agent/agentStatsStore';

/**
 * Agent credit transactions store
 * Tracks credit transactions and balance management
 */
export { useAgentCreditStore } from './agent/agentCreditStore';

// ========================================
// LEGACY EXPORTS - MAINTAINED FOR BACKWARD COMPATIBILITY
// ========================================

/**
 * @deprecated Use individual stores instead
 * This provides a migration path for existing components
 * 
 * Recommended migration:
 * - Replace `useBookingStore_DEPRECATED()` with specific store hooks
 * - Use `useBookingStore()` for booking form state
 * - Use `useRouteStore()` for route management
 * - Use `useSeatStore()` for seat selection
 * - Use `useUserBookingsStore()` for user's booking history
 * - Use `useTicketStore()` for ticket validation
 * - Use `useBookingOperationsStore()` for booking operations
 */
export const useBookingStore_DEPRECATED = () => {
    console.warn('useBookingStore_DEPRECATED is deprecated. Please use individual stores: useBookingStore, useRouteStore, useSeatStore, etc.');

    // Return a combined interface for backward compatibility
    // This is a simplified version - full implementation would merge all stores
    const bookingStore = useBookingStore();
    const routeStore = useRouteStore();
    const seatStore = useSeatStore();
    const userBookingsStore = useUserBookingsStore();
    const ticketStore = useTicketStore();
    const bookingOperationsStore = useBookingOperationsStore();

    return {
        ...bookingStore,
        ...routeStore,
        ...seatStore,
        ...userBookingsStore,
        ...ticketStore,
        ...bookingOperationsStore,
    };
}; 