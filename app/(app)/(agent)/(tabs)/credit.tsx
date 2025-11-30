// Enhanced Credit Screen with Optimized Search and Fixed Empty State
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  RefreshControl,
  Pressable,
  ScrollView,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import {
  ArrowUp,
  ArrowDown,
  Filter,
  Search,
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  CreditCard,
  X,
} from 'lucide-react-native';

import Colors from '@/constants/colors';
import CreditTransactionCard from '@/components/CreditTransactionCard';
import { CreditSummaryCard } from '@/components/agent';
import MibPaymentWebView from '@/components/MibPaymentWebView';
import { useAlertContext } from '@/components/AlertProvider';

import { useAgentData } from '@/hooks/useAgentData';
import { useRefreshControl } from '@/hooks/useRefreshControl';
import {
  formatCurrency,
  calculateCreditSummary,
} from '@/utils/agentFormatters';
import { CreditTransaction } from '@/types/agent';
import { supabase } from '@/utils/supabase';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

type FilterType = 'all' | 'refill' | 'deduction';
type SortType = 'newest' | 'oldest' | 'amount_high' | 'amount_low';

// Separate Search Header Component to prevent re-renders
const SearchHeader = React.memo(
  ({
    searchQuery,
    showFilters,
    onSearchChange,
    onClearSearch,
    onToggleFilters,
  }: {
    searchQuery: string;
    showFilters: boolean;
    onSearchChange: (text: string) => void;
    onClearSearch: () => void;
    onToggleFilters: () => void;
  }) => {
    const textInputRef = React.useRef<TextInput>(null);
    const [isFocused, setIsFocused] = React.useState(false);

    // Auto-focus when component mounts or when user starts interacting
    React.useEffect(() => {
      if (showFilters && searchQuery.length === 0) {
        // Small delay to ensure the component is fully rendered
        const timer = setTimeout(() => {
          textInputRef.current?.focus();
        }, 150);
        return () => clearTimeout(timer);
      }
    }, [showFilters]);

    const handleContainerPress = () => {
      textInputRef.current?.focus();
    };

    const handleClearAndFocus = () => {
      onClearSearch();
      // Small delay to ensure state is updated before focusing
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 50);
    };

    const handleSearchSubmit = () => {
      textInputRef.current?.blur();
    };

    const handleFocus = () => {
      setIsFocused(true);
    };

    const handleBlur = () => {
      setIsFocused(false);
    };

    return (
      <View style={styles.searchAndFiltersContainer}>
        {/* Enhanced Search Bar */}
        <Pressable
          style={[
            styles.searchContainer,
            (searchQuery.length > 0 || isFocused) &&
              styles.searchContainerActive,
          ]}
          onPress={handleContainerPress}
        >
          <Search
            size={16}
            color={
              searchQuery.length > 0 || isFocused
                ? Colors.primary
                : Colors.subtext
            }
          />
          <TextInput
            ref={textInputRef}
            style={styles.searchInput}
            placeholder='Search transactions or booking numbers...'
            value={searchQuery}
            onChangeText={onSearchChange}
            onSubmitEditing={handleSearchSubmit}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholderTextColor={Colors.subtext}
            returnKeyType='search'
            autoCorrect={false}
            autoCapitalize='none'
            blurOnSubmit={false}
            selectionColor={Colors.primary}
            textContentType='none'
            autoComplete='off'
            clearButtonMode='never'
          />
          {searchQuery.length > 0 && (
            <Pressable
              style={styles.clearSearchButton}
              onPress={handleClearAndFocus}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.clearSearchText}>×</Text>
            </Pressable>
          )}
        </Pressable>

        {/* Filter Toggle */}
        <Pressable
          style={[
            styles.filterToggle,
            showFilters && styles.activeFilterToggle,
          ]}
          onPress={onToggleFilters}
        >
          <Filter size={16} color={showFilters ? 'white' : Colors.subtext} />
        </Pressable>
      </View>
    );
  }
);

SearchHeader.displayName = 'SearchHeader';

// Credit Payment Modal Component
const CreditPaymentModal = React.memo(
  ({
    visible,
    onClose,
    onSuccess,
    onMibPaymentReady,
    agentId,
  }: {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    onMibPaymentReady: (
      transactionId: string,
      sessionData: any,
      amount: number
    ) => void;
    agentId: string;
  }) => {
    const { showError, showInfo } = useAlertContext();
    const [amount, setAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Reset state when modal closes
    useEffect(() => {
      if (!visible) {
        setAmount('');
        setIsProcessing(false);
      }
    }, [visible]);

    const predefinedAmounts = [500, 1000, 2000, 5000, 10000];

    const handleAmountSelect = (value: number) => {
      setAmount(value.toString());
    };

    const handleProceedToPayment = async () => {
      const parsedAmount = parseFloat(amount);

      // Basic validation - these happen before processing starts
      if (!amount || amount.trim() === '') {
        showError('Invalid Amount', 'Please enter an amount');
        return;
      }

      if (!parsedAmount || parsedAmount <= 0) {
        showError(
          'Invalid Amount',
          'Please enter an amount greater than MVR 0'
        );
        return;
      }

      setIsProcessing(true);

      try {
        // Step 1: Get current agent balance and credit ceiling to calculate balance_to_pay
        const { data: agentData, error: agentError } = await supabase
          .from('user_profiles')
          .select('credit_balance, credit_ceiling, full_name')
          .eq('id', agentId)
          .single();

        if (agentError) {
          throw new Error('Failed to fetch agent data: ' + agentError.message);
        }

        if (!agentData) {
          throw new Error('Agent profile not found');
        }

        const currentBalance = agentData?.credit_balance || 0;
        const creditCeiling = agentData?.credit_ceiling || 0;
        const balanceToPay = creditCeiling - currentBalance;

        // Validation: Check if there's a balance to pay
        if (balanceToPay <= 0) {
          setIsProcessing(false);
          showError(
            'No Balance to Pay',
            'You currently have no outstanding balance. Your credit balance is fully available.'
          );
          return;
        }

        // Validation: Payment amount should not exceed balance_to_pay
        if (parsedAmount > balanceToPay) {
          setIsProcessing(false);
          showError(
            'Amount Exceeds Balance',
            `You can pay a maximum of ${formatCurrency(balanceToPay)}. Please enter an amount less than or equal to your balance.`
          );
          return;
        }

        // Step 2: Create pending transaction
        const { data: transactionData, error: transactionError } =
          await supabase
            .from('agent_credit_transactions')
            .insert({
              agent_id: agentId,
              amount: parsedAmount,
              transaction_type: 'refill',
              description: 'Balance payment via MIB Payment (Pending)',
              balance_after: currentBalance,
            })
            .select()
            .single();

        if (transactionError) {
          console.error(
            '[PAYMENT MODAL] ❌ Transaction creation error:',
            transactionError
          );
          setIsProcessing(false);
          throw new Error(
            'Failed to create transaction: ' + transactionError.message
          );
        }

        if (!transactionData) {
          console.error('[PAYMENT MODAL] ❌ No transaction data returned');
          setIsProcessing(false);
          throw new Error('Failed to create transaction record');
        }

        // Step 3: Create MIB payment session
        const topupId = transactionData.id;
        const returnUrl = `${process.env.EXPO_PUBLIC_MIB_RETURN_URL || 'crystaltransfervaavu://payment-success'}?bookingId=${topupId}&result=SUCCESS&type=credit`;
        const cancelUrl = `${process.env.EXPO_PUBLIC_MIB_CANCEL_URL || 'crystaltransfervaavu://payment-cancel'}?bookingId=${topupId}&result=CANCELLED&type=credit`;

        const { data: mibData, error: mibError } =
          await supabase.functions.invoke('mib-payment', {
            body: {
              action: 'create-session',
              bookingId: topupId,
              amount: parsedAmount,
              currency: 'MVR',
              returnUrl,
              cancelUrl,
            },
          });

        if (mibError) {
          console.error(
            '[PAYMENT MODAL] ❌ MIB payment session creation error',
            { mibError }
          );
          // Delete the failed transaction
          await supabase
            .from('agent_credit_transactions')
            .delete()
            .eq('id', topupId);
          setIsProcessing(false);
          throw new Error(
            `Payment Gateway Error: ${mibError.message || JSON.stringify(mibError)}`
          );
        }

        if (!mibData) {
          console.error('[PAYMENT MODAL] ❌ No MIB data returned');
          await supabase
            .from('agent_credit_transactions')
            .delete()
            .eq('id', topupId);
          setIsProcessing(false);
          throw new Error(
            'No response from payment gateway. The edge function may not be deployed or accessible.'
          );
        }

        if (mibData.success === false) {
          console.error('[PAYMENT MODAL] ❌ MIB payment failed', { mibData });
          await supabase
            .from('agent_credit_transactions')
            .delete()
            .eq('id', topupId);
          setIsProcessing(false);
          throw new Error(
            mibData.error ||
              'Payment gateway returned an error. Please check edge function logs.'
          );
        }

        if (!mibData.redirectUrl && !mibData.sessionUrl) {
          console.error('[PAYMENT MODAL] ❌ No payment URL in MIB response', {
            mibData,
          });
          await supabase
            .from('agent_credit_transactions')
            .delete()
            .eq('id', topupId);
          setIsProcessing(false);
          throw new Error('Payment gateway did not return a payment URL');
        }

        const sessionData = {
          sessionId: mibData.sessionId,
          sessionUrl: mibData.sessionUrl,
          redirectUrl: mibData.redirectUrl || mibData.sessionUrl,
        };

        setIsProcessing(false);
        onMibPaymentReady(topupId, sessionData, parsedAmount);
      } catch (error: any) {
        console.error('[PAYMENT MODAL] ❌ Payment processing error caught', {
          error: error.message,
          stack: error.stack,
          isProcessing: true,
        });
        setIsProcessing(false);

        // Show detailed error to user
        showError(
          'Payment Failed',
          `Error: ${error.message}\n\nPlease check the console logs for details.`
        );
      }
    };

    const handleClose = () => {
      Keyboard.dismiss();
      if (isProcessing) {
        // Allow closing during processing - reset state on close
        setIsProcessing(false);
      }
      setAmount('');
      onClose();
    };

    return (
      <Modal
        visible={visible}
        transparent
        animationType='slide'
        {...(Platform.OS === 'ios' && { presentationStyle: 'pageSheet' })}
        onRequestClose={handleClose}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pay Balance</Text>
              <Pressable
                onPress={handleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalBodyScroll}
              contentContainerStyle={styles.modalBody}
              keyboardShouldPersistTaps='handled'
              showsVerticalScrollIndicator={true}
              bounces={true}
              nestedScrollEnabled={true}
            >
              <Text style={styles.modalLabel}>
                Select or enter payment amount (MVR)
              </Text>

              {/* Predefined amounts */}
              <View style={styles.amountGrid}>
                {predefinedAmounts.map(value => (
                  <Pressable
                    key={value}
                    style={[
                      styles.amountButton,
                      amount === value.toString() && styles.amountButtonActive,
                    ]}
                    onPress={() => handleAmountSelect(value)}
                    hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                  >
                    <Text
                      style={[
                        styles.amountButtonText,
                        amount === value.toString() &&
                          styles.amountButtonTextActive,
                      ]}
                    >
                      {formatCurrency(value)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Custom amount input */}
              <View style={styles.customAmountContainer}>
                <Text style={styles.modalLabel}>Or enter custom amount</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder='Enter payment amount'
                  keyboardType='numeric'
                  value={amount}
                  onChangeText={setAmount}
                  placeholderTextColor={Colors.subtext}
                  returnKeyType='done'
                />
              </View>

              {/* Payment method info */}
              <View style={styles.paymentMethodInfo}>
                <CreditCard size={20} color={Colors.primary} />
                <Text style={styles.paymentMethodText}>
                  Pay securely with MIB Payment Gateway
                </Text>
              </View>

              {/* Action buttons */}
              <Pressable
                style={[
                  styles.proceedButton,
                  isProcessing && styles.proceedButtonDisabled,
                ]}
                onPress={handleProceedToPayment}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color='white' />
                ) : (
                  <>
                    <CreditCard size={20} color='white' />
                    <Text style={styles.proceedButtonText}>
                      Proceed to Payment
                    </Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={styles.cancelButton}
                onPress={handleClose}
                disabled={false}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }
);

CreditPaymentModal.displayName = 'CreditPaymentModal';

export default function AgentCreditScreen() {
  const { showSuccess, showError, showInfo } = useAlertContext();
  const {
    agent,
    creditTransactions,
    isLoadingCredit,
    refreshCreditTransactions,
    refreshAgentData,
  } = useAgentData();

  // State for filters and search
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // MIB Payment states - lifted to parent to avoid nested modals
  const [showMibPayment, setShowMibPayment] = useState(false);
  const [creditTopupId, setCreditTopupId] = useState<string | null>(null);
  const [mibSessionData, setMibSessionData] = useState<any>(null);
  const [topupAmount, setTopupAmount] = useState(0);

  // State for wallet transactions (manual payments)
  const [walletTransactions, setWalletTransactions] = useState<
    CreditTransaction[]
  >([]);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);

  // Fetch wallet transactions (manual payments from admin)
  const fetchWalletTransactions = useCallback(async () => {
    if (!agent?.id) return;

    try {
      setIsLoadingWallet(true);

      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', agent.id)
        .eq('transaction_type', 'credit')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[WALLET TRANSACTIONS] Error fetching:', error);
        throw error;
      }

      // Convert wallet transactions to credit transaction format
      const convertedTransactions: CreditTransaction[] = (data || []).map(
        wt => ({
          id: wt.id,
          type: 'refill' as const,
          amount: wt.amount || 0,
          description: wt.description || 'Manual payment recorded by admin',
          createdAt: wt.created_at || wt.updated_at || new Date().toISOString(),
          bookingNumber: wt.reference_id || undefined,
          date: wt.created_at || wt.updated_at || new Date().toISOString(),
          balance: 0, // Balance is managed in user_profiles, not individual transactions
        })
      );

      setWalletTransactions(convertedTransactions);
    } catch (error) {
      console.error(
        '[WALLET TRANSACTIONS] Failed to fetch wallet transactions:',
        error
      );
      setWalletTransactions([]);
    } finally {
      setIsLoadingWallet(false);
    }
  }, [agent?.id]);

  // Fetch wallet transactions on mount and when agent changes
  useEffect(() => {
    fetchWalletTransactions();
  }, [fetchWalletTransactions]);

  // Handle refresh - refresh all data including agent data
  const handleRefresh = useCallback(async () => {
    await refreshAgentData(); // Refresh agent data to update credit_balance and credit_ceiling
    await refreshCreditTransactions();
    await fetchWalletTransactions();
  }, [refreshAgentData, refreshCreditTransactions, fetchWalletTransactions]);

  const { isRefreshing, onRefresh } = useRefreshControl({
    onRefresh: handleRefresh,
  });

  // Combined transactions (credit + wallet)
  const allTransactions = useMemo(() => {
    const combined = [...(creditTransactions || []), ...walletTransactions];
    // Sort by date (newest first)
    const sorted = combined.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return sorted;
  }, [creditTransactions, walletTransactions]);

  const handleRequestCredit = () => {
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async () => {
    await refreshAgentData(); // Refresh agent data to update credit_balance and credit_ceiling
    await refreshCreditTransactions();
    await fetchWalletTransactions();
  };

  const handleMibPaymentReady = (
    transactionId: string,
    sessionData: any,
    amount: number
  ) => {
    setCreditTopupId(transactionId);
    setMibSessionData(sessionData);
    setTopupAmount(amount);
    setShowPaymentModal(false); // Close the amount selection modal

    // Small delay to ensure first modal closes before opening payment modal
    setTimeout(() => {
      setShowMibPayment(true);
    }, 300);
  };

  // Test MIB function health
  const testMibConnection = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('mib-payment', {
        body: { action: 'health-check' },
      });
      if (error) {
        showError('MIB Test Failed', `Error: ${error.message}`);
      } else {
        showSuccess('MIB Test Success', `Status: ${data?.status || 'OK'}`);
      }
    } catch (err: any) {
      console.error('[TEST] MIB test error:', err);
      showError('MIB Test Error', err.message);
    }
  };

  const creditSummary = useMemo(() => {
    const summary = calculateCreditSummary(agent, allTransactions);
    return summary;
  }, [agent, allTransactions]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleFilterChange = useCallback((filter: FilterType) => {
    setActiveFilter(filter);
  }, []);

  const handleSortChange = useCallback((sort: SortType) => {
    setSortBy(sort);
  }, []);

  const toggleFilters = useCallback(() => {
    setShowFilters(prev => !prev);
  }, []);

  const clearAllFilters = useCallback(() => {
    setActiveFilter('all');
    setSearchQuery('');
  }, []);

  // Filter and sort transactions (using combined transactions)
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = allTransactions || [];

    // Apply filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(
        transaction => transaction.type === activeFilter
      );
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        transaction =>
          transaction.description?.toLowerCase().includes(query) ||
          transaction.bookingNumber?.toLowerCase().includes(query) ||
          (transaction.description?.toLowerCase().includes('manual') &&
            'manual'.includes(query))
      );
    }

    // Apply sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case 'oldest':
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case 'amount_high':
          return b.amount - a.amount;
        case 'amount_low':
          return a.amount - b.amount;
        default:
          return 0;
      }
    });

    return sorted;
  }, [allTransactions, activeFilter, searchQuery, sortBy]);

  // Calculate filtered statistics
  const filteredStats = useMemo(() => {
    const refills = filteredAndSortedTransactions.filter(
      t => t.type === 'refill'
    );
    const deductions = filteredAndSortedTransactions.filter(
      t => t.type === 'deduction'
    );

    return {
      totalRefills: refills.reduce((sum, t) => sum + t.amount, 0),
      totalDeductions: deductions.reduce((sum, t) => sum + t.amount, 0),
      refillCount: refills.length,
      deductionCount: deductions.length,
      averageRefill:
        refills.length > 0
          ? refills.reduce((sum, t) => sum + t.amount, 0) / refills.length
          : 0,
      averageDeduction:
        deductions.length > 0
          ? deductions.reduce((sum, t) => sum + t.amount, 0) / deductions.length
          : 0,
    };
  }, [filteredAndSortedTransactions]);

  // Get recent transactions (last 7 days) - using combined transactions
  const recentTransactions = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return (
      allTransactions?.filter(t => new Date(t.createdAt) >= sevenDaysAgo) || []
    );
  }, [allTransactions]);

  const renderFilterButton = useCallback(
    (filter: FilterType, label: string, icon: React.ReactNode) => (
      <Pressable
        key={filter}
        style={[
          styles.filterButton,
          activeFilter === filter && styles.activeFilterButton,
        ]}
        onPress={() => handleFilterChange(filter)}
      >
        {icon}
        <Text
          style={[
            styles.filterButtonText,
            activeFilter === filter && styles.activeFilterButtonText,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    ),
    [activeFilter, handleFilterChange]
  );

  const renderTransactionItem = React.useCallback(
    ({ item }: { item: CreditTransaction }) => (
      <CreditTransactionCard transaction={item} />
    ),
    []
  );

  const ListHeaderComponent = useMemo(
    () => (
      <View style={styles.headerContainer}>
        {/* Enhanced Credit Summary */}
        <View style={styles.summarySection}>
          <CreditSummaryCard
            agent={agent}
            transactions={allTransactions}
            onRequestCredit={handleRequestCredit}
          />
        </View>

        {/* Enhanced Transaction Summary Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.refillCard]}>
            <View
              style={[
                styles.statIconContainer,
                { backgroundColor: `${Colors.success}15` },
              ]}
            >
              <TrendingUp size={20} color={Colors.success} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel} numberOfLines={1}>
                Credit Added
              </Text>
              <Text
                style={[styles.statValue, { color: Colors.success }]}
                numberOfLines={1}
              >
                {formatCurrency(creditSummary.totalCreditAdded)}
              </Text>
              <Text style={styles.statSubtext} numberOfLines={1}>
                {creditTransactions?.filter(t => t.type === 'refill').length ||
                  0}{' '}
                transactions
              </Text>
            </View>
          </View>

          <View style={[styles.statCard, styles.deductionCard]}>
            <View
              style={[
                styles.statIconContainer,
                { backgroundColor: `${Colors.error}15` },
              ]}
            >
              <TrendingDown size={20} color={Colors.error} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel} numberOfLines={1}>
                Credit Used
              </Text>
              <Text
                style={[styles.statValue, { color: Colors.error }]}
                numberOfLines={1}
              >
                {formatCurrency(creditSummary.totalCreditUsed)}
              </Text>
              <Text style={styles.statSubtext} numberOfLines={1}>
                {creditTransactions?.filter(t => t.type === 'deduction')
                  .length || 0}{' '}
                transactions
              </Text>
            </View>
          </View>
        </View>

        {/* Recent Activity Summary */}
        {recentTransactions.length > 0 && (
          <View style={styles.recentActivityCard}>
            <View style={styles.recentActivityHeader}>
              <Clock size={16} color={Colors.primary} />
              <Text style={styles.recentActivityTitle}>
                Last 7 Days Activity
              </Text>
            </View>
            <View style={styles.recentActivityStats}>
              <View style={styles.recentStat}>
                <Text style={styles.recentStatLabel}>Transactions</Text>
                <Text style={styles.recentStatValue}>
                  {recentTransactions.length}
                </Text>
              </View>
              <View style={styles.recentStat}>
                <Text style={styles.recentStatLabel}>Net Change</Text>
                <Text
                  style={[
                    styles.recentStatValue,
                    {
                      color:
                        recentTransactions.reduce(
                          (sum, t) =>
                            sum + (t.type === 'refill' ? t.amount : -t.amount),
                          0
                        ) >= 0
                          ? Colors.success
                          : Colors.error,
                    },
                  ]}
                >
                  {formatCurrency(
                    Math.abs(
                      recentTransactions.reduce(
                        (sum, t) =>
                          sum + (t.type === 'refill' ? t.amount : -t.amount),
                        0
                      )
                    )
                  )}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Search and Filters */}
        <SearchHeader
          searchQuery={searchQuery}
          showFilters={showFilters}
          onSearchChange={handleSearchChange}
          onClearSearch={handleClearSearch}
          onToggleFilters={toggleFilters}
        />

        {/* Filter Buttons */}
        {showFilters && (
          <View style={styles.filtersContainer}>
            <View style={styles.filterButtonsWrapper}>
              {renderFilterButton(
                'all',
                'All',
                <Calendar
                  size={14}
                  color={activeFilter === 'all' ? 'white' : Colors.subtext}
                />
              )}
              {renderFilterButton(
                'refill',
                'Refills',
                <ArrowUp
                  size={14}
                  color={activeFilter === 'refill' ? 'white' : Colors.success}
                />
              )}
              {renderFilterButton(
                'deduction',
                'Deductions',
                <ArrowDown
                  size={14}
                  color={activeFilter === 'deduction' ? 'white' : Colors.error}
                />
              )}
            </View>

            {/* Sort Options */}
            <View style={styles.sortContainer}>
              <Text style={styles.sortLabel}>Sort by:</Text>
              <View style={styles.sortButtonsWrapper}>
                {[
                  { key: 'newest', label: 'Newest' },
                  { key: 'oldest', label: 'Oldest' },
                  { key: 'amount_high', label: 'Amount ↓' },
                  { key: 'amount_low', label: 'Amount ↑' },
                ].map(sort => (
                  <Pressable
                    key={sort.key}
                    style={[
                      styles.sortButton,
                      sortBy === sort.key && styles.activeSortButton,
                    ]}
                    onPress={() => handleSortChange(sort.key as SortType)}
                  >
                    <Text
                      style={[
                        styles.sortButtonText,
                        sortBy === sort.key && styles.activeSortButtonText,
                      ]}
                    >
                      {sort.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Results Summary */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>
            Transaction History{' '}
            {filteredAndSortedTransactions.length > 0 &&
              `(${filteredAndSortedTransactions.length})`}
          </Text>
          {activeFilter !== 'all' || searchQuery.trim() ? (
            <Pressable
              style={styles.clearFiltersButton}
              onPress={clearAllFilters}
            >
              <Text style={styles.clearFiltersText}>Clear Filters</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    ),
    [
      agent,
      allTransactions,
      creditTransactions,
      creditSummary,
      recentTransactions,
      searchQuery,
      showFilters,
      activeFilter,
      sortBy,
      filteredAndSortedTransactions.length,
      handleSearchChange,
      handleClearSearch,
      toggleFilters,
      renderFilterButton,
      handleSortChange,
      clearAllFilters,
      handleRequestCredit,
    ]
  );

  const ListEmptyComponent = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyContent}>
          <View style={styles.emptyIconContainer}>
            <Calendar size={48} color={Colors.subtext} />
          </View>
          <Text style={styles.emptyTitle}>No transactions found</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery.trim() || activeFilter !== 'all'
              ? 'Try adjusting your filters or search terms'
              : 'Your credit transactions will appear here'}
          </Text>
          {(searchQuery.trim() || activeFilter !== 'all') && (
            <Pressable
              style={styles.emptyActionButton}
              onPress={clearAllFilters}
            >
              <Text style={styles.emptyActionText}>Clear Filters</Text>
            </Pressable>
          )}
        </View>
      </View>
    ),
    [searchQuery, activeFilter, clearAllFilters]
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <View style={styles.innerContainer}>
        <FlatList
          key='credit-transactions-list'
          data={filteredAndSortedTransactions}
          keyExtractor={item => item.id}
          renderItem={renderTransactionItem}
          ListHeaderComponent={ListHeaderComponent}
          ListEmptyComponent={
            (isLoadingCredit || isLoadingWallet) &&
            (!allTransactions || allTransactions.length === 0) ? (
              <View style={styles.listLoadingContainer}>
                <ActivityIndicator size='large' color={Colors.primary} />
                <Text style={styles.loadingText}>Loading transactions...</Text>
              </View>
            ) : (
              ListEmptyComponent
            )
          }
          contentContainerStyle={[
            styles.listContainer,
            filteredAndSortedTransactions.length === 0 &&
              styles.emptyListContainer,
          ]}
          style={styles.flatListStyle}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          getItemLayout={(data, index) => ({
            length: 120,
            offset: 120 * index,
            index,
          })}
          removeClippedSubviews={true}
          maxToRenderPerBatch={15}
          windowSize={15}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps='handled'
        />
      </View>

      {/* Credit Payment Modal */}
      {agent?.id && (
        <CreditPaymentModal
          visible={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
          onMibPaymentReady={handleMibPaymentReady}
          agentId={agent.id}
        />
      )}

      {/* MIB Payment WebView - Separate from amount modal to avoid nesting issues */}
      {showMibPayment &&
        creditTopupId &&
        mibSessionData &&
        (() => {
          return (
            <MibPaymentWebView
              visible={true}
              bookingDetails={{
                bookingNumber: `TOP-${creditTopupId.slice(0, 8).toUpperCase()}`,
                route: 'Balance Payment',
                travelDate: new Date().toISOString(),
                amount: topupAmount,
                currency: 'MVR',
                passengerCount: 1,
              }}
              bookingId={creditTopupId}
              sessionData={mibSessionData}
              onClose={() => {
                setShowMibPayment(false);
                setCreditTopupId(null);
                setMibSessionData(null);
              }}
              onSuccess={async (result: any) => {
                try {
                  // The MIB edge function should have already updated the balance
                  // But we'll verify and refresh the data
                  // Get current agent data including credit ceiling
                  const { data: agentData, error: agentDataError } =
                    await supabase
                      .from('user_profiles')
                      .select('credit_balance, credit_ceiling')
                      .eq('id', agent!.id)
                      .single();

                  if (agentDataError) {
                    console.error(
                      '[SCREEN] Error fetching agent data after payment:',
                      agentDataError
                    );
                  }

                  const currentBalance = agentData?.credit_balance || 0;
                  const creditCeiling = agentData?.credit_ceiling || 0;

                  // Verify the transaction was updated by edge function
                  // If not, update it here as fallback
                  const { data: transactionData } = await supabase
                    .from('agent_credit_transactions')
                    .select('balance_after, description')
                    .eq('id', creditTopupId)
                    .single();

                  // If edge function didn't update, do it here
                  if (
                    !transactionData?.description?.includes('Completed') ||
                    transactionData.balance_after !== currentBalance
                  ) {
                    const newBalance = currentBalance + topupAmount;

                    // Update transaction to completed
                    const { error: transactionUpdateError } = await supabase
                      .from('agent_credit_transactions')
                      .update({
                        description: `Balance payment via MIB Payment (Completed) - Session: ${result.sessionId || 'N/A'}`,
                        balance_after: newBalance,
                      })
                      .eq('id', creditTopupId);

                    if (transactionUpdateError) {
                      console.error(
                        '[SCREEN] Error updating transaction:',
                        transactionUpdateError
                      );
                    }

                    // Update agent credit balance (this reduces the owed amount)
                    const { error: balanceUpdateError } = await supabase
                      .from('user_profiles')
                      .update({
                        credit_balance: newBalance,
                        updated_at: new Date().toISOString(),
                      })
                      .eq('id', agent!.id);

                    if (balanceUpdateError) {
                      console.error(
                        '[SCREEN] Error updating credit balance:',
                        balanceUpdateError
                      );
                      throw new Error(
                        `Failed to update credit balance: ${balanceUpdateError.message}`
                      );
                    }
                  }

                  setShowMibPayment(false);
                  setCreditTopupId(null);
                  setMibSessionData(null);

                  // Calculate old balance before refresh
                  const oldBalance = currentBalance;
                  const oldBalanceToPay = creditCeiling - oldBalance;

                  // Refresh data to get latest balance
                  await handlePaymentSuccess();

                  // Fetch updated agent data after refresh
                  const { data: updatedAgentData } = await supabase
                    .from('user_profiles')
                    .select('credit_balance, credit_ceiling')
                    .eq('id', agent!.id)
                    .single();

                  const newBalance =
                    updatedAgentData?.credit_balance || oldBalance;
                  const newBalanceToPay = creditCeiling - newBalance;
                  const actualPaymentAmount = newBalance - oldBalance;

                  showSuccess(
                    'Payment Successful! 🎉',
                    `Payment Amount: ${formatCurrency(topupAmount)}\n\n` +
                      `Previous Balance Owed: ${formatCurrency(oldBalanceToPay)}\n` +
                      `New Balance Owed: ${formatCurrency(newBalanceToPay)}\n\n` +
                      `Available Credit: ↑ ${formatCurrency(actualPaymentAmount)}\n` +
                      `Balance Paid: ↓ ${formatCurrency(actualPaymentAmount)}`
                  );
                } catch (error: any) {
                  console.error(
                    '[SCREEN] ❌ Payment success handling error:',
                    error
                  );
                  setShowMibPayment(false);
                  setCreditTopupId(null);
                  setMibSessionData(null);
                  showError(
                    'Error',
                    `Payment successful but failed to update balance: ${error.message}. Please refresh the page or contact support.`
                  );
                  // Still refresh to show updated data if edge function updated it
                  await handlePaymentSuccess();
                }
              }}
              onFailure={async (error: string) => {
                if (creditTopupId) {
                  await supabase
                    .from('agent_credit_transactions')
                    .update({
                      description: 'Balance payment via MIB Payment (Failed)',
                    })
                    .eq('id', creditTopupId);
                }
                setShowMibPayment(false);
                setCreditTopupId(null);
                setMibSessionData(null);
                showError('Payment Failed', error);
              }}
              onCancel={async () => {
                if (creditTopupId) {
                  await supabase
                    .from('agent_credit_transactions')
                    .update({
                      description:
                        'Balance payment via MIB Payment (Cancelled)',
                    })
                    .eq('id', creditTopupId);
                }
                setShowMibPayment(false);
                setCreditTopupId(null);
                setMibSessionData(null);
                showInfo(
                  'Payment Cancelled',
                  'Your balance payment has been cancelled'
                );
              }}
            />
          );
        })()}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  innerContainer: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 4,
    paddingBottom: 0,
    paddingTop: 16,
    width: '100%',
  },
  summarySection: {
    paddingBottom: 0,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 0,
  },
  statCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: 0,
    maxWidth: '48%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    alignSelf: 'center',
  },
  statContent: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: Colors.subtext,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  statSubtext: {
    fontSize: 12,
    color: Colors.subtext,
    textAlign: 'center',
  },
  refillCard: {
    marginRight: 8,
  },
  deductionCard: {
    marginLeft: 8,
  },
  recentActivityCard: {
    padding: 16,
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recentActivityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentActivityTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  recentActivityStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentStatLabel: {
    fontSize: 12,
    color: Colors.subtext,
    marginRight: 8,
  },
  recentStatValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchAndFiltersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
    gap: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 44,
    maxHeight: 44,
  },
  searchContainerActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.card,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    padding: 0,
    paddingLeft: 8,
    fontSize: 14,
    color: Colors.text,
    height: 44,
    lineHeight: 20,
    textAlignVertical: 'center',
  },
  clearSearchButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.subtext,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  clearSearchText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  filterToggle: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeFilterToggle: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    width: '100%',
    maxWidth: isTablet ? 600 : '100%',
    alignSelf: 'center',
  },
  filterButtonsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexGrow: 0,
    width: '100%',
    gap: isTablet ? 8 : 4,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 80,
    height: 40,
    justifyContent: 'center',
    flex: 1,
  },
  activeFilterButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: 12,
    color: Colors.text,
    marginLeft: 4,
    fontWeight: '500',
    textAlign: 'center',
  },
  activeFilterButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  sortContainer: {
    marginTop: 8,
    width: '100%',
  },
  sortLabel: {
    fontSize: 12,
    color: Colors.subtext,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sortButtonsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: isTablet ? 8 : 4,
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 15,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 70,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  activeSortButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  sortButtonText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '500',
    textAlign: 'center',
  },
  activeSortButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  resultsHeader: {
    padding: 16,
    paddingBottom: 8,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  clearFiltersButton: {
    padding: 8,
  },
  clearFiltersText: {
    fontSize: 12,
    color: Colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Colors.subtext}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.subtext,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  emptyActionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  flatListStyle: {
    flex: 1,
    minHeight: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: screenHeight * 0.92,
    minHeight: 550,
    width: '100%',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  modalBodyScroll: {
    flex: 1,
  },
  modalBody: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 60 : 40,
    flexGrow: 1,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  amountButton: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  amountButtonActive: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  amountButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  amountButtonTextActive: {
    color: Colors.primary,
  },
  customAmountContainer: {
    marginBottom: 20,
  },
  amountInput: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 10,
  },
  paymentMethodText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  proceedButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  proceedButtonDisabled: {
    opacity: 0.6,
  },
  proceedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.subtext,
  },
  // loadingContainer: {
  //   flex: 1,
  //   justifyContent: 'center',
  //   alignItems: 'center',
  //   padding: 32,
  //   minHeight: 200,
  // },
  listLoadingContainer: {
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.subtext,
  },
});
