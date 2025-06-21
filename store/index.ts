// Import hooks for internal use
import { useBookingStore } from './bookingStore';
import { useRouteStore, useTripStore } from './routeStore';
import { useSeatStore } from './seatStore';
import { useBookingOperationsStore } from './bookingOperationsStore';
import { useUserBookingsStore } from './userBookingsStore';
import { useTicketStore } from './ticketStore';

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

// Agent management stores
export { useAgentStore } from './agentStore';
export { useAgentBookingStore } from './agentBookingStore';

// Authentication store
export { useAuthStore } from './authStore';

// Backward compatibility exports - deprecated, use individual stores instead
// This provides a migration path for existing components
export const useBookingStore_DEPRECATED = () => {
    console.warn('useBookingStore is deprecated. Please use individual stores: useBookingStore, useRouteStore, useSeatStore, etc.');

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