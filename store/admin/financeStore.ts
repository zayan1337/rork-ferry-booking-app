import { create } from 'zustand';
import {
  fetchWallets,
  fetchWalletTransactions,
  fetchPayments,
  fetchFinanceStats,
  fetchPaymentMethodStats,
  fetchFinanceDashboardData,
  fetchAgentCreditTransactions,
  createWallet,
  createWalletTransaction,
  createPayment,
  updatePaymentStatus,
  getWalletByUserId,
  createWalletsForAllUsers,
} from '@/utils/admin/financeService';
import {
  Wallet,
  WalletTransaction,
  Payment,
  PaymentReport,
  FinanceStats,
  PaymentMethodStats,
  FinanceDashboardData,
  WalletFormData,
  WalletTransactionFormData,
  PaymentFormData,
  FinanceFilters,
  WalletFilters,
  TransactionFilters,
} from '@/types/admin/finance';

// ============================================================================
// FINANCE STORE STATE INTERFACE
// ============================================================================

interface LoadingState {
  wallets: boolean;
  transactions: boolean;
  payments: boolean;
  stats: boolean;
  dashboard: boolean;
  creating: boolean;
  updating: boolean;
  agentCredit: boolean;
}

interface FinanceState {
  // Data
  wallets: Wallet[];
  walletTransactions: WalletTransaction[];
  walletTransactionsLoaded: boolean;
  payments: Payment[];
  paymentReports: PaymentReport[];
  agentCreditTransactions: any[];
  stats: FinanceStats;
  paymentMethodStats: PaymentMethodStats[];
  dashboardData: FinanceDashboardData | null;

  // Loading states
  loading: LoadingState;
  error: string | null;

  // Search and filtering
  searchQueries: {
    wallets: string;
    transactions: string;
    payments: string;
  };
  filters: {
    wallets: WalletFilters;
    transactions: TransactionFilters;
    payments: FinanceFilters;
  };

  // Pagination
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  hasMore: boolean;

  // Actions
  // Data fetching
  fetchWallets: (refresh?: boolean) => Promise<void>;
  fetchWalletTransactions: (refresh?: boolean) => Promise<void>;
  fetchPayments: (refresh?: boolean) => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchDashboardData: () => Promise<void>;
  fetchAgentCreditTransactions: () => Promise<void>;
  refreshData: () => Promise<void>;

  // CRUD operations
  createWallet: (walletData: WalletFormData) => Promise<Wallet>;
  createWalletTransaction: (
    transactionData: WalletTransactionFormData
  ) => Promise<WalletTransaction>;
  createPayment: (paymentData: PaymentFormData) => Promise<Payment>;
  updatePaymentStatus: (paymentId: string, status: string) => Promise<void>;
  getWalletByUserId: (userId: string) => Promise<Wallet | null>;
  createWalletsForAllUsers: () => Promise<{
    created: number;
    skipped: number;
    errors: number;
  }>;

  // Search and filter actions
  setSearchQuery: (
    type: 'wallets' | 'transactions' | 'payments',
    query: string
  ) => void;
  setFilters: (
    type: 'wallets' | 'transactions' | 'payments',
    filters: any
  ) => void;
  clearFilters: (type: 'wallets' | 'transactions' | 'payments') => void;

  // Pagination actions
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (items: number) => void;
  loadMore: () => Promise<void>;

  // Utility actions
  reset: () => void;
  getFilteredData: (type: 'wallets' | 'transactions' | 'payments') => any[];
  getManualWalletCreditsByAgent: (agentId: string) => WalletTransaction[];
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialLoadingState: LoadingState = {
  wallets: false,
  transactions: false,
  payments: false,
  stats: false,
  dashboard: false,
  creating: false,
  updating: false,
  agentCredit: false,
};

const initialFilters = {
  wallets: {
    searchQuery: '',
    status: 'all' as const,
    balanceRange: { min: 0, max: 0 },
    sortBy: 'created_at' as const,
    sortOrder: 'desc' as const,
  },
  transactions: {
    searchQuery: '',
    type: 'all' as const,
    dateRange: { start: '', end: '' },
    amountRange: { min: 0, max: 0 },
    sortBy: 'created_at' as const,
    sortOrder: 'desc' as const,
  },
  payments: {
    searchQuery: '',
    dateRange: { start: '', end: '' },
    status: 'all' as const,
    paymentMethod: 'all' as const,
    amountRange: { min: 0, max: 0 },
    sortBy: 'created_at' as const,
    sortOrder: 'desc' as const,
  },
};

const initialStats: FinanceStats = {
  totalWalletBalance: 0,
  activeWallets: 0,
  weeklyRevenue: 0,
  monthlyRevenue: 0,
  paymentSuccessRate: 0,
  completedPayments: 0,
  pendingPayments: 0,
  failedPayments: 0,
  totalRevenue: 0,
  averageTransactionAmount: 0,
};

// ============================================================================
// FINANCE STORE IMPLEMENTATION
// ============================================================================

export const useFinanceStore = create<FinanceState>((set, get) => ({
  // Initial state
  wallets: [],
  walletTransactions: [],
  walletTransactionsLoaded: false,
  payments: [],
  paymentReports: [],
  agentCreditTransactions: [],
  stats: initialStats,
  paymentMethodStats: [],
  dashboardData: null,
  loading: initialLoadingState,
  error: null,
  searchQueries: {
    wallets: '',
    transactions: '',
    payments: '',
  },
  filters: initialFilters,
  currentPage: 1,
  itemsPerPage: 20,
  totalItems: 0,
  hasMore: false,

  // Data fetching actions
  fetchWallets: async (refresh = false) => {
    const state = get();
    // Prevent concurrent fetches unless explicitly refreshing
    if (state.loading.wallets && !refresh) {
      return;
    }

    set({ loading: { ...state.loading, wallets: true }, error: null });

    try {
      const filters = state.filters.wallets;
      const wallets = await fetchWallets(filters);

      set({
        wallets,
        loading: { ...state.loading, wallets: false },
        totalItems: wallets.length,
        hasMore: wallets.length >= state.itemsPerPage,
      });
    } catch (error) {
      console.error('❌ [financeStore] Failed to fetch wallets:', error);
      set({
        wallets: [], // Ensure wallets is set to empty array on error
        loading: { ...state.loading, wallets: false },
        error:
          error instanceof Error ? error.message : 'Failed to fetch wallets',
      });
    }
  },

  fetchWalletTransactions: async (refresh = false) => {
    const state = get();
    if (state.loading.transactions && !refresh) return;

    set({ loading: { ...state.loading, transactions: true }, error: null });

    try {
      const filters = state.filters.transactions;
      const transactions = await fetchWalletTransactions(filters);

      set({
        walletTransactions: transactions,
        walletTransactionsLoaded: true,
        loading: { ...state.loading, transactions: false },
        totalItems: transactions.length,
        hasMore: transactions.length >= state.itemsPerPage,
      });
    } catch (error) {
      console.error('Failed to fetch wallet transactions:', error);
      set({
        loading: { ...state.loading, transactions: false },
        walletTransactionsLoaded: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch wallet transactions',
      });
    }
  },

  fetchPayments: async (refresh = false) => {
    const state = get();
    if (state.loading.payments && !refresh) return;

    set({ loading: { ...state.loading, payments: true }, error: null });

    try {
      const filters = state.filters.payments;
      const payments = await fetchPayments(filters);

      set({
        payments,
        loading: { ...state.loading, payments: false },
        totalItems: payments.length,
        hasMore: payments.length >= state.itemsPerPage,
      });
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      set({
        loading: { ...state.loading, payments: false },
        error:
          error instanceof Error ? error.message : 'Failed to fetch payments',
      });
    }
  },

  fetchStats: async () => {
    const state = get();
    if (state.loading.stats) return;

    set({ loading: { ...state.loading, stats: true }, error: null });

    try {
      const stats = await fetchFinanceStats();
      const paymentMethodStats = await fetchPaymentMethodStats();

      set({
        stats,
        paymentMethodStats,
        loading: { ...state.loading, stats: false },
      });
    } catch (error) {
      console.error('Failed to fetch finance stats:', error);
      set({
        loading: { ...state.loading, stats: false },
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch finance stats',
      });
    }
  },

  fetchDashboardData: async () => {
    const state = get();
    if (state.loading.dashboard) return;

    set({ loading: { ...state.loading, dashboard: true }, error: null });

    try {
      const dashboardData = await fetchFinanceDashboardData();

      set({
        dashboardData,
        loading: { ...state.loading, dashboard: false },
      });
    } catch (error) {
      console.error('Failed to fetch finance dashboard data:', error);
      set({
        loading: { ...state.loading, dashboard: false },
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch finance dashboard data',
      });
    }
  },

  fetchAgentCreditTransactions: async () => {
    const state = get();
    if (state.loading.agentCredit) return;

    set({ loading: { ...state.loading, agentCredit: true }, error: null });

    try {
      const agentTransactions = await fetchAgentCreditTransactions();

      set({
        agentCreditTransactions: agentTransactions,
        loading: { ...state.loading, agentCredit: false },
      });
    } catch (error) {
      console.error('Failed to fetch agent credit transactions:', error);
      set({
        loading: { ...state.loading, agentCredit: false },
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch agent credit transactions',
      });
    }
  },

  refreshData: async () => {
    const state = get();
    set({ loading: { ...initialLoadingState, dashboard: true }, error: null });

    try {
      await Promise.all([
        state.fetchWallets(true),
        state.fetchWalletTransactions(true),
        state.fetchPayments(true),
        state.fetchAgentCreditTransactions(),
        state.fetchStats(),
        state.fetchDashboardData(),
      ]);
    } catch (error) {
      console.error('Failed to refresh finance data:', error);
      set({
        loading: initialLoadingState,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to refresh finance data',
      });
    }
  },

  // CRUD operations
  createWallet: async (walletData: WalletFormData) => {
    const state = get();
    set({ loading: { ...state.loading, creating: true }, error: null });

    try {
      const newWallet = await createWallet(walletData);

      set({
        wallets: [newWallet, ...state.wallets],
        loading: { ...state.loading, creating: false },
      });

      return newWallet;
    } catch (error) {
      console.error('Failed to create wallet:', error);
      set({
        loading: { ...state.loading, creating: false },
        error:
          error instanceof Error ? error.message : 'Failed to create wallet',
      });
      throw error;
    }
  },

  createWalletTransaction: async (
    transactionData: WalletTransactionFormData
  ) => {
    const state = get();
    set({ loading: { ...state.loading, creating: true }, error: null });

    try {
      const newTransaction = await createWalletTransaction(transactionData);

      // Update wallet balance in the store
      const updatedWallets = state.wallets.map(wallet => {
        if (wallet.id === transactionData.wallet_id) {
          const newBalance =
            transactionData.transaction_type === 'credit'
              ? wallet.balance + transactionData.amount
              : wallet.balance - transactionData.amount;

          return {
            ...wallet,
            balance: newBalance,
            is_active: newBalance > 0,
          };
        }
        return wallet;
      });

      set({
        wallets: updatedWallets,
        walletTransactions: [newTransaction, ...state.walletTransactions],
        loading: { ...state.loading, creating: false },
      });

      return newTransaction;
    } catch (error) {
      console.error('Failed to create wallet transaction:', error);
      set({
        loading: { ...state.loading, creating: false },
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create wallet transaction',
      });
      throw error;
    }
  },

  createPayment: async (paymentData: PaymentFormData) => {
    const state = get();
    set({ loading: { ...state.loading, creating: true }, error: null });

    try {
      const newPayment = await createPayment(paymentData);

      set({
        payments: [newPayment, ...state.payments],
        loading: { ...state.loading, creating: false },
      });

      return newPayment;
    } catch (error) {
      console.error('Failed to create payment:', error);
      set({
        loading: { ...state.loading, creating: false },
        error:
          error instanceof Error ? error.message : 'Failed to create payment',
      });
      throw error;
    }
  },

  updatePaymentStatus: async (paymentId: string, status: string) => {
    const state = get();
    set({ loading: { ...state.loading, updating: true }, error: null });

    try {
      await updatePaymentStatus(paymentId, status);

      const updatedPayments = state.payments.map(payment =>
        payment.id === paymentId
          ? { ...payment, status: status as any }
          : payment
      );

      set({
        payments: updatedPayments,
        loading: { ...state.loading, updating: false },
      });
    } catch (error) {
      console.error('Failed to update payment status:', error);
      set({
        loading: { ...state.loading, updating: false },
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update payment status',
      });
      throw error;
    }
  },

  getWalletByUserId: async (userId: string) => {
    try {
      return await getWalletByUserId(userId);
    } catch (error) {
      console.error('Failed to get wallet by user ID:', error);
      throw error;
    }
  },

  createWalletsForAllUsers: async () => {
    const state = get();
    set({ loading: { ...state.loading, creating: true }, error: null });

    try {
      const result = await createWalletsForAllUsers();

      // Refresh wallets list after creating
      if (result.created > 0) {
        await state.fetchWallets(true);
      }

      set({ loading: { ...state.loading, creating: false } });
      return result;
    } catch (error) {
      console.error('Failed to create wallets for all users:', error);
      set({
        loading: { ...state.loading, creating: false },
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create wallets for all users',
      });
      throw error;
    }
  },

  // Search and filter actions
  setSearchQuery: (type, query) => {
    const state = get();
    set({
      searchQueries: { ...state.searchQueries, [type]: query },
      filters: {
        ...state.filters,
        [type]: { ...state.filters[type], searchQuery: query },
      },
    });
  },

  setFilters: (type, filters) => {
    const state = get();
    set({
      filters: {
        ...state.filters,
        [type]: { ...state.filters[type], ...filters },
      },
    });
  },

  clearFilters: type => {
    const state = get();
    set({
      filters: {
        ...state.filters,
        [type]: initialFilters[type],
      },
      searchQueries: {
        ...state.searchQueries,
        [type]: '',
      },
    });
  },

  // Pagination actions
  setCurrentPage: page => {
    set({ currentPage: page });
  },

  setItemsPerPage: items => {
    set({ itemsPerPage: items, currentPage: 1 });
  },

  loadMore: async () => {
    const state = get();
    if (
      !state.hasMore ||
      state.loading.wallets ||
      state.loading.transactions ||
      state.loading.payments ||
      state.loading.agentCredit
    ) {
      return;
    }

    const nextPage = state.currentPage + 1;
    set({ currentPage: nextPage });

    // Load more data based on current context
    // This would need to be implemented based on which section is active
  },

  // Utility actions
  getFilteredData: type => {
    const state = get();
    switch (type) {
      case 'wallets':
        return state.wallets;
      case 'transactions':
        return state.walletTransactions;
      case 'payments':
        return state.payments;
      default:
        return [];
    }
  },

  reset: () => {
    set({
      wallets: [],
      walletTransactions: [],
      walletTransactionsLoaded: false,
      payments: [],
      paymentReports: [],
      stats: initialStats,
      paymentMethodStats: [],
      dashboardData: null,
      loading: initialLoadingState,
      error: null,
      searchQueries: {
        wallets: '',
        transactions: '',
        payments: '',
      },
      filters: initialFilters,
      currentPage: 1,
      totalItems: 0,
      hasMore: false,
    });
  },
  getManualWalletCreditsByAgent: agentId => {
    const state = get();

    if (!agentId) {
      return [];
    }

    // ❌ REMOVED: Do NOT call fetchWalletTransactions() here!
    // This causes "setState in render" error when called from useMemo/useCallback
    // Data fetching should be done in useEffect in the component, not in getter functions

    const hasTransactions = Array.isArray(state.walletTransactions);

    if (!hasTransactions || state.walletTransactions.length === 0) {
      return [];
    }

    return state.walletTransactions.filter(
      tx => tx && tx.transaction_type === 'credit' && tx.wallet_id === agentId
    );
  },
}));
