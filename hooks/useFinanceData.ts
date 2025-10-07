import { useEffect, useState, useCallback } from 'react';
import { useFinanceStore } from '@/store/admin/financeStore';
import {
  WalletFormData,
  WalletTransactionFormData,
  PaymentFormData,
  FinanceFilters,
  WalletFilters,
  TransactionFilters,
} from '@/types/admin/finance';

// ============================================================================
// FINANCE DATA HOOKS - COMPONENT INTEGRATION
// ============================================================================

/**
 * Hook for managing wallet data
 */
export const useWalletData = () => {
  const {
    wallets,
    loading,
    error,
    searchQueries,
    filters,
    fetchWallets,
    createWallet,
    createWalletTransaction,
    setSearchQuery,
    setFilters,
    clearFilters,
    refreshData,
  } = useFinanceStore();

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch wallets on mount
  useEffect(() => {
    fetchWallets();
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  }, [refreshData]);

  // Handle search
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery('wallets', query);
      fetchWallets(true);
    },
    [setSearchQuery, fetchWallets]
  );

  // Handle filter changes
  const handleFilterChange = useCallback(
    (newFilters: Partial<WalletFilters>) => {
      setFilters('wallets', newFilters);
      fetchWallets(true);
    },
    [setFilters, fetchWallets]
  );

  // Handle wallet creation
  const handleCreateWallet = useCallback(
    async (walletData: WalletFormData) => {
      try {
        const newWallet = await createWallet(walletData);
        return newWallet;
      } catch (error) {
        console.error('Failed to create wallet:', error);
        throw error;
      }
    },
    [createWallet]
  );

  // Handle transaction creation
  const handleCreateTransaction = useCallback(
    async (transactionData: WalletTransactionFormData) => {
      try {
        const newTransaction = await createWalletTransaction(transactionData);
        return newTransaction;
      } catch (error) {
        console.error('Failed to create transaction:', error);
        throw error;
      }
    },
    [createWalletTransaction]
  );

  return {
    wallets,
    loading: loading.wallets,
    error,
    isRefreshing,
    searchQuery: searchQueries.wallets,
    filters: filters.wallets,
    handleRefresh,
    handleSearch,
    handleFilterChange,
    handleCreateWallet,
    handleCreateTransaction,
    clearFilters: () => clearFilters('wallets'),
  };
};

/**
 * Hook for managing wallet transaction data
 */
export const useWalletTransactionData = () => {
  const {
    walletTransactions,
    loading,
    error,
    searchQueries,
    filters,
    fetchWalletTransactions,
    setSearchQuery,
    setFilters,
    clearFilters,
    refreshData,
  } = useFinanceStore();

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch transactions on mount
  useEffect(() => {
    fetchWalletTransactions();
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  }, [refreshData]);

  // Handle search
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery('transactions', query);
      fetchWalletTransactions(true);
    },
    [setSearchQuery, fetchWalletTransactions]
  );

  // Handle filter changes
  const handleFilterChange = useCallback(
    (newFilters: Partial<TransactionFilters>) => {
      setFilters('transactions', newFilters);
      fetchWalletTransactions(true);
    },
    [setFilters, fetchWalletTransactions]
  );

  return {
    transactions: walletTransactions,
    loading: loading.transactions,
    error,
    isRefreshing,
    searchQuery: searchQueries.transactions,
    filters: filters.transactions,
    handleRefresh,
    handleSearch,
    handleFilterChange,
    clearFilters: () => clearFilters('transactions'),
  };
};

/**
 * Hook for managing payment data
 */
export const usePaymentData = () => {
  const {
    payments,
    loading,
    error,
    searchQueries,
    filters,
    fetchPayments,
    createPayment,
    updatePaymentStatus,
    setSearchQuery,
    setFilters,
    clearFilters,
    refreshData,
  } = useFinanceStore();

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch payments on mount
  useEffect(() => {
    fetchPayments();
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  }, [refreshData]);

  // Handle search
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery('payments', query);
      fetchPayments(true);
    },
    [setSearchQuery, fetchPayments]
  );

  // Handle filter changes
  const handleFilterChange = useCallback(
    (newFilters: Partial<FinanceFilters>) => {
      setFilters('payments', newFilters);
      fetchPayments(true);
    },
    [setFilters, fetchPayments]
  );

  // Handle payment creation
  const handleCreatePayment = useCallback(
    async (paymentData: PaymentFormData) => {
      try {
        const newPayment = await createPayment(paymentData);
        return newPayment;
      } catch (error) {
        console.error('Failed to create payment:', error);
        throw error;
      }
    },
    [createPayment]
  );

  // Handle payment status update
  const handleUpdatePaymentStatus = useCallback(
    async (paymentId: string, status: string) => {
      try {
        await updatePaymentStatus(paymentId, status);
      } catch (error) {
        console.error('Failed to update payment status:', error);
        throw error;
      }
    },
    [updatePaymentStatus]
  );

  return {
    payments,
    loading: loading.payments,
    error,
    isRefreshing,
    searchQuery: searchQueries.payments,
    filters: filters.payments,
    handleRefresh,
    handleSearch,
    handleFilterChange,
    handleCreatePayment,
    handleUpdatePaymentStatus,
    clearFilters: () => clearFilters('payments'),
  };
};

/**
 * Hook for managing finance statistics
 */
export const useFinanceStats = () => {
  const { stats, paymentMethodStats, loading, error, fetchStats, refreshData } =
    useFinanceStore();

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch stats on mount
  useEffect(() => {
    fetchStats();
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  }, [refreshData]);

  return {
    stats,
    paymentMethodStats,
    loading: loading.stats,
    error,
    isRefreshing,
    handleRefresh,
  };
};

/**
 * Hook for managing finance dashboard data
 */
export const useFinanceDashboard = () => {
  const { dashboardData, loading, error, fetchDashboardData, refreshData } =
    useFinanceStore();

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch dashboard data on mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  }, [refreshData]);

  return {
    dashboardData,
    loading: loading.dashboard,
    error,
    isRefreshing,
    handleRefresh,
  };
};

/**
 * Hook for managing finance operations (CRUD)
 */
export const useFinanceOperations = () => {
  const {
    createWallet,
    createWalletTransaction,
    createPayment,
    updatePaymentStatus,
    getWalletByUserId,
    loading,
    error,
  } = useFinanceStore();

  return {
    // Wallet operations
    createWallet: async (walletData: WalletFormData) => {
      try {
        return await createWallet(walletData);
      } catch (error) {
        console.error('Failed to create wallet:', error);
        throw error;
      }
    },

    // Transaction operations
    createWalletTransaction: async (
      transactionData: WalletTransactionFormData
    ) => {
      try {
        return await createWalletTransaction(transactionData);
      } catch (error) {
        console.error('Failed to create wallet transaction:', error);
        throw error;
      }
    },

    // Payment operations
    createPayment: async (paymentData: PaymentFormData) => {
      try {
        return await createPayment(paymentData);
      } catch (error) {
        console.error('Failed to create payment:', error);
        throw error;
      }
    },

    updatePaymentStatus: async (paymentId: string, status: string) => {
      try {
        await updatePaymentStatus(paymentId, status);
      } catch (error) {
        console.error('Failed to update payment status:', error);
        throw error;
      }
    },

    // Utility operations
    getWalletByUserId: async (userId: string) => {
      try {
        return await getWalletByUserId(userId);
      } catch (error) {
        console.error('Failed to get wallet by user ID:', error);
        throw error;
      }
    },

    loading: loading.creating || loading.updating,
    error,
  };
};

/**
 * Hook for managing finance filters and search
 */
export const useFinanceFilters = () => {
  const { searchQueries, filters, setSearchQuery, setFilters, clearFilters } =
    useFinanceStore();

  return {
    searchQueries,
    filters,
    setSearchQuery,
    setFilters,
    clearFilters,
  };
};

/**
 * Combined hook for finance screen
 */
export const useFinanceScreen = () => {
  const walletData = useWalletData();
  const transactionData = useWalletTransactionData();
  const paymentData = usePaymentData();
  const statsData = useFinanceStats();
  const dashboardData = useFinanceDashboard();
  const operations = useFinanceOperations();

  return {
    // Data
    wallets: walletData.wallets,
    transactions: transactionData.transactions,
    payments: paymentData.payments,
    agentCreditTransactions: [], // TODO: Add agent credit transactions
    stats: statsData.stats,
    paymentMethodStats: statsData.paymentMethodStats,
    dashboardData: dashboardData.dashboardData,

    // Loading states
    loading: {
      wallets: walletData.loading,
      transactions: transactionData.loading,
      payments: paymentData.loading,
      stats: statsData.loading,
      dashboard: dashboardData.loading,
      operations: operations.loading,
    },

    // Error states
    error:
      walletData.error ||
      transactionData.error ||
      paymentData.error ||
      statsData.error ||
      dashboardData.error ||
      operations.error,

    // Refresh states
    isRefreshing:
      walletData.isRefreshing ||
      transactionData.isRefreshing ||
      paymentData.isRefreshing ||
      statsData.isRefreshing ||
      dashboardData.isRefreshing,

    // Actions
    handleRefresh: async () => {
      await Promise.all([
        walletData.handleRefresh(),
        transactionData.handleRefresh(),
        paymentData.handleRefresh(),
        statsData.handleRefresh(),
        dashboardData.handleRefresh(),
      ]);
    },

    // Search and filters
    searchQueries: {
      wallets: walletData.searchQuery,
      transactions: transactionData.searchQuery,
      payments: paymentData.searchQuery,
    },

    filters: {
      wallets: walletData.filters,
      transactions: transactionData.filters,
      payments: paymentData.filters,
    },

    handleSearch: {
      wallets: walletData.handleSearch,
      transactions: transactionData.handleSearch,
      payments: paymentData.handleSearch,
    },

    handleFilterChange: {
      wallets: walletData.handleFilterChange,
      transactions: transactionData.handleFilterChange,
      payments: paymentData.handleFilterChange,
    },

    clearFilters: {
      wallets: walletData.clearFilters,
      transactions: transactionData.clearFilters,
      payments: paymentData.clearFilters,
    },

    // Operations
    operations,
  };
};
