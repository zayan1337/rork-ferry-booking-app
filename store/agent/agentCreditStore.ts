import { create } from 'zustand';
import { CreditTransaction } from '@/types/agent';
import { supabase } from '@/utils/supabase';

/**
 * Validate required parameters
 * @param agentId - The agent ID to validate
 * @param paramName - Name of parameter for error messages
 * @throws {Error} If agent ID is not provided
 */
const validateRequired = (agentId: string, paramName: string = 'Agent ID') => {
  if (!agentId) {
    throw new Error(`${paramName} is required`);
  }
};

/**
 * Standardized error handling for credit operations
 * @param error - The error object or message
 * @param defaultMessage - Default error message to use
 * @param set - Zustand set function for updating store state
 * @returns The error message string
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
 * Agent credit transactions state and actions
 */
interface AgentCreditState {
  // State
  creditTransactions: CreditTransaction[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchCreditTransactions: (agentId: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;

  // Internal helper methods
  getAgentCreditTransactions: (agentId: string) => Promise<CreditTransaction[]>;
}

export const useAgentCreditStore = create<AgentCreditState>((set, get) => ({
  // Initial state
  creditTransactions: [],
  isLoading: false,
  error: null,

  /**
   * Get agent credit transactions from database
   * @param agentId - Agent ID to fetch credit transactions for
   * @returns Array of credit transactions
   */
  getAgentCreditTransactions: async (
    agentId: string
  ): Promise<CreditTransaction[]> => {
    try {
      validateRequired(agentId);

      const { data, error } = await supabase.rpc(
        'get_agent_credit_transactions',
        {
          agent_user_id: agentId,
        }
      );

      if (error) throw error;

      return (data || []).map((transaction: any) => ({
        id: transaction.id,
        date: transaction.date,
        amount: Number(transaction.amount || 0),
        type: transaction.type as CreditTransaction['type'],
        bookingId: transaction.bookingid, // lowercase from database
        bookingNumber: transaction.booking_number, // booking number from database
        description: transaction.description || '',
        balance: Number(transaction.balance || 0),
      }));
    } catch (error) {
      console.error('Error fetching agent credit transactions:', error);
      throw error;
    }
  },

  /**
   * Fetch credit transactions for an agent
   * @param agentId - Agent ID to fetch credit transactions for
   */
  fetchCreditTransactions: async (agentId: string) => {
    if (!agentId) return;

    try {
      set({ isLoading: true, error: null });

      const creditTransactions =
        await get().getAgentCreditTransactions(agentId);
      set({
        creditTransactions,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      handleError(error, 'Failed to fetch credit transactions', set);
    }
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
      creditTransactions: [],
      isLoading: false,
      error: null,
    });
  },
}));
