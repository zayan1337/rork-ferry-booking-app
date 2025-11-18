// ============================================================================
// FINANCE & PAYMENT TYPES - BASED ON DATABASE SCHEMA
// ============================================================================

export interface Wallet {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_role?: string;
  balance: number;
  currency: string;
  is_active: boolean;
  is_wallet?: boolean;
  is_credit_account?: boolean;
  transactions?: WalletTransaction[];
  total_credits?: number;
  total_debits?: number;
  created_at: string;
  updated_at: string;
  // Agent-specific credit fields
  credit_ceiling?: number; // Agent's credit limit
  credit_balance?: number; // Agent's current available credit
  credit_used?: number; // Amount of credit already used
  balance_to_pay?: number; // Amount agent owes (credit_ceiling - credit_balance)
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  user_id: string;
  user_name: string;
  amount: number;
  transaction_type: 'credit' | 'debit';
  status: 'completed' | 'pending' | 'failed';
  reference_id?: string;
  description?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  payment_method:
    | 'bank_transfer'
    | 'bml'
    | 'mib'
    | 'ooredoo_m_faisa'
    | 'fahipay'
    | 'wallet';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  receipt_number?: string;
  gateway_reference?: string;
  created_at: string;
  updated_at: string;
  session_id?: string;

  // Related data
  booking?: {
    id: string;
    booking_number: string;
    user_id: string;
    user_name?: string;
    user_email?: string;
    total_fare: number;
    status: string;
  };
}

export interface PaymentReport {
  id: string;
  booking_id: string;
  booking_number: string;
  user_name: string;
  user_email?: string;
  amount: number;
  payment_method: string;
  status: string;
  receipt_number?: string;
  transaction_date: string;
  created_at: string;

  // Additional fields for enhanced reporting
  route_name?: string;
  trip_date?: string;
  passenger_count?: number;
}

export interface FinanceStats {
  totalWalletBalance: number;
  activeWallets: number;
  todayTransactions: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  paymentSuccessRate: number;
  completedPayments: number;
  pendingPayments: number;
  failedPayments: number;
  totalRevenue: number;
  averageTransactionAmount: number;
}

export interface PaymentMethodStats {
  method: string;
  count: number;
  totalAmount: number;
  percentage: number;
  successRate: number;
}

export interface FinanceFilters {
  searchQuery: string;
  dateRange: {
    start: string;
    end: string;
  };
  status: 'all' | 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  paymentMethod:
    | 'all'
    | 'bank_transfer'
    | 'bml'
    | 'mib'
    | 'ooredoo_m_faisa'
    | 'fahipay'
    | 'wallet';
  amountRange: {
    min: number;
    max: number;
  };
  sortBy: 'created_at' | 'amount' | 'status' | 'payment_method';
  sortOrder: 'asc' | 'desc';
}

export interface WalletFilters {
  searchQuery: string;
  status: 'all' | 'active' | 'inactive';
  balanceRange: {
    min: number;
    max: number;
  };
  sortBy: 'created_at' | 'balance' | 'user_name' | 'updated_at';
  sortOrder: 'asc' | 'desc';
}

export interface TransactionFilters {
  searchQuery: string;
  type: 'all' | 'credit' | 'debit';
  dateRange: {
    start: string;
    end: string;
  };
  amountRange: {
    min: number;
    max: number;
  };
  sortBy: 'created_at' | 'amount' | 'transaction_type';
  sortOrder: 'asc' | 'desc';
}

// Form data types for creating/updating
export interface WalletFormData {
  user_id: string;
  initial_balance?: number;
  currency?: string;
}

export interface AgentCreditLimitFormData {
  user_id: string;
  credit_ceiling: number;
}

export interface WalletTransactionFormData {
  wallet_id: string;
  user_id: string;
  amount: number;
  transaction_type: 'credit' | 'debit';
  description?: string;
  reference_id?: string;
}

export interface PaymentFormData {
  booking_id: string;
  payment_method: string;
  amount: number;
  currency?: string;
  gateway_reference?: string;
  session_id?: string;
}

// API Response types
export interface FinanceApiResponse<T> {
  data: T;
  error?: string;
  count?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Dashboard specific types
export interface FinanceDashboardData {
  stats: FinanceStats;
  recentPayments: Payment[];
  recentTransactions: WalletTransaction[];
  paymentMethodStats: PaymentMethodStats[];
  topWallets: Wallet[];
  dailyRevenue: {
    date: string;
    revenue: number;
    transactions: number;
  }[];
}
