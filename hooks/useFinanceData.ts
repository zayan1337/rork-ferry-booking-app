import { useEffect, useCallback, useMemo } from 'react';
import { useFinanceStore } from '@/store/admin/financeStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import type { Payment, Wallet, WalletTransaction } from '@/types/admin/finance';

/**
 * Custom hook for managing finance data with comprehensive filtering and statistics
 * Provides centralized finance data fetching and state management
 *
 * Features:
 * - Automatic initialization and data fetching
 * - Comprehensive filtering for payments, wallets, and transactions
 * - Real-time statistics calculation
 * - Agent-specific wallet filtering
 * - Error handling and retry mechanisms
 * - Granular refresh controls
 */
export const useFinanceData = () => {
  const {
    payments,
    wallets,
    walletTransactions,
    walletTransactionsLoaded,
    agentCreditTransactions,
    stats,
    paymentMethodStats,
    loading,
    error,
    searchQueries,
    filters,
    fetchPayments,
    fetchWallets,
    fetchWalletTransactions,
    fetchAgentCreditTransactions,
    fetchStats,
    setSearchQuery,
    setFilters,
    clearFilters,
    refreshData,
    getManualWalletCreditsByAgent,
  } = useFinanceStore();

  const {
    canViewPayments,
    canViewWallets,
    canManagePayments,
    canManageWallets,
  } = useAdminPermissions();

  // Calculate filtered payments based on search and filters
  const filteredPayments = useMemo(() => {
    if (!payments) return [];

    let filtered = [...payments];

    // Apply search filter
    const searchQuery = searchQueries.payments.toLowerCase();
    if (searchQuery) {
      filtered = filtered.filter(
        payment =>
          payment.booking?.booking_number
            ?.toLowerCase()
            .includes(searchQuery) ||
          payment.booking?.user_name?.toLowerCase().includes(searchQuery) ||
          payment.receipt_number?.toLowerCase().includes(searchQuery)
      );
    }

    // Apply status filter
    if (filters.payments.status && filters.payments.status !== 'all') {
      filtered = filtered.filter(
        payment => payment.status === filters.payments.status
      );
    }

    // Apply payment method filter
    if (
      filters.payments.paymentMethod &&
      filters.payments.paymentMethod !== 'all'
    ) {
      filtered = filtered.filter(
        payment => payment.payment_method === filters.payments.paymentMethod
      );
    }

    // Apply date range filter
    if (filters.payments.dateRange.start) {
      filtered = filtered.filter(
        payment =>
          new Date(payment.created_at) >=
          new Date(filters.payments.dateRange.start)
      );
    }
    if (filters.payments.dateRange.end) {
      filtered = filtered.filter(
        payment =>
          new Date(payment.created_at) <=
          new Date(filters.payments.dateRange.end)
      );
    }

    // Apply amount range filter
    if (filters.payments.amountRange.min) {
      filtered = filtered.filter(
        payment => payment.amount >= filters.payments.amountRange.min
      );
    }
    if (filters.payments.amountRange.max) {
      filtered = filtered.filter(
        payment => payment.amount <= filters.payments.amountRange.max
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aVal = a[filters.payments.sortBy as keyof Payment];
      const bVal = b[filters.payments.sortBy as keyof Payment];

      if (aVal === undefined || bVal === undefined) return 0;
      if (aVal < bVal) return filters.payments.sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return filters.payments.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [payments, searchQueries.payments, filters.payments]);

  // Calculate filtered wallets with agent filtering
  const filteredWallets = useMemo(() => {
    if (!wallets) {
      return [];
    }

    let filtered = [...wallets];

    // Apply search filter
    const searchQuery = searchQueries.wallets.toLowerCase();
    if (searchQuery) {
      const before = filtered.length;
      filtered = filtered.filter(
        wallet =>
          wallet.user_name.toLowerCase().includes(searchQuery) ||
          wallet.user_email.toLowerCase().includes(searchQuery)
      );
    }

    // Apply status filter
    if (filters.wallets.status && filters.wallets.status !== 'all') {
      const before = filtered.length;
      if (filters.wallets.status === 'active') {
        filtered = filtered.filter(wallet => wallet.balance > 0);
      } else if (filters.wallets.status === 'inactive') {
        filtered = filtered.filter(wallet => wallet.balance === 0);
      }

      if (filtered.length === 0 && before > 0) {
        console.warn('⚠️ [useFinanceData] STATUS FILTER BLOCKED ALL WALLETS!', {
          status_filter: filters.wallets.status,
          original_count: before,
          sample_balances: wallets
            .slice(0, 3)
            .map(w => ({ name: w.user_name, balance: w.balance })),
        });
      }
    }

    // Apply balance range filter (only if values are actually set, 0 means "not set")
    if (
      filters.wallets.balanceRange.min !== undefined &&
      filters.wallets.balanceRange.min > 0
    ) {
      const before = filtered.length;
      filtered = filtered.filter(
        wallet => wallet.balance >= filters.wallets.balanceRange.min
      );
    }
    if (
      filters.wallets.balanceRange.max !== undefined &&
      filters.wallets.balanceRange.max > 0
    ) {
      const before = filtered.length;
      filtered = filtered.filter(
        wallet => wallet.balance <= filters.wallets.balanceRange.max
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aVal = a[filters.wallets.sortBy as keyof Wallet];
      const bVal = b[filters.wallets.sortBy as keyof Wallet];

      if (aVal === undefined || bVal === undefined) return 0;
      if (aVal < bVal) return filters.wallets.sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return filters.wallets.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [wallets, searchQueries.wallets, filters.wallets]);

  // Filter wallets by agent role
  const agentWallets = useMemo(() => {
    return filteredWallets; // Would filter by user role if we had that data
  }, [filteredWallets]);

  // Calculate filtered transactions
  const filteredTransactions = useMemo(() => {
    if (!walletTransactions) return [];

    let filtered = [...walletTransactions];

    // Apply search filter
    const searchQuery = searchQueries.transactions.toLowerCase();
    if (searchQuery) {
      filtered = filtered.filter(
        transaction =>
          transaction.user_name.toLowerCase().includes(searchQuery) ||
          transaction.description?.toLowerCase().includes(searchQuery)
      );
    }

    // Apply type filter
    if (filters.transactions.type && filters.transactions.type !== 'all') {
      filtered = filtered.filter(
        transaction =>
          transaction.transaction_type === filters.transactions.type
      );
    }

    // Apply date range filter
    if (filters.transactions.dateRange.start) {
      filtered = filtered.filter(
        transaction =>
          new Date(transaction.created_at) >=
          new Date(filters.transactions.dateRange.start)
      );
    }
    if (filters.transactions.dateRange.end) {
      filtered = filtered.filter(
        transaction =>
          new Date(transaction.created_at) <=
          new Date(filters.transactions.dateRange.end)
      );
    }

    // Apply amount range filter
    if (filters.transactions.amountRange.min !== undefined) {
      filtered = filtered.filter(
        transaction =>
          transaction.amount >= filters.transactions.amountRange.min
      );
    }
    if (filters.transactions.amountRange.max !== undefined) {
      filtered = filtered.filter(
        transaction =>
          transaction.amount <= filters.transactions.amountRange.max
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aVal = a[filters.transactions.sortBy as keyof WalletTransaction];
      const bVal = b[filters.transactions.sortBy as keyof WalletTransaction];

      if (aVal === undefined || bVal === undefined) return 0;
      if (aVal < bVal) return filters.transactions.sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return filters.transactions.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [walletTransactions, searchQueries.transactions, filters.transactions]);

  // Calculate payment statistics
  const paymentStats = useMemo(() => {
    if (!filteredPayments) return null;

    const totalPayments = filteredPayments.length;
    const completedPayments = filteredPayments.filter(
      p => p.status === 'completed'
    ).length;
    const pendingPayments = filteredPayments.filter(
      p => p.status === 'pending'
    ).length;
    const failedPayments = filteredPayments.filter(
      p => p.status === 'failed'
    ).length;
    const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const averageAmount = totalPayments > 0 ? totalAmount / totalPayments : 0;
    const successRate =
      totalPayments > 0 ? (completedPayments / totalPayments) * 100 : 0;

    return {
      totalPayments,
      completedPayments,
      pendingPayments,
      failedPayments,
      totalAmount,
      averageAmount,
      successRate,
    };
  }, [filteredPayments]);

  // Calculate wallet statistics
  const walletStats = useMemo(() => {
    if (!filteredWallets) return null;

    const totalWallets = filteredWallets.length;
    const activeWallets = filteredWallets.filter(w => w.balance > 0).length;
    const inactiveWallets = totalWallets - activeWallets;
    const totalBalance = filteredWallets.reduce((sum, w) => sum + w.balance, 0);
    const averageBalance = totalWallets > 0 ? totalBalance / totalWallets : 0;

    return {
      totalWallets,
      activeWallets,
      inactiveWallets,
      totalBalance,
      averageBalance,
    };
  }, [filteredWallets]);

  // Calculate transaction statistics
  const transactionStats = useMemo(() => {
    if (!filteredTransactions) return null;

    const totalTransactions = filteredTransactions.length;
    const creditTransactions = filteredTransactions.filter(
      t => t.transaction_type === 'credit'
    ).length;
    const debitTransactions = filteredTransactions.filter(
      t => t.transaction_type === 'debit'
    ).length;
    const totalCredits = filteredTransactions
      .filter(t => t.transaction_type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalDebits = filteredTransactions
      .filter(t => t.transaction_type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);
    const netFlow = totalCredits - totalDebits;

    return {
      totalTransactions,
      creditTransactions,
      debitTransactions,
      totalCredits,
      totalDebits,
      netFlow,
    };
  }, [filteredTransactions]);

  // Initialize data on mount
  useEffect(() => {
    const initializeData = async () => {
      const promises = [];

      if (canViewPayments() && (!payments || payments.length === 0)) {
        promises.push(fetchPayments());
      }
      if (canViewWallets() && (!wallets || wallets.length === 0)) {
        promises.push(fetchWallets());
      }
      if (
        canViewWallets() &&
        (!walletTransactions || walletTransactions.length === 0)
      ) {
        promises.push(fetchWalletTransactions());
      }
      if (
        canViewWallets() &&
        (!agentCreditTransactions || agentCreditTransactions.length === 0)
      ) {
        promises.push(fetchAgentCreditTransactions());
      }
      promises.push(fetchStats());

      await Promise.all(promises);
    };

    initializeData();
  }, []);

  // Refresh all finance data
  const handleRefresh = useCallback(async () => {
    await refreshData();
  }, [refreshData]);

  // Get a single payment by ID
  const getPaymentById = useCallback(
    (paymentId: string) => {
      return payments?.find(p => p.id === paymentId) || null;
    },
    [payments]
  );

  // Get a single wallet by ID
  const getWalletById = useCallback(
    (walletId: string) => {
      return wallets?.find(w => w.id === walletId) || null;
    },
    [wallets]
  );

  // Get transactions for a specific wallet
  const getWalletTransactions = useCallback(
    (walletId: string) => {
      return walletTransactions?.filter(t => t.wallet_id === walletId) || [];
    },
    [walletTransactions]
  );

  // Get agent credit transactions by agent ID
  const getAgentCreditTransactionsByAgent = useCallback(
    (agentId: string) => {
      if (!agentId) {
      //  console.log('[getAgentCreditTransactionsByAgent] Missing agentId');
        return [];
      }

      if (
        (!walletTransactionsLoaded || (walletTransactions?.length ?? 0) === 0) &&
        !loading.transactions
      ) {
      //  console.log(
      //    '[getAgentCreditTransactionsByAgent] Wallet transactions not ready, requesting fetch'
      //  );
        void fetchWalletTransactions();
      }

      const baseTransactions = (agentCreditTransactions || []).filter(tx => {
        if (!tx) return false;
        const txAgentId = tx.agent_id || tx.user_id;
        return txAgentId === agentId;
      });

      const manualCreditSourceReady = walletTransactionsLoaded;

      const manualCredits =
        (manualCreditSourceReady
          ? getManualWalletCreditsByAgent(agentId)
          : []
        )?.map(tx => {
          const createdAt = tx.created_at || new Date().toISOString();
          const amount = Math.abs(Number(tx.amount ?? 0));

          return {
            id: `manual-${tx.id}`,
            agent_id: tx.user_id || agentId,
            user_id: tx.user_id || agentId,
            transaction_type: 'refill',
            amount,
            description:
              tx.description ||
              'Manual credit payment recorded via wallet transaction',
            booking_id: tx.reference_id || null,
            reference_id: tx.reference_id || null,
            created_at: createdAt,
            transaction_date: createdAt,
            source: 'wallet_manual_credit' as const,
          };
        }) || [];

      const merged = [...baseTransactions, ...manualCredits].sort((a, b) => {
        const dateA = new Date(
          a.created_at || a.transaction_date || new Date(0).toISOString()
        ).getTime();
        const dateB = new Date(
          b.created_at || b.transaction_date || new Date(0).toISOString()
        ).getTime();
        return dateB - dateA;
      });

        // console.log('[getAgentCreditTransactionsByAgent] Aggregated transactions', {
        //   agentId,
        //   agentCreditCount: baseTransactions.length,
        //   manualCreditCount: manualCredits.length,
        //   total: merged.length,
        // });

      return merged;
    },
    [
      agentCreditTransactions,
      fetchWalletTransactions,
      getManualWalletCreditsByAgent,
      loading.transactions,
      walletTransactions,
      walletTransactionsLoaded,
    ]
  );

  // Format currency
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'MVR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }, []);

  // Format date
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  return {
    // Data
    payments,
    wallets,
    agentWallets,
    walletTransactions,
    agentCreditTransactions,
    stats,
    paymentMethodStats,

    // Filtered data
    filteredPayments,
    filteredWallets,
    filteredTransactions,

    // Calculated statistics
    paymentStats,
    walletStats,
    transactionStats,

    // Loading states
    loading,
    error,

    // Search and filters
    searchQueries,
    filters,

    // Actions
    fetchPayments,
    fetchWallets,
    fetchWalletTransactions,
    fetchAgentCreditTransactions,
    fetchStats,
    setSearchQuery,
    setFilters,
    clearFilters,
    handleRefresh,

    // Utility functions
    getPaymentById,
    getWalletById,
    getWalletTransactions,
    getAgentCreditTransactionsByAgent,
    formatCurrency,
    formatDate,

    // Permissions
    canViewPayments: canViewPayments(),
    canViewWallets: canViewWallets(),
    canManagePayments: canManagePayments(),
    canManageWallets: canManageWallets(),
  };
};
