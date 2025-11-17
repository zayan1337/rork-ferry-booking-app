import { create } from 'zustand';
import { AgentStats, Booking } from '@/types/agent';
import { getActiveBookings, getInactiveBookings } from '@/utils/bookingUtils';
import { fetchAgentProfileWithStats } from '@/utils/agentUtils';

/**
 * Standardized error handling for stats operations
 */
const handleError = (error: unknown, defaultMessage: string, set: any) => {
  const errorMessage = error instanceof Error ? error.message : defaultMessage;
  console.error(defaultMessage, error);
  set({
    error: errorMessage,
    isLoading: false,
  });
  return errorMessage;
};

/**
 * Agent statistics state and actions
 */
interface AgentStatsState {
  // State
  stats: AgentStats;
  isLoading: boolean;
  error: string | null;

  // Actions
  updateStats: (agentId: string) => Promise<void>;
  getLocalStats: (bookings: Booking[], clients: any[]) => AgentStats;
  clearError: () => void;
  reset: () => void;

  // Internal helper methods
  getAgentProfile: (
    agentId: string
  ) => Promise<{ agent: any; stats: AgentStats } | null>;
}

export const useAgentStatsStore = create<AgentStatsState>((set, get) => ({
  // Initial state
  stats: {
    totalBookings: 0,
    activeBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    totalRevenue: 0,
    totalCommission: 0,
    uniqueClients: 0,
  },
  isLoading: false,
  error: null,

  /**
   * Get agent profile with stats from database (shared utility)
   * @param agentId - Agent ID to fetch profile for
   * @returns Agent profile with stats or null if not found
   */
  getAgentProfile: (agentId: string) => fetchAgentProfileWithStats(agentId),

  /**
   * Update agent statistics from database
   * @param agentId - Agent ID to update stats for
   */
  updateStats: async (agentId: string) => {
    if (!agentId) return;

    try {
      set({ isLoading: true, error: null });

      const profileData = await get().getAgentProfile(agentId);
      if (profileData) {
        set({
          stats: profileData.stats,
          isLoading: false,
        });
      } else {
        set({
          error: 'Agent profile not found',
          isLoading: false,
        });
      }
    } catch (error) {
      handleError(error, 'Failed to update stats', set);
    }
  },

  /**
   * Calculate local statistics from current data
   * @param bookings - Array of bookings to calculate stats from
   * @param clients - Array of clients (for additional stats if needed)
   * @returns Calculated agent statistics
   */
  getLocalStats: (bookings: Booking[], clients: any[]): AgentStats => {
    const activeBookings = getActiveBookings(bookings);
    const inactiveBookings = getInactiveBookings(bookings);

    // Only count revenue from confirmed, checked_in, or completed bookings (exclude cancelled)
    const validRevenueBookings = bookings.filter(
      b =>
        b.status === 'confirmed' ||
        b.status === 'checked_in' ||
        b.status === 'completed'
    );

    return {
      totalBookings: bookings.length,
      activeBookings: activeBookings.length,
      completedBookings: bookings.filter(b => b.status === 'completed').length,
      cancelledBookings: bookings.filter(b => b.status === 'cancelled').length,
      totalRevenue: validRevenueBookings.reduce(
        (sum, booking) =>
          sum + (booking.totalAmount || booking.discountedAmount || 0),
        0
      ),
      totalCommission: validRevenueBookings.reduce(
        (sum, booking) => sum + (booking.commission || 0),
        0
      ),
      uniqueClients: new Set(bookings.map(b => b.clientId)).size,
    };
  },

  /**
   * Clear error state
   */
  clearError: () => set({ error: null }),

  /**
   * Reset store to initial state
   */
  reset: () => {
    set({
      stats: {
        totalBookings: 0,
        activeBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        totalRevenue: 0,
        totalCommission: 0,
        uniqueClients: 0,
      },
      isLoading: false,
      error: null,
    });
  },
}));
