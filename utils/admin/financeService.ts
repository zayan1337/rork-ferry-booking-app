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
 * Fetch all wallets with user information (including agent wallets with credit info)
 */
export const fetchWallets = async (
  filters?: WalletFilters
): Promise<Wallet[]> => {
  try {
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
      if (
        filters.balanceRange.min !== undefined &&
        filters.balanceRange.min > 0
      ) {
        query = query.gte('balance', filters.balanceRange.min);
      }
      if (
        filters.balanceRange.max !== undefined &&
        filters.balanceRange.max > 0
      ) {
        query = query.lte('balance', filters.balanceRange.max);
      }
    }

    const { data: wallets, error: walletsError } = await query;

    if (walletsError) {
      console.error(
        '❌ [fetchWallets] Error fetching wallets from database:',
        walletsError
      );
      throw walletsError;
    }

    // Note: We continue even if wallets is empty, because we also fetch agent credit accounts

    // Also fetch agent credit accounts (agents don't have wallets, they use credit_balance)
    const { data: agentProfiles, error: agentProfilesError } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, role, credit_ceiling, credit_balance')
      .eq('role', 'agent')
      .eq('is_active', true)
      .or('credit_balance.gt.0,credit_ceiling.gt.0');

    if (agentProfilesError) {
      console.warn(
        '⚠️ [fetchWallets] Error fetching agent profiles:',
        agentProfilesError
      );
    }

    // Combine wallet user IDs with agent IDs for profile lookup
    const walletUserIds = wallets.map(w => w.user_id);
    const agentIds = agentProfiles?.map(a => a.id) || [];
    const allUserIds = [...new Set([...walletUserIds, ...agentIds])];

    // Fetch user profiles for both wallets and agents
    const { data: userProfiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, role, credit_ceiling, credit_balance')
      .in(
        'id',
        allUserIds.length > 0
          ? allUserIds
          : ['00000000-0000-0000-0000-000000000000']
      ); // Dummy ID if empty

    if (profilesError) {
      console.error(
        '❌ [fetchWallets] Error fetching user profiles:',
        profilesError
      );
      // Continue without user profiles
    }

    // Combine wallet data with user profiles
    const walletsWithUsers = (wallets || []).map((wallet: any) => {
      const userProfile = userProfiles?.find(up => up.id === wallet.user_id);
      const isAgent = userProfile?.role === 'agent';

      // Calculate agent credit metrics
      const creditCeiling = isAgent
        ? Number(userProfile?.credit_ceiling || 0)
        : undefined;
      const creditBalance = isAgent
        ? Number(userProfile?.credit_balance || 0)
        : undefined;
      const creditUsed =
        isAgent && creditCeiling !== undefined && creditBalance !== undefined
          ? creditCeiling - creditBalance
          : undefined;
      const balanceToPay = creditUsed; // Amount owed is the same as credit used

      return {
        id: wallet.id,
        user_id: wallet.user_id,
        user_name: userProfile?.full_name || 'Unknown User',
        user_email: userProfile?.email || '',
        user_role: userProfile?.role || 'customer',
        balance: Number(wallet.balance),
        currency: wallet.currency,
        is_active: Number(wallet.balance) > 0,
        total_credits: 0,
        total_debits: 0,
        created_at: wallet.created_at,
        updated_at: wallet.updated_at,
        // Agent-specific credit fields
        credit_ceiling: creditCeiling,
        credit_balance: creditBalance,
        credit_used: creditUsed,
        balance_to_pay: balanceToPay,
        is_wallet: true, // Flag to distinguish from credit accounts
      };
    });

    // Add agent credit accounts (agents without wallets but with credit)
    const agentCreditAccounts = (agentProfiles || [])
      .filter(agent => {
        // Only include agents that don't already have a wallet entry
        return !(wallets || []).some(w => w.user_id === agent.id);
      })
      .map((agent: any) => {
        const creditCeiling = Number(agent.credit_ceiling || 0);
        const creditBalance = Number(agent.credit_balance || 0);
        const creditUsed =
          creditCeiling > 0 ? creditCeiling - creditBalance : 0;
        const balanceToPay = creditUsed;

        return {
          id: `credit-${agent.id}`, // Synthetic ID for credit accounts
          user_id: agent.id,
          user_name: agent.full_name || 'Unknown Agent',
          user_email: agent.email || '',
          user_role: 'agent',
          balance: creditBalance, // Use credit_balance as the balance
          currency: 'MVR',
          is_active: creditBalance > 0 || creditCeiling > 0,
          total_credits: 0,
          total_debits: 0,
          created_at: new Date().toISOString(), // Use current date as fallback
          updated_at: new Date().toISOString(),
          // Agent-specific credit fields
          credit_ceiling: creditCeiling,
          credit_balance: creditBalance,
          credit_used: creditUsed,
          balance_to_pay: balanceToPay,
          is_wallet: false, // Flag to distinguish from actual wallets
          is_credit_account: true, // Flag to identify credit accounts
        };
      });

    // Combine wallets and agent credit accounts
    const allAccounts = [...walletsWithUsers, ...agentCreditAccounts];

    // Apply search filter after combining data
    if (filters?.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase();
      return allAccounts.filter(
        account =>
          account.user_name.toLowerCase().includes(searchLower) ||
          account.user_email.toLowerCase().includes(searchLower)
      );
    }

    return allAccounts;
  } catch (error) {
    console.error('❌ [fetchWallets] Failed to fetch wallets:', error);
    // Return empty array instead of throwing to prevent UI crashes
    return [];
  }
};

/**
 * Create wallets for all agent users who don't have one
 * Useful for migrating existing agents to have wallets
 */
export const createWalletsForAllUsers = async (): Promise<{
  created: number;
  skipped: number;
  errors: number;
}> => {
  try {
    // Get all agent users from user_profiles
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('is_active', true)
      .eq('role', 'agent');

    if (usersError) {
      console.error('Error fetching agent users:', usersError);
      throw usersError;
    }

    if (!users || users.length === 0) {
      return { created: 0, skipped: 0, errors: 0 };
    }

    // Get all existing wallets
    const { data: existingWallets, error: walletsError } = await supabase
      .from('wallets')
      .select('user_id');

    if (walletsError) {
      console.error('Error fetching existing wallets:', walletsError);
      throw walletsError;
    }

    const existingWalletUserIds = new Set(
      existingWallets?.map(w => w.user_id) || []
    );

    // Find agent users without wallets
    const agentsWithoutWallets = users.filter(
      user => !existingWalletUserIds.has(user.id)
    );

    if (agentsWithoutWallets.length === 0) {
      return {
        created: 0,
        skipped: users.length,
        errors: 0,
      };
    }

    // Create wallets for agent users without them
    const walletInserts = agentsWithoutWallets.map(user => ({
      user_id: user.id,
      balance: 0,
      currency: 'MVR',
    }));

    const { data: createdWallets, error: createError } = await supabase
      .from('wallets')
      .insert(walletInserts)
      .select('id');

    if (createError) {
      console.error('Error creating wallets:', createError);
      throw createError;
    }

    return {
      created: createdWallets?.length || 0,
      skipped:
        existingWallets?.filter(w => users.some(u => u.id === w.user_id))
          .length || 0,
      errors: 0,
    };
  } catch (error) {
    console.error('Failed to create wallets for agent users:', error);
    throw error;
  }
};

/**
 * Fetch agent credit transactions
 */
export const fetchAgentCreditTransactions = async (): Promise<any[]> => {
  try {
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
      if (
        filters.amountRange.min !== undefined &&
        filters.amountRange.min > 0
      ) {
        query = query.gte('amount', filters.amountRange.min);
      }
      if (
        filters.amountRange.max !== undefined &&
        filters.amountRange.max > 0
      ) {
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
        status: transaction.status,
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
      if (
        filters.amountRange.min !== undefined &&
        filters.amountRange.min > 0
      ) {
        query = query.gte('amount', filters.amountRange.min);
      }
      if (
        filters.amountRange.max !== undefined &&
        filters.amountRange.max > 0
      ) {
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
      // Don't throw - continue with payment data even if booking fetch fails
    }

    const userIds = [...new Set(bookings?.map(b => b.user_id) || [])];
    const { data: userProfiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError);
      // Don't throw - continue without user profile data
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
    if (filters?.searchQuery && filters.searchQuery.trim()) {
      const searchLower = filters.searchQuery.toLowerCase();
      const filtered = paymentsWithBookings.filter(
        payment =>
          payment.booking?.booking_number
            ?.toLowerCase()
            .includes(searchLower) ||
          payment.booking?.user_name?.toLowerCase().includes(searchLower) ||
          (payment.receipt_number &&
            payment.receipt_number.toLowerCase().includes(searchLower))
      );
      return filtered;
    }

    return paymentsWithBookings;
  } catch (error) {
    console.error('Failed to fetch payments:', error);
    throw error;
  }
};

/**
 * Fetch finance statistics
 * Total revenue is calculated from bookings (matching dashboard logic)
 * to ensure consistency across the application
 */
export const fetchFinanceStats = async (): Promise<FinanceStats> => {
  try {
    // Fetch wallet statistics
    const { data: walletStats, error: walletError } = await supabase
      .from('wallets')
      .select('balance, created_at');

    if (walletError) {
      console.error('Error fetching wallet stats:', walletError);
    }

    // Fetch payment statistics
    const { data: paymentStats, error: paymentError } = await supabase
      .from('payments')
      .select('amount, status, created_at');

    if (paymentError) {
      console.error('Error fetching payment stats:', paymentError);
    }

    // Calculate statistics
    const totalWalletBalance = (walletStats || []).reduce(
      (sum, w) => sum + Number(w.balance),
      0
    );
    const activeWallets = (walletStats || []).filter(
      w => Number(w.balance) > 0
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

    // Calculate total revenue from bookings (matching dashboard logic)
    // This includes confirmed, checked_in, completed bookings and cancelled with partial refunds
    const revenueStatuses = ['confirmed', 'checked_in', 'completed'];

    // Fetch all bookings for total revenue calculation (need payment_method_type for filtering)
    const { data: allBookingsData, error: allBookingsError } = await supabase
      .from('bookings')
      .select('id, total_fare, status, payment_method_type');

    // Fetch cancellations data for partial refund calculation
    // Match the exact query structure used in bookings store for consistency
    const { data: allCancellations, error: cancellationsError } = await supabase
      .from('cancellations')
      .select('booking_id, refund_amount, status');

    // Create a map with full cancellation details (matching bookings store structure)
    const cancellationDetailsMap = new Map<
      string,
      {
        refund_amount: number;
        status: string;
      }
    >();

    if (!cancellationsError && allCancellations) {
      allCancellations.forEach(cancellation => {
        cancellationDetailsMap.set(cancellation.booking_id, {
          refund_amount: Number(cancellation.refund_amount || 0),
          status: cancellation.status,
        });
      });
    }

    // Helper function to calculate net revenue accounting for refunds AND payment methods
    // This matches the exact logic used in dashboardService.ts and bookingStore.ts
    // Business Logic:
    // - MIB bookings (confirmed/checked_in/completed): Full total_fare as revenue (actual money received)
    // - Agent CREDIT bookings: MVR 0 revenue (money already counted when agent recharged credit)
    // - FREE ticket bookings: MVR 0 revenue (no money received, it's complimentary)
    // - Cancelled bookings with refund: Net revenue = total_fare - refund_amount (remaining amount kept)
    // - Cancelled bookings without payment: 0 revenue (no payment was made)
    // - Other statuses (reserved, pending_payment): 0 revenue (payment not completed)
    const calculateNetRevenue = (booking: any): number => {
      const totalFare = Number(booking.total_fare || 0);
      const paymentMethod = booking.payment_method_type;

      // ✅ CRITICAL: Exclude credit and free ticket bookings from booking revenue
      // - Credit bookings: Revenue already counted when agent recharged their wallet
      // - Free tickets: No money received (complimentary service for agent)
      if (paymentMethod === 'credit' || paymentMethod === 'free') {
        return 0;
      }

      if (booking.status === 'cancelled') {
        const cancellation = cancellationDetailsMap.get(booking.id);
        if (!cancellation) {
          // No cancellation record - no payment was made, no revenue
          return 0;
        }

        // If refund_amount is 0, no refund was given (no payment was made), so no revenue
        if (cancellation.refund_amount === 0) {
          return 0;
        }

        // Calculate net revenue = total_fare - refund_amount (amount kept after partial refund)
        // Example: Booking MVR 1000, refund MVR 500 → Revenue = MVR 500 (amount kept)
        return Math.max(0, totalFare - cancellation.refund_amount);
      } else if (revenueStatuses.includes(booking.status)) {
        // For confirmed/checked_in/completed MIB bookings: full revenue
        return totalFare;
      }
      // For other statuses (reserved, pending_payment): no revenue
      return 0;
    };

    // Calculate booking revenue from MIB bookings only (matching dashboard)
    let bookingRevenue = 0;
    if (!allBookingsError && allBookingsData) {
      bookingRevenue = allBookingsData.reduce(
        (sum, b) => sum + calculateNetRevenue(b),
        0
      );
    }

    // ✅ Add agent credit recharge revenue
    // When agents top up their credit, that's when the business receives actual money
    // Agent credits are tracked in agent_credit_transactions, NOT wallet_transactions
    const { data: creditRecharges, error: creditRechargesError } =
      await supabase
        .from('agent_credit_transactions')
        .select('amount, created_at')
        .eq('transaction_type', 'refill');

    const creditRechargeRevenue =
      !creditRechargesError && creditRecharges
        ? creditRecharges.reduce((sum, t) => sum + Number(t.amount), 0)
        : 0;

    // ✅ Total Revenue = Booking Revenue (MIB only) + Agent Credit Recharges
    const totalRevenue = bookingRevenue + creditRechargeRevenue;

    // ✅ Calculate today's revenue (bookings + credit recharges)
    const today = new Date().toISOString().split('T')[0];
    const todayBookingRevenue = completedPayments
      .filter(p => p.created_at.startsWith(today))
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const todayCreditRecharges =
      !creditRechargesError && creditRecharges
        ? creditRecharges.filter(
            t => t.created_at && t.created_at.startsWith(today)
          )
        : [];

    const todayCreditRechargeRevenue = todayCreditRecharges.reduce(
      (sum, t) => sum + Number(t.amount || 0),
      0
    );

    const todayRevenue = todayBookingRevenue + todayCreditRechargeRevenue;

    // ✅ Calculate weekly revenue (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString();

    const weeklyBookingRevenue = completedPayments
      .filter(p => p.created_at >= sevenDaysAgoStr)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const weeklyCreditRecharges =
      !creditRechargesError && creditRecharges
        ? creditRecharges.filter(
            t => t.created_at && t.created_at >= sevenDaysAgoStr
          )
        : [];

    const weeklyCreditRechargeRevenue = weeklyCreditRecharges.reduce(
      (sum, t) => sum + Number(t.amount || 0),
      0
    );

    const weeklyRevenue = weeklyBookingRevenue + weeklyCreditRechargeRevenue;

    // ✅ Calculate monthly revenue (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

    const monthlyBookingRevenue = completedPayments
      .filter(p => p.created_at >= thirtyDaysAgoStr)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const monthlyCreditRecharges =
      !creditRechargesError && creditRecharges
        ? creditRecharges.filter(
            t => t.created_at && t.created_at >= thirtyDaysAgoStr
          )
        : [];

    const monthlyCreditRechargeRevenue = monthlyCreditRecharges.reduce(
      (sum, t) => sum + Number(t.amount || 0),
      0
    );

    const monthlyRevenue = monthlyBookingRevenue + monthlyCreditRechargeRevenue;

    const paymentSuccessRate =
      paymentStats && paymentStats.length > 0
        ? (completedPayments.length / paymentStats.length) * 100
        : 0;

    // Calculate average transaction amount from wallet transactions (for reference)
    const { data: transactionStats, error: transactionError } = await supabase
      .from('wallet_transactions')
      .select('amount');

    const averageTransactionAmount =
      transactionStats && transactionStats.length > 0
        ? transactionStats.reduce((sum, t) => sum + Number(t.amount), 0) /
          transactionStats.length
        : 0;

    return {
      totalWalletBalance,
      activeWallets,
      weeklyRevenue, // ✅ Last 7 days (bookings + credit recharges)
      monthlyRevenue, // ✅ Last 30 days (bookings + credit recharges)
      paymentSuccessRate,
      completedPayments: completedPayments.length,
      pendingPayments: pendingPayments.length,
      failedPayments: failedPayments.length,
      totalRevenue, // ✅ Total = Booking Revenue + Credit Recharge Revenue
      averageTransactionAmount,
      bookingRevenue, // ✅ Revenue from MIB bookings
      creditRechargeRevenue, // ✅ Revenue from agent credit recharges
      todayRevenue, // ✅ Today's revenue (bookings + credit recharges)
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
    const balanceToInsert = walletData.initial_balance || 0;

    const { data, error } = await supabase
      .from('wallets')
      .insert([
        {
          user_id: walletData.user_id,
          balance: balanceToInsert,
          currency: walletData.currency || 'MVR',
        },
      ])
      .select('*')
      .single();

    if (error) {
      console.error('❌ [createWallet] Error creating wallet:', error);
      throw error;
    }

    // Fetch user profile separately with role and credit info
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, role, credit_ceiling, credit_balance')
      .eq('id', data.user_id)
      .single();

    const isAgent = userProfile?.role === 'agent';
    const creditCeiling = isAgent
      ? Number(userProfile?.credit_ceiling || 0)
      : undefined;
    const creditBalance = isAgent
      ? Number(userProfile?.credit_balance || 0)
      : undefined;
    const creditUsed =
      isAgent && creditCeiling !== undefined && creditBalance !== undefined
        ? creditCeiling - creditBalance
        : undefined;
    const balanceToPay = creditUsed;

    return {
      id: data.id,
      user_id: data.user_id,
      user_name: userProfile?.full_name || 'Unknown User',
      user_email: userProfile?.email || '',
      user_role: userProfile?.role || 'customer',
      balance: Number(data.balance),
      currency: data.currency,
      is_active: Number(data.balance) > 0,
      total_credits: 0,
      total_debits: 0,
      created_at: data.created_at,
      updated_at: data.updated_at,
      credit_ceiling: creditCeiling,
      credit_balance: creditBalance,
      credit_used: creditUsed,
      balance_to_pay: balanceToPay,
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
      status: data.status,
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

    // Fetch user profile with credit info separately
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, role, credit_ceiling, credit_balance')
      .eq('id', data.user_id)
      .single();

    const isAgent = userProfile?.role === 'agent';
    const creditCeiling = isAgent
      ? Number(userProfile?.credit_ceiling || 0)
      : undefined;
    const creditBalance = isAgent
      ? Number(userProfile?.credit_balance || 0)
      : undefined;
    const creditUsed =
      isAgent && creditCeiling !== undefined && creditBalance !== undefined
        ? creditCeiling - creditBalance
        : undefined;
    const balanceToPay = creditUsed;

    return {
      id: data.id,
      user_id: data.user_id,
      user_name: userProfile?.full_name || 'Unknown User',
      user_email: userProfile?.email || '',
      user_role: userProfile?.role || 'customer',
      balance: Number(data.balance),
      currency: data.currency,
      is_active: Number(data.balance) > 0,
      total_credits: 0,
      total_debits: 0,
      created_at: data.created_at,
      updated_at: data.updated_at,
      credit_ceiling: creditCeiling,
      credit_balance: creditBalance,
      credit_used: creditUsed,
      balance_to_pay: balanceToPay,
    };
  } catch (error) {
    console.error('Failed to fetch wallet by user ID:', error);
    throw error;
  }
};

/**
 * Update agent credit limit (credit ceiling)
 * Also adjusts credit_balance to maintain the same credit_used amount
 */
export const updateAgentCreditLimit = async (
  userId: string,
  creditCeiling: number
): Promise<void> => {
  try {
    // First, get the current credit values to calculate how much is already used
    const { data: currentProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('credit_ceiling, credit_balance')
      .eq('id', userId)
      .eq('role', 'agent')
      .single();

    if (fetchError) {
      console.error(
        '❌ [updateAgentCreditLimit] Error fetching current credit data:',
        fetchError
      );
      throw fetchError;
    }

    if (!currentProfile) {
      throw new Error('Agent profile not found');
    }

    const oldCeiling = Number(currentProfile.credit_ceiling || 0);
    const oldBalance = Number(currentProfile.credit_balance || 0);
    const creditUsed = oldCeiling - oldBalance; // Amount already borrowed

    // Calculate new balance: new_ceiling - credit_used (keeps debt the same)
    const newBalance = creditCeiling - creditUsed;

    // Update both ceiling and balance
    const { error } = await supabase
      .from('user_profiles')
      .update({
        credit_ceiling: creditCeiling,
        credit_balance: newBalance,
      })
      .eq('id', userId)
      .eq('role', 'agent'); // Ensure we only update agents

    if (error) {
      console.error(
        '❌ [updateAgentCreditLimit] Error updating credit limit:',
        error
      );
      throw error;
    }
  } catch (error) {
    console.error(
      '❌ [updateAgentCreditLimit] Failed to update credit limit:',
      error
    );
    throw error;
  }
};
