import type { Agent, AgentStats, Booking, Client } from '@/types/agent';
import { getActiveBookings, getInactiveBookings } from './bookingUtils';
import { supabase } from './supabase';

/**
 * Agent profile data structure from database RPC calls
 */
interface DatabaseAgentProfile {
  id: string;
  name: string;
  email: string;
  agentid?: string;
  agentId?: string;
  creditceiling?: number;
  creditCeiling?: number;
  creditbalance?: number;
  creditBalance?: number;
  discountrate?: number;
  discountRate?: number;
  freeticketsallocation?: number;
  freeTicketsAllocation?: number;
  freeticketsremaining?: number;
  freeTicketsRemaining?: number;
  totalbookings?: number;
  totalBookings?: number;
  activebookings?: number;
  activeBookings?: number;
  completedbookings?: number;
  completedBookings?: number;
  cancelledbookings?: number;
  cancelledBookings?: number;
  totalrevenue?: number;
  totalRevenue?: number;
  totalcommission?: number;
  totalCommission?: number;
  uniqueclients?: number;
  uniqueClients?: number;
}

/**
 * Safely extract value with snake_case and camelCase fallback
 */
export const safeExtract = (
  profile: DatabaseAgentProfile,
  camelKey: keyof DatabaseAgentProfile,
  snakeKey: keyof DatabaseAgentProfile,
  defaultValue: any = ''
) => {
  return profile[camelKey] ?? profile[snakeKey] ?? defaultValue;
};

/**
 * Convert database profile to Agent type with proper type safety
 */
export const mapProfileToAgent = (profile: DatabaseAgentProfile): Agent => {
  return {
    id: String(profile.id || ''),
    name: String(profile.name || ''),
    email: String(profile.email || ''),
    agentId: String(safeExtract(profile, 'agentId', 'agentid', '')),
    creditCeiling: Number(
      safeExtract(profile, 'creditCeiling', 'creditceiling', 0)
    ),
    creditBalance: Number(
      safeExtract(profile, 'creditBalance', 'creditbalance', 0)
    ),
    discountRate: Number(
      safeExtract(profile, 'discountRate', 'discountrate', 0)
    ),
    freeTicketsAllocation: Number(
      safeExtract(profile, 'freeTicketsAllocation', 'freeticketsallocation', 0)
    ),
    freeTicketsRemaining: Number(
      safeExtract(profile, 'freeTicketsRemaining', 'freeticketsremaining', 0)
    ),
  };
};

/**
 * Extract stats from database profile
 */
export const mapProfileToStats = (
  profile: DatabaseAgentProfile
): AgentStats => {
  return {
    totalBookings: Number(
      safeExtract(profile, 'totalBookings', 'totalbookings', 0)
    ),
    activeBookings: Number(
      safeExtract(profile, 'activeBookings', 'activebookings', 0)
    ),
    completedBookings: Number(
      safeExtract(profile, 'completedBookings', 'completedbookings', 0)
    ),
    cancelledBookings: Number(
      safeExtract(profile, 'cancelledBookings', 'cancelledbookings', 0)
    ),
    totalRevenue: Number(
      safeExtract(profile, 'totalRevenue', 'totalrevenue', 0)
    ),
    totalCommission: Number(
      safeExtract(profile, 'totalCommission', 'totalcommission', 0)
    ),
    uniqueClients: Number(
      safeExtract(profile, 'uniqueClients', 'uniqueclients', 0)
    ),
  };
};

/**
 * Create fallback agent from auth user data
 * Used when agent profile is not found in database
 */
export const createFallbackAgent = (authUser: any): Agent => {
  return {
    id: authUser.id,
    name: authUser.profile?.full_name || 'Agent',
    email: authUser.email || '',
    agentId: 'TRA-' + authUser.id.slice(-4),
    creditCeiling: authUser.profile?.credit_ceiling || 10000,
    creditBalance: authUser.profile?.credit_balance || 0,
    discountRate: authUser.profile?.agent_discount || 12,
    freeTicketsAllocation: authUser.profile?.free_tickets_allocation || 10,
    freeTicketsRemaining: authUser.profile?.free_tickets_remaining || 10,
  };
};

/**
 * Shared utility to fetch agent profile with stats from database
 * Used by multiple stores to avoid code duplication
 */
export const fetchAgentProfileWithStats = async (
  agentId: string
): Promise<{ agent: Agent; stats: AgentStats } | null> => {
  try {
    // Try the main RPC function first
    let { data, error } = await supabase.rpc('get_agent_profile', {
      agent_user_id: agentId,
    });

    // Fallback to simpler function if type mismatch
    if (error?.code === '42804') {
      const result = await supabase.rpc('get_agent_profile_simple', {
        agent_user_id: agentId,
      });
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Error in fetchAgentProfileWithStats:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const profile = data[0] as DatabaseAgentProfile;
    const agent = mapProfileToAgent(profile);
    const stats = mapProfileToStats(profile);

    return { agent, stats };
  } catch (error) {
    console.error('Error fetching agent profile with stats:', error);
    throw error;
  }
};

/**
 * Calculate local agent statistics from bookings data
 * @param bookings - Array of bookings
 * @param clients - Array of clients
 * @returns Calculated agent statistics
 */
export const calculateLocalAgentStats = (
  bookings: Booking[],
  clients: Client[]
): AgentStats => {
  const activeBookings = getActiveBookings(bookings);
  const inactiveBookings = getInactiveBookings(bookings);

  return {
    totalBookings: bookings.length,
    activeBookings: activeBookings.length,
    completedBookings: bookings.filter(b => b.status === 'completed').length,
    cancelledBookings: bookings.filter(b => b.status === 'cancelled').length,
    totalRevenue: bookings.reduce(
      (sum, booking) => sum + (booking.totalAmount || 0),
      0
    ),
    totalCommission: bookings.reduce(
      (sum, booking) => sum + (booking.commission || 0),
      0
    ),
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
      error: `Insufficient credit balance. Required: $${requiredAmount.toFixed(2)}, Available: $${agent.creditBalance.toFixed(2)}`,
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
      error: `Insufficient free tickets. Required: ${requiredTickets}, Available: ${agent.freeTicketsRemaining}`,
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
  return agent.creditBalance < agent.creditCeiling * 0.2;
};

/**
 * Get inactive bookings count for a specific client
 * @param bookings - All bookings
 * @param clientId - Client ID
 * @returns Number of inactive bookings for the client
 */
export const getClientInactiveBookingsCount = (
  bookings: Booking[],
  clientId: string
): number => {
  const clientBookings = bookings.filter(booking => {
    // Handle both types of client matching
    return (
      booking.clientId === clientId ||
      booking.userId === clientId ||
      booking.agentClientId === clientId
    );
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
export const calculateCommissionRate = (
  totalRevenue: number,
  totalCommission: number
): number => {
  if (totalRevenue <= 0) return 0;
  return (totalCommission / totalRevenue) * 100;
};

/**
 * Calculate commission for a single booking based on discount provided
 * @param originalFare - Original fare before discount
 * @param discountedFare - Fare after agent discount
 * @returns Commission amount (difference between original and discounted fare)
 */
export const calculateBookingCommission = (
  originalFare: number,
  discountedFare: number
): number => {
  if (originalFare <= 0 || discountedFare < 0) return 0;
  return Math.max(0, originalFare - discountedFare);
};

/**
 * Calculate commission based on discount rate and original fare
 * @param originalFare - Original fare before discount
 * @param discountRate - Agent discount rate (percentage)
 * @returns Commission amount
 */
export const calculateBookingCommissionFromDiscount = (
  originalFare: number,
  discountRate: number
): number => {
  if (originalFare <= 0) return 0;
  const discountAmount = originalFare * (discountRate / 100);
  return Math.max(0, discountAmount);
};

/**
 * Calculate total commission from an array of bookings
 * @param bookings - Array of bookings with commission values
 * @returns Total commission amount
 */
export const calculateTotalCommissionFromBookings = (
  bookings: Booking[]
): number => {
  return bookings.reduce((total, booking) => {
    if (booking.commission && booking.commission > 0) {
      return total + booking.commission;
    }

    // Fallback: calculate commission if not set but we have fare data
    if (booking.totalAmount && booking.discountedAmount) {
      const commission = calculateBookingCommission(
        booking.totalAmount,
        booking.discountedAmount
      );
      return total + commission;
    }

    return total;
  }, 0);
};

/**
 * Update booking object with calculated commission
 * @param booking - Booking object to update
 * @returns Updated booking with commission calculated
 */
export const updateBookingWithCommission = (booking: Booking): Booking => {
  // If commission is already set and valid, use it
  if (booking.commission && booking.commission > 0) {
    return booking;
  }

  // Calculate commission based on fare difference
  const commission =
    booking.totalAmount && booking.discountedAmount
      ? calculateBookingCommission(
          booking.totalAmount,
          booking.discountedAmount
        )
      : 0;

  return {
    ...booking,
    commission,
  };
};
