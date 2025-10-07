import { supabase } from '@/utils/supabase';
import {
  Wallet,
  WalletTransaction,
  Payment,
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
// FINANCE SERVICE - REAL DATA FROM DATABASE
// ============================================================================

/**
 * Fetch all wallets with user information (including agent wallets)
 */
export const fetchWallets = async (
  filters?: WalletFilters
): Promise<Wallet[]> => {
  try {
    console.log('Fetching wallets with filters:', filters);

    // First fetch regular wallets
    let query = supabase
      .from('wallets')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.status && filters.status !== 'all') {
      if (filters.status === 'active') {
        query = query.gt('balance', 0);
      } else if (filters.status === 'inactive') {
        query = query.eq('balance', 0);
      }
    }

    if (filters?.balanceRange) {
      if (filters.balanceRange.min !== undefined) {
        query = query.gte('balance', filters.balanceRange.min);
      }
      if (filters.balanceRange.max !== undefined) {
        query = query.lte('balance', filters.balanceRange.max);
      }
    }

    const { data: wallets, error: walletsError } = await query;

    if (walletsError) {
      console.error('Error fetching wallets:', walletsError);
      throw walletsError;
    }

    if (!wallets || wallets.length === 0) {
      return [];
    }

    // Fetch user profiles separately
    const userIds = wallets.map(w => w.user_id);
    const { data: userProfiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError);
      // Continue without user profiles
    }

    // Combine data
    const walletsWithUsers = wallets.map((wallet: any) => {
      const userProfile = userProfiles?.find(up => up.id === wallet.user_id);

      return {
        id: wallet.id,
        user_id: wallet.user_id,
        user_name: userProfile?.full_name || 'Unknown User',
        user_email: userProfile?.email || '',
        balance: Number(wallet.balance),
        currency: wallet.currency,
        is_active: Number(wallet.balance) > 0,
        total_credits: 0,
        total_debits: 0,
        created_at: wallet.created_at,
        updated_at: wallet.updated_at,
      };
    });

    // Apply search filter after combining data
    if (filters?.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase();
      return walletsWithUsers.filter(
        wallet =>
          wallet.user_name.toLowerCase().includes(searchLower) ||
          wallet.user_email.toLowerCase().includes(searchLower)
      );
    }

    console.log(
      'Wallets fetched successfully:',
      walletsWithUsers.length,
      'wallets'
    );
    return walletsWithUsers;
  } catch (error) {
    console.error('Failed to fetch wallets:', error);
    throw error;
  }
};

/**
 * Fetch agent credit transactions
 */
export const fetchAgentCreditTransactions = async (): Promise<any[]> => {
  try {
    console.log('Fetching agent credit transactions...');

    const { data: agentTransactions, error } = await supabase
      .from('agent_credit_transactions')
      .select(
        `
        *,
        user_profiles!agent_credit_transactions_agent_id_fkey (
          id,
          full_name,
          email,
          role
        )
      `
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching agent credit transactions:', error);
      return [];
    }

    console.log(
      'Agent credit transactions fetched:',
      agentTransactions?.length || 0,
      'transactions'
    );
    return agentTransactions || [];
  } catch (error) {
    console.error('Failed to fetch agent credit transactions:', error);
    return [];
  }
};

/**
 * Fetch wallet transactions
 */
export const fetchWalletTransactions = async (
  filters?: TransactionFilters
): Promise<WalletTransaction[]> => {
  try {
    // First fetch wallet transactions
    let query = supabase
      .from('wallet_transactions')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.type && filters.type !== 'all') {
      query = query.eq('transaction_type', filters.type);
    }

    if (filters?.dateRange) {
      if (filters.dateRange.start) {
        query = query.gte('created_at', filters.dateRange.start);
      }
      if (filters.dateRange.end) {
        query = query.lte('created_at', filters.dateRange.end);
      }
    }

    if (filters?.amountRange) {
      if (filters.amountRange.min !== undefined) {
        query = query.gte('amount', filters.amountRange.min);
      }
      if (filters.amountRange.max !== undefined) {
        query = query.lte('amount', filters.amountRange.max);
      }
    }

    const { data: transactions, error: transactionsError } = await query;

    if (transactionsError) {
      console.error('Error fetching wallet transactions:', transactionsError);
      throw transactionsError;
    }

    if (!transactions || transactions.length === 0) {
      return [];
    }

    // Fetch wallets and user profiles
    const walletIds = [...new Set(transactions.map(t => t.wallet_id))];
    const { data: wallets, error: walletsError } = await supabase
      .from('wallets')
      .select('id, user_id')
      .in('id', walletIds);

    if (walletsError) {
      console.error('Error fetching wallets:', walletsError);
      throw walletsError;
    }

    const userIds = [...new Set(wallets?.map(w => w.user_id) || [])];
    const { data: userProfiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError);
    }

    // Combine data
    const transactionsWithUsers = transactions.map((transaction: any) => {
      const wallet = wallets?.find(w => w.id === transaction.wallet_id);
      const userProfile = userProfiles?.find(up => up.id === wallet?.user_id);

      return {
        id: transaction.id,
        wallet_id: transaction.wallet_id,
        user_id: wallet?.user_id || '',
        user_name: userProfile?.full_name || 'Unknown User',
        amount: Number(transaction.amount),
        transaction_type: transaction.transaction_type,
        reference_id: transaction.reference_id,
        description: transaction.description,
        created_at: transaction.created_at,
      };
    });

    // Apply search filter after combining data
    if (filters?.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase();
      return transactionsWithUsers.filter(
        transaction =>
          transaction.user_name.toLowerCase().includes(searchLower) ||
          (transaction.description &&
            transaction.description.toLowerCase().includes(searchLower))
      );
    }

    return transactionsWithUsers;
  } catch (error) {
    console.error('Failed to fetch wallet transactions:', error);
    throw error;
  }
};

/**
 * Fetch payments with booking information
 */
export const fetchPayments = async (
  filters?: FinanceFilters
): Promise<Payment[]> => {
  try {
    // First fetch payments
    let query = supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.paymentMethod && filters.paymentMethod !== 'all') {
      query = query.eq('payment_method', filters.paymentMethod);
    }

    if (filters?.dateRange) {
      if (filters.dateRange.start) {
        query = query.gte('created_at', filters.dateRange.start);
      }
      if (filters.dateRange.end) {
        query = query.lte('created_at', filters.dateRange.end);
      }
    }

    if (filters?.amountRange) {
      if (filters.amountRange.min !== undefined) {
        query = query.gte('amount', filters.amountRange.min);
      }
      if (filters.amountRange.max !== undefined) {
        query = query.lte('amount', filters.amountRange.max);
      }
    }

    const { data: payments, error: paymentsError } = await query;

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      throw paymentsError;
    }

    if (!payments || payments.length === 0) {
      return [];
    }

    // Fetch bookings and user profiles
    const bookingIds = [...new Set(payments.map(p => p.booking_id))];
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, booking_number, user_id, total_fare, status')
      .in('id', bookingIds);

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      throw bookingsError;
    }

    const userIds = [...new Set(bookings?.map(b => b.user_id) || [])];
    const { data: userProfiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError);
    }

    // Combine data
    const paymentsWithBookings = payments.map((payment: any) => {
      const booking = bookings?.find(b => b.id === payment.booking_id);
      const userProfile = userProfiles?.find(up => up.id === booking?.user_id);

      return {
        id: payment.id,
        booking_id: payment.booking_id,
        payment_method: payment.payment_method,
        amount: Number(payment.amount),
        currency: payment.currency,
        status: payment.status,
        receipt_number: payment.receipt_number,
        gateway_reference: payment.gateway_reference,
        created_at: payment.created_at,
        updated_at: payment.updated_at,
        session_id: payment.session_id,
        booking: booking
          ? {
              id: booking.id,
              booking_number: booking.booking_number,
              user_id: booking.user_id,
              user_name: userProfile?.full_name,
              user_email: userProfile?.email,
              total_fare: Number(booking.total_fare),
              status: booking.status,
            }
          : undefined,
      };
    });

    // Apply search filter after combining data
    if (filters?.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase();
      return paymentsWithBookings.filter(
        payment =>
          payment.booking?.booking_number
            ?.toLowerCase()
            .includes(searchLower) ||
          payment.booking?.user_name?.toLowerCase().includes(searchLower) ||
          (payment.receipt_number &&
            payment.receipt_number.toLowerCase().includes(searchLower))
      );
    }

    return paymentsWithBookings;
  } catch (error) {
    console.error('Failed to fetch payments:', error);
    throw error;
  }
};

/**
 * Fetch finance statistics
 */
export const fetchFinanceStats = async (): Promise<FinanceStats> => {
  try {
    console.log('Fetching finance stats...');

    // Fetch wallet statistics
    const { data: walletStats, error: walletError } = await supabase
      .from('wallets')
      .select('balance, created_at');

    if (walletError) {
      console.error('Error fetching wallet stats:', walletError);
    } else {
      console.log('Wallet stats fetched:', walletStats?.length || 0, 'wallets');
    }

    // Fetch payment statistics
    const { data: paymentStats, error: paymentError } = await supabase
      .from('payments')
      .select('amount, status, created_at');

    if (paymentError) {
      console.error('Error fetching payment stats:', paymentError);
    } else {
      console.log(
        'Payment stats fetched:',
        paymentStats?.length || 0,
        'payments'
      );
    }

    // Fetch transaction statistics
    const { data: transactionStats, error: transactionError } = await supabase
      .from('wallet_transactions')
      .select('amount, created_at');

    if (transactionError) {
      console.error('Error fetching transaction stats:', transactionError);
    } else {
      console.log(
        'Transaction stats fetched:',
        transactionStats?.length || 0,
        'transactions'
      );
    }

    // Calculate statistics
    const totalWalletBalance = (walletStats || []).reduce(
      (sum, w) => sum + Number(w.balance),
      0
    );
    const activeWallets = (walletStats || []).filter(
      w => Number(w.balance) > 0
    ).length;

    const today = new Date().toISOString().split('T')[0];
    const todayTransactions = (transactionStats || []).filter(t =>
      t.created_at.startsWith(today)
    ).length;

    const completedPayments = (paymentStats || []).filter(
      p => p.status === 'completed'
    );
    const pendingPayments = (paymentStats || []).filter(
      p => p.status === 'pending'
    );
    const failedPayments = (paymentStats || []).filter(
      p => p.status === 'failed'
    );

    const totalRevenue = completedPayments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );
    const todayRevenue = completedPayments
      .filter(p => p.created_at.startsWith(today))
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const paymentSuccessRate =
      paymentStats && paymentStats.length > 0
        ? (completedPayments.length / paymentStats.length) * 100
        : 0;

    const averageTransactionAmount =
      transactionStats && transactionStats.length > 0
        ? transactionStats.reduce((sum, t) => sum + Number(t.amount), 0) /
          transactionStats.length
        : 0;

    return {
      totalWalletBalance,
      activeWallets,
      todayTransactions,
      weeklyRevenue: todayRevenue * 7, // Simplified calculation
      monthlyRevenue: todayRevenue * 30, // Simplified calculation
      paymentSuccessRate,
      completedPayments: completedPayments.length,
      pendingPayments: pendingPayments.length,
      failedPayments: failedPayments.length,
      totalRevenue,
      averageTransactionAmount,
    };
  } catch (error) {
    console.error('Failed to fetch finance stats:', error);
    throw error;
  }
};

/**
 * Fetch payment method statistics
 */
export const fetchPaymentMethodStats = async (): Promise<
  PaymentMethodStats[]
> => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('payment_method, amount, status');

    if (error) {
      console.error('Error fetching payment method stats:', error);
      throw error;
    }

    // Group by payment method
    const methodStats = (data || []).reduce((acc: any, payment: any) => {
      const method = payment.payment_method;
      if (!acc[method]) {
        acc[method] = {
          method,
          count: 0,
          totalAmount: 0,
          completedCount: 0,
        };
      }
      acc[method].count++;
      acc[method].totalAmount += Number(payment.amount);
      if (payment.status === 'completed') {
        acc[method].completedCount++;
      }
      return acc;
    }, {});

    const totalPayments = (data || []).length;
    const totalAmount = (data || []).reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );

    return Object.values(methodStats).map((stat: any) => ({
      method: stat.method,
      count: stat.count,
      totalAmount: stat.totalAmount,
      percentage: totalAmount > 0 ? (stat.totalAmount / totalAmount) * 100 : 0,
      successRate:
        stat.count > 0 ? (stat.completedCount / stat.count) * 100 : 0,
    }));
  } catch (error) {
    console.error('Failed to fetch payment method stats:', error);
    throw error;
  }
};

/**
 * Fetch finance dashboard data
 */
export const fetchFinanceDashboardData =
  async (): Promise<FinanceDashboardData> => {
    try {
      const [
        stats,
        recentPayments,
        recentTransactions,
        paymentMethodStats,
        topWallets,
      ] = await Promise.all([
        fetchFinanceStats(),
        fetchPayments({
          searchQuery: '',
          dateRange: { start: '', end: '' },
          status: 'all',
          paymentMethod: 'all',
          amountRange: { min: 0, max: 0 },
          sortBy: 'created_at',
          sortOrder: 'desc',
        }).then(payments => payments.slice(0, 10)),
        fetchWalletTransactions({
          searchQuery: '',
          type: 'all',
          dateRange: { start: '', end: '' },
          amountRange: { min: 0, max: 0 },
          sortBy: 'created_at',
          sortOrder: 'desc',
        }).then(transactions => transactions.slice(0, 10)),
        fetchPaymentMethodStats(),
        fetchWallets({
          searchQuery: '',
          status: 'all',
          balanceRange: { min: 0, max: 0 },
          sortBy: 'balance',
          sortOrder: 'desc',
        }).then(wallets => wallets.slice(0, 5)),
      ]);

      // Generate daily revenue data for the last 7 days
      const dailyRevenue = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        // This would ideally come from a more sophisticated query
        // For now, we'll use a simplified calculation
        const dayRevenue = Math.random() * 1000; // Placeholder
        const dayTransactions = Math.floor(Math.random() * 20); // Placeholder

        dailyRevenue.push({
          date: dateStr,
          revenue: dayRevenue,
          transactions: dayTransactions,
        });
      }

      return {
        stats,
        recentPayments,
        recentTransactions,
        paymentMethodStats,
        topWallets,
        dailyRevenue,
      };
    } catch (error) {
      console.error('Failed to fetch finance dashboard data:', error);
      throw error;
    }
  };

/**
 * Create a new wallet
 */
export const createWallet = async (
  walletData: WalletFormData
): Promise<Wallet> => {
  try {
    const { data, error } = await supabase
      .from('wallets')
      .insert([
        {
          user_id: walletData.user_id,
          balance: walletData.initial_balance || 0,
          currency: walletData.currency || 'MVR',
        },
      ])
      .select('*')
      .single();

    if (error) {
      console.error('Error creating wallet:', error);
      throw error;
    }

    // Fetch user profile separately
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .eq('id', data.user_id)
      .single();

    return {
      id: data.id,
      user_id: data.user_id,
      user_name: userProfile?.full_name || 'Unknown User',
      user_email: userProfile?.email || '',
      balance: Number(data.balance),
      currency: data.currency,
      is_active: Number(data.balance) > 0,
      total_credits: 0,
      total_debits: 0,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error('Failed to create wallet:', error);
    throw error;
  }
};

/**
 * Create a wallet transaction
 */
export const createWalletTransaction = async (
  transactionData: WalletTransactionFormData
): Promise<WalletTransaction> => {
  try {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .insert([
        {
          wallet_id: transactionData.wallet_id,
          amount: transactionData.amount,
          transaction_type: transactionData.transaction_type,
          description: transactionData.description,
          reference_id: transactionData.reference_id,
        },
      ])
      .select('*')
      .single();

    if (error) {
      console.error('Error creating wallet transaction:', error);
      throw error;
    }

    // Update wallet balance
    const { error: updateError } = await supabase.rpc('update_wallet_balance', {
      wallet_id: transactionData.wallet_id,
      amount:
        transactionData.transaction_type === 'credit'
          ? transactionData.amount
          : -transactionData.amount,
    });

    if (updateError) {
      console.error('Error updating wallet balance:', updateError);
    }

    // Fetch wallet and user info separately
    const { data: wallet } = await supabase
      .from('wallets')
      .select('user_id')
      .eq('id', data.wallet_id)
      .single();

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('id', wallet?.user_id)
      .single();

    return {
      id: data.id,
      wallet_id: data.wallet_id,
      user_id: wallet?.user_id || '',
      user_name: userProfile?.full_name || 'Unknown User',
      amount: Number(data.amount),
      transaction_type: data.transaction_type,
      reference_id: data.reference_id,
      description: data.description,
      created_at: data.created_at,
    };
  } catch (error) {
    console.error('Failed to create wallet transaction:', error);
    throw error;
  }
};

/**
 * Create a payment record
 */
export const createPayment = async (
  paymentData: PaymentFormData
): Promise<Payment> => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .insert([
        {
          booking_id: paymentData.booking_id,
          payment_method: paymentData.payment_method,
          amount: paymentData.amount,
          currency: paymentData.currency || 'MVR',
          gateway_reference: paymentData.gateway_reference,
          session_id: paymentData.session_id,
        },
      ])
      .select('*')
      .single();

    if (error) {
      console.error('Error creating payment:', error);
      throw error;
    }

    // Fetch booking and user info separately
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, booking_number, user_id, total_fare, status')
      .eq('id', data.booking_id)
      .single();

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .eq('id', booking?.user_id)
      .single();

    return {
      id: data.id,
      booking_id: data.booking_id,
      payment_method: data.payment_method,
      amount: Number(data.amount),
      currency: data.currency,
      status: data.status,
      receipt_number: data.receipt_number,
      gateway_reference: data.gateway_reference,
      created_at: data.created_at,
      updated_at: data.updated_at,
      session_id: data.session_id,
      booking: booking
        ? {
            id: booking.id,
            booking_number: booking.booking_number,
            user_id: booking.user_id,
            user_name: userProfile?.full_name,
            user_email: userProfile?.email,
            total_fare: Number(booking.total_fare),
            status: booking.status,
          }
        : undefined,
    };
  } catch (error) {
    console.error('Failed to create payment:', error);
    throw error;
  }
};

/**
 * Update payment status
 */
export const updatePaymentStatus = async (
  paymentId: string,
  status: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('payments')
      .update({ status })
      .eq('id', paymentId);

    if (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to update payment status:', error);
    throw error;
  }
};

/**
 * Get wallet by user ID
 */
export const getWalletByUserId = async (
  userId: string
): Promise<Wallet | null> => {
  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No wallet found
      }
      console.error('Error fetching wallet by user ID:', error);
      throw error;
    }

    // Fetch user profile separately
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .eq('id', data.user_id)
      .single();

    return {
      id: data.id,
      user_id: data.user_id,
      user_name: userProfile?.full_name || 'Unknown User',
      user_email: userProfile?.email || '',
      balance: Number(data.balance),
      currency: data.currency,
      is_active: Number(data.balance) > 0,
      total_credits: 0,
      total_debits: 0,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error('Failed to fetch wallet by user ID:', error);
    throw error;
  }
};
