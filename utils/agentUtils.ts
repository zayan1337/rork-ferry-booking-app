import type { Agent, AgentStats, Booking, Client } from '@/types/agent';
import { getActiveBookings, getInactiveBookings } from './bookingUtils';

/**
 * Calculate local agent statistics from bookings data
 * @param bookings - Array of bookings
 * @param clients - Array of clients
 * @returns Calculated agent statistics
 */
export const calculateLocalAgentStats = (bookings: Booking[], clients: Client[]): AgentStats => {
    const activeBookings = getActiveBookings(bookings);
    const inactiveBookings = getInactiveBookings(bookings);

    return {
        totalBookings: bookings.length,
        activeBookings: activeBookings.length,
        completedBookings: bookings.filter(b => b.status === 'completed').length,
        cancelledBookings: bookings.filter(b => b.status === 'cancelled').length,
        totalRevenue: bookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0),
        totalCommission: bookings.reduce((sum, booking) => sum + (booking.commission || 0), 0),
        uniqueClients: new Set(bookings.map(b => b.clientId)).size,
    };
};

/**
 * Get agent display name (first name from full name)
 * @param agent - Agent object
 * @returns First name or "Agent" as fallback
 */
export const getAgentDisplayName = (agent: Agent | null): string => {
    if (!agent?.name) return 'Agent';
    return agent.name.split(' ')[0];
};

/**
 * Validate agent credit balance for booking
 * @param agent - Agent object
 * @param requiredAmount - Required amount for booking
 * @returns Validation result
 */
export const validateAgentCredit = (
    agent: Agent | null,
    requiredAmount: number
): { isValid: boolean; error?: string } => {
    if (!agent) {
        return { isValid: false, error: 'Agent information not available' };
    }

    if (agent.creditBalance < requiredAmount) {
        return {
            isValid: false,
            error: `Insufficient credit balance. Required: $${requiredAmount.toFixed(2)}, Available: $${agent.creditBalance.toFixed(2)}`
        };
    }

    return { isValid: true };
};

/**
 * Validate agent free tickets for booking
 * @param agent - Agent object
 * @param requiredTickets - Required number of tickets
 * @returns Validation result
 */
export const validateAgentFreeTickets = (
    agent: Agent | null,
    requiredTickets: number
): { isValid: boolean; error?: string } => {
    if (!agent) {
        return { isValid: false, error: 'Agent information not available' };
    }

    if (agent.freeTicketsRemaining < requiredTickets) {
        return {
            isValid: false,
            error: `Insufficient free tickets. Required: ${requiredTickets}, Available: ${agent.freeTicketsRemaining}`
        };
    }

    return { isValid: true };
};

/**
 * Get credit limit utilization percentage
 * @param agent - Agent object
 * @returns Utilization percentage (0-100)
 */
export const getCreditUtilization = (agent: Agent | null): number => {
    if (!agent || agent.creditCeiling <= 0) return 0;

    const utilized = agent.creditCeiling - agent.creditBalance;
    return Math.min(100, Math.max(0, (utilized / agent.creditCeiling) * 100));
};

/**
 * Check if agent credit is low (below 20% of ceiling)
 * @param agent - Agent object
 * @returns True if credit is low
 */
export const isAgentCreditLow = (agent: Agent | null): boolean => {
    if (!agent) return false;
    return agent.creditBalance < (agent.creditCeiling * 0.2);
};

/**
 * Get inactive bookings count for a specific client
 * @param bookings - All bookings
 * @param clientId - Client ID
 * @returns Number of inactive bookings for the client
 */
export const getClientInactiveBookingsCount = (bookings: Booking[], clientId: string): number => {
    const clientBookings = bookings.filter(booking => {
        // Handle both types of client matching
        return booking.clientId === clientId || booking.userId === clientId || booking.agentClientId === clientId;
    });

    return getInactiveBookings(clientBookings).length;
};

/**
 * Get total bookings count across all clients
 * @param clients - Array of clients
 * @param getBookingsByClient - Function to get bookings for a client
 * @returns Total bookings count
 */
export const getTotalBookingsAcrossClients = (
    clients: Client[],
    getBookingsByClient: (clientId: string) => Booking[]
): number => {
    return clients.reduce((sum, client) => {
        const clientBookings = getBookingsByClient(client.id);
        return sum + clientBookings.length;
    }, 0);
};

/**
 * Format agent ID for display
 * @param agentId - Agent ID
 * @returns Formatted agent ID or 'N/A' if not provided
 */
export const formatAgentId = (agentId: string | undefined): string => {
    return agentId || 'N/A';
};

/**
 * Get agent initials for avatar display
 * @param agent - Agent object
 * @returns Agent initials (up to 2 characters)
 */
export const getAgentInitials = (agent: Agent | null): string => {
    if (!agent?.name) return 'A';

    return agent.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

/**
 * Calculate agent commission rate as percentage
 * @param totalRevenue - Total revenue generated
 * @param totalCommission - Total commission earned
 * @returns Commission rate as percentage
 */
export const calculateCommissionRate = (totalRevenue: number, totalCommission: number): number => {
    if (totalRevenue <= 0) return 0;
    return (totalCommission / totalRevenue) * 100;
}; 