import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useFinanceData } from '@/hooks/useFinanceData';
import type { Wallet } from '@/types/admin/finance';
import {
  Wallet as WalletIcon,
  AlertTriangle,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Plus,
  CreditCard,
  X,
  Wallet as WalletIconAlt,
} from 'lucide-react-native';
import SearchBar from '@/components/admin/SearchBar';
import MibPaymentWebView from '@/components/MibPaymentWebView';
import { supabase } from '@/utils/supabase';

interface WalletsListPageProps {
  agentOnly?: boolean;
}

// Wallet Recharge Modal Component
const WalletRechargeModal = React.memo(
  ({
    visible,
    onClose,
    onSuccess,
    wallet,
    formatCurrency,
  }: {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    wallet: Wallet | null;
    formatCurrency: (amount: number) => string;
  }) => {
    const [amount, setAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showMibPayment, setShowMibPayment] = useState(false);
    const [rechargeId, setRechargeId] = useState<string | null>(null);
    const [mibSessionData, setMibSessionData] = useState<any>(null);

    const predefinedAmounts = [500, 1000, 2000, 5000, 10000];

    const handleAmountSelect = (value: number) => {
      setAmount(value.toString());
    };

    const handleProceedToPayment = async () => {
      const parsedAmount = parseFloat(amount);
      if (!parsedAmount || parsedAmount < 100) {
        Alert.alert('Invalid Amount', 'Please enter an amount of at least MVR 100');
        return;
      }

      if (!wallet) {
        Alert.alert('Error', 'Wallet not found');
        return;
      }

      setIsProcessing(true);

      try {
        // Step 1: Create pending transaction
        console.log('[WALLET RECHARGE] Step 1: Creating transaction record');
        const { data: transactionData, error: transactionError } = await supabase
          .from('wallet_transactions')
          .insert({
            wallet_id: wallet.id,
            transaction_type: 'credit',
            amount: parsedAmount,
            reference_id: null,
          })
          .select()
          .single();

        if (transactionError) {
          console.error('[WALLET RECHARGE] Transaction creation error:', transactionError);
          throw new Error(transactionError.message || 'Failed to create transaction record');
        }

        console.log('[WALLET RECHARGE] Transaction created:', transactionData.id);
        setRechargeId(transactionData.id);

        // Step 2: Create MIB payment session
        const rechargeTransactionId = transactionData.id;
        const returnUrl = `${process.env.EXPO_PUBLIC_MIB_RETURN_URL || 'crystaltransfervaavu://payment-success'}?bookingId=${rechargeTransactionId}&result=SUCCESS&type=wallet`;
        const cancelUrl = `${process.env.EXPO_PUBLIC_MIB_CANCEL_URL || 'crystaltransfervaavu://payment-cancel'}?bookingId=${rechargeTransactionId}&result=CANCELLED&type=wallet`;

        console.log('[WALLET RECHARGE] Step 2: Creating MIB payment session');
        console.log('[WALLET RECHARGE] Transaction ID:', rechargeTransactionId);
        console.log('[WALLET RECHARGE] Amount:', parsedAmount);

        const { data: mibData, error: mibError } = await supabase.functions.invoke('mib-payment', {
          body: {
            action: 'create-session',
            bookingId: rechargeTransactionId,
            amount: parsedAmount,
            currency: wallet.currency || 'MVR',
            returnUrl,
            cancelUrl,
          },
        });

        console.log('[WALLET RECHARGE] MIB Response:', { hasData: !!mibData, hasError: !!mibError });

        if (mibError) {
          console.error('[WALLET RECHARGE] MIB Error:', mibError);
          await supabase
            .from('wallet_transactions')
            .delete()
            .eq('id', rechargeTransactionId);
          throw new Error(`Payment Gateway Error: ${mibError.message || 'Unable to connect to payment gateway'}`);
        }

        if (!mibData) {
          await supabase
            .from('wallet_transactions')
            .delete()
            .eq('id', rechargeTransactionId);
          throw new Error('No response from payment gateway');
        }

        if (!mibData.success) {
          console.error('[WALLET RECHARGE] MIB returned failure:', mibData);
          await supabase
            .from('wallet_transactions')
            .delete()
            .eq('id', rechargeTransactionId);
          throw new Error(mibData.error || mibData.message || 'Payment gateway returned an error');
        }

        if (!mibData.redirectUrl && !mibData.sessionUrl) {
          await supabase
            .from('wallet_transactions')
            .delete()
            .eq('id', rechargeTransactionId);
          throw new Error('Payment gateway did not return a payment URL');
        }

        const sessionData = {
          sessionId: mibData.sessionId,
          sessionUrl: mibData.sessionUrl,
          redirectUrl: mibData.redirectUrl || mibData.sessionUrl,
        };

        setMibSessionData(sessionData);
        setShowMibPayment(true);
        setIsProcessing(false);
        console.log('[WALLET RECHARGE] Payment gateway opened successfully');
      } catch (error: any) {
        console.error('[WALLET RECHARGE] Payment initiation error:', error);
        setIsProcessing(false);
        
        const errorMessage = error.message || 'Unable to start payment process';
        const detailedMessage = errorMessage.includes('MIB') 
          ? errorMessage 
          : `${errorMessage}\n\nPlease ensure the MIB payment gateway is configured correctly.`;
        
        Alert.alert(
          'Payment Failed',
          detailedMessage,
          [{ text: 'OK' }]
        );
      }
    };

    const handlePaymentSuccess = async (result: any) => {
      if (!wallet) return;

      try {
        console.log('[WALLET RECHARGE] ========================================');
        console.log('[WALLET RECHARGE] Payment successful! Processing wallet update...');
        
        const parsedAmount = parseFloat(amount);
        const oldBalance = wallet.balance;
        const newBalance = oldBalance + parsedAmount;

        console.log('[WALLET RECHARGE] Wallet Update:', {
          rechargeAmount: parsedAmount,
          oldBalance,
          newBalance,
          increase: parsedAmount,
          walletId: wallet.id,
          userName: wallet.user_name,
        });

        // Update wallet balance
        await supabase
          .from('wallets')
          .update({
            balance: newBalance,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', wallet.id);

        console.log('[WALLET RECHARGE] ✅ Wallet balance updated');

        setShowMibPayment(false);
        setAmount('');
        
        console.log('[WALLET RECHARGE] ========================================');
        
        Alert.alert(
          'Payment Successful! 🎉',
          `Recharge Amount: ${formatCurrency(parsedAmount)}\n\n` +
          `Previous Balance: ${formatCurrency(oldBalance)} ${wallet.currency}\n` +
          `New Balance: ${formatCurrency(newBalance)} ${wallet.currency}\n\n` +
          `✅ Wallet Balance Increased: +${formatCurrency(parsedAmount)}`,
          [
            {
              text: 'OK',
              onPress: () => {
                onSuccess();
                onClose();
              },
            },
          ]
        );
      } catch (error: any) {
        console.error('[WALLET RECHARGE] ❌ Payment success handling error:', error);
        Alert.alert('Error', 'Payment successful but failed to update wallet. Please contact support.');
      }
    };

    const handlePaymentFailure = async (error: string) => {
      if (rechargeId) {
        await supabase
          .from('wallet_transactions')
          .delete()
          .eq('id', rechargeId);
      }
      setShowMibPayment(false);
      setAmount('');
      Alert.alert('Payment Failed', error);
    };

    const handlePaymentCancel = async () => {
      if (rechargeId) {
        await supabase
          .from('wallet_transactions')
          .delete()
          .eq('id', rechargeId);
      }
      setShowMibPayment(false);
      setAmount('');
      Alert.alert('Payment Cancelled', 'Wallet recharge has been cancelled');
    };

    const handleClose = () => {
      setAmount('');
      onClose();
    };

    if (!wallet) return null;

    return (
      <>
        <Modal visible={visible} transparent animationType='slide'>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>Recharge Wallet</Text>
                  <Text style={styles.modalSubtitle}>{wallet.user_name}</Text>
                </View>
                <TouchableOpacity onPress={handleClose}>
                  <X size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.currentBalanceCard}>
                  <Text style={styles.currentBalanceLabel}>Current Balance</Text>
                  <Text style={styles.currentBalanceValue}>
                    {formatCurrency(wallet.balance)} {wallet.currency}
                  </Text>
                </View>

                <Text style={styles.modalLabel}>Select or enter amount ({wallet.currency})</Text>

                {/* Predefined amounts */}
                <View style={styles.amountGrid}>
                  {predefinedAmounts.map(value => (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.amountButton,
                        amount === value.toString() && styles.amountButtonActive,
                      ]}
                      onPress={() => handleAmountSelect(value)}
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
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Custom amount input */}
                <View style={styles.customAmountContainer}>
                  <Text style={styles.modalLabel}>Or enter custom amount</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder={`Enter amount (min. ${wallet.currency} 100)`}
                    keyboardType='numeric'
                    value={amount}
                    onChangeText={setAmount}
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                {/* Payment method info */}
                <View style={styles.paymentMethodInfo}>
                  <CreditCard size={20} color={colors.primary} />
                  <Text style={styles.paymentMethodText}>
                    Pay securely with MIB Payment Gateway
                  </Text>
                </View>

                {/* Action buttons */}
                <TouchableOpacity
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
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClose}
                  disabled={isProcessing}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {showMibPayment && rechargeId && (
          <MibPaymentWebView
            visible={showMibPayment}
            bookingDetails={{
              bookingNumber: `WLT-${rechargeId.slice(0, 8).toUpperCase()}`,
              route: `Wallet Recharge - ${wallet.user_name}`,
              travelDate: new Date().toISOString(),
              amount: parseFloat(amount),
              currency: wallet.currency || 'MVR',
              passengerCount: 1,
            }}
            bookingId={rechargeId}
            sessionData={mibSessionData}
            onClose={() => setShowMibPayment(false)}
            onSuccess={handlePaymentSuccess}
            onFailure={handlePaymentFailure}
            onCancel={handlePaymentCancel}
          />
        )}
      </>
    );
  }
);

WalletRechargeModal.displayName = 'WalletRechargeModal';

export default function WalletsListPage({
  agentOnly = false,
}: WalletsListPageProps) {
  const {
    filteredWallets,
    agentWallets,
    loading,
    formatCurrency,
    formatDate,
    canViewWallets,
    handleRefresh,
    walletStats,
    fetchWallets,
  } = useFinanceData();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'active' | 'inactive'
  >('all');
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);

  // Fetch wallets when page comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('📥 [WalletsListPage] Page focused, fetching fresh wallet data...');
      if (canViewWallets) {
        fetchWallets();
      }
    }, [canViewWallets, fetchWallets])
  );

  // Choose wallet list based on agentOnly prop
  const baseWallets = agentOnly ? agentWallets : filteredWallets;

  console.log('📊 [WalletsListPage] Data state:', {
    filteredWallets_count: filteredWallets?.length || 0,
    agentWallets_count: agentWallets?.length || 0,
    baseWallets_count: baseWallets?.length || 0,
    agentOnly,
    filterStatus,
    localSearchQuery,
    sample_wallets: baseWallets?.slice(0, 2).map(w => ({
      id: w.id,
      name: w.user_name,
      balance: w.balance,
    })),
  });

  // Client-side search and filter
  const displayWallets = useMemo(() => {
    console.log('🔍 [WalletsListPage] Calculating displayWallets from baseWallets:', baseWallets?.length || 0);
    
    let filtered = [...baseWallets];
    console.log('🔍 [WalletsListPage] Initial filtered count:', filtered.length);

    // Apply search filter
    if (localSearchQuery.trim()) {
      const query = localSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        wallet =>
          wallet.user_name.toLowerCase().includes(query) ||
          wallet.user_email.toLowerCase().includes(query)
      );
      console.log('🔍 [WalletsListPage] After search filter:', filtered.length);
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      const beforeFilter = filtered.length;
      if (filterStatus === 'active') {
        filtered = filtered.filter(w => w.balance > 0);
      } else if (filterStatus === 'inactive') {
        filtered = filtered.filter(w => w.balance === 0);
      }
      console.log(`🔍 [WalletsListPage] After status filter (${filterStatus}):`, filtered.length, 'from', beforeFilter);
    }

    console.log('✅ [WalletsListPage] Final displayWallets:', filtered.length, filtered.map(w => ({
      id: w.id,
      name: w.user_name,
      balance: w.balance,
    })));

    return filtered;
  }, [baseWallets, localSearchQuery, filterStatus]);

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      await handleRefresh();
    } catch (error) {
      console.error('Error refreshing wallets:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleWalletPress = (walletId: string) => {
    router.push(`/(app)/(admin)/wallet-detail?walletId=${walletId}` as any);
  };

  const handleRechargeWallet = (wallet: Wallet) => {
    setSelectedWallet(wallet);
    setShowRechargeModal(true);
  };

  const handleRechargeSuccess = () => {
    handleRefreshData();
  };

  const renderWallet = ({ item }: { item: Wallet }) => (
    <View style={styles.walletItemContainer}>
      <TouchableOpacity
        style={styles.walletItem}
        onPress={() => handleWalletPress(item.id)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.walletIcon,
            {
              backgroundColor: item.is_active
                ? colors.success + '15'
                : colors.danger + '15',
            },
          ]}
        >
          <WalletIcon
            size={24}
            color={item.is_active ? colors.success : colors.danger}
          />
        </View>
        <View style={styles.walletContent}>
          <View style={styles.walletHeader}>
            <View style={styles.walletUserInfo}>
              <Text style={styles.walletUser} numberOfLines={1}>
                {item.user_name}
              </Text>
              <Text style={styles.walletEmail} numberOfLines={1}>
                {item.user_email}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: item.is_active
                    ? colors.success + '15'
                    : colors.danger + '15',
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: item.is_active
                      ? colors.success
                      : colors.danger,
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: item.is_active ? colors.success : colors.danger },
                ]}
              >
                {item.is_active ? 'ACTIVE' : 'INACTIVE'}
              </Text>
            </View>
          </View>

          <View style={styles.walletFooter}>
            <View style={styles.balanceContainer}>
              <Text style={styles.balanceLabel}>Balance</Text>
              <Text style={styles.balanceValue}>
                {formatCurrency(item.balance)} {item.currency}
              </Text>
            </View>
            <Text style={styles.walletDate}>
              Updated {new Date(item.updated_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
      
      {/* Recharge Button */}
      <TouchableOpacity
        style={styles.rechargeButton}
        onPress={() => handleRechargeWallet(item)}
        activeOpacity={0.7}
      >
        <Plus size={18} color={colors.white} />
        <Text style={styles.rechargeButtonText}>Recharge</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <WalletIcon size={48} color={colors.textSecondary} />
      </View>
      <Text style={styles.emptyStateTitle}>No Wallets Found</Text>
      <Text style={styles.emptyStateText}>
        {localSearchQuery || filterStatus !== 'all'
          ? 'Try adjusting your filters or search terms'
          : agentOnly
            ? 'No agent wallets available yet'
            : 'No wallet records available yet'}
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Summary Stats */}
      {walletStats && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <DollarSign size={20} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>
              {formatCurrency(walletStats.totalBalance)}
            </Text>
            <Text style={styles.statLabel}>Total Balance</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <TrendingUp size={20} color={colors.success} />
            </View>
            <Text style={styles.statValue}>{walletStats.activeWallets}</Text>
            <Text style={styles.statLabel}>Active Wallets</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Users size={20} color={colors.info} />
            </View>
            <Text style={styles.statValue}>{walletStats.totalWallets}</Text>
            <Text style={styles.statLabel}>Total Wallets</Text>
          </View>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          placeholder='Search by name or email...'
          value={localSearchQuery}
          onChangeText={setLocalSearchQuery}
        />
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filterStatus === 'all' && styles.filterButtonActive,
          ]}
          onPress={() => setFilterStatus('all')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filterStatus === 'all' && styles.filterButtonTextActive,
            ]}
          >
            All ({baseWallets.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filterStatus === 'active' && styles.filterButtonActive,
          ]}
          onPress={() => setFilterStatus('active')}
        >
          <TrendingUp
            size={16}
            color={filterStatus === 'active' ? colors.white : colors.success}
          />
          <Text
            style={[
              styles.filterButtonText,
              filterStatus === 'active' && styles.filterButtonTextActive,
            ]}
          >
            Active ({walletStats?.activeWallets || 0})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filterStatus === 'inactive' && styles.filterButtonActive,
          ]}
          onPress={() => setFilterStatus('inactive')}
        >
          <TrendingDown
            size={16}
            color={filterStatus === 'inactive' ? colors.white : colors.danger}
          />
          <Text
            style={[
              styles.filterButtonText,
              filterStatus === 'inactive' && styles.filterButtonTextActive,
            ]}
          >
            Inactive ({walletStats?.inactiveWallets || 0})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>
          Showing {displayWallets.length} wallet
          {displayWallets.length !== 1 ? 's' : ''}
          {filterStatus !== 'all' && ` · ${filterStatus}`}
        </Text>
      </View>
    </View>
  );

  // Permission check
  if (!canViewWallets) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: agentOnly ? 'Agent Wallets' : 'All Wallets',
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <ArrowLeft size={24} color={colors.primary} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.noPermissionContainer}>
          <View style={styles.noPermissionIcon}>
            <AlertTriangle size={40} color={colors.warning} />
          </View>
          <Text style={styles.noPermissionTitle}>Access Denied</Text>
          <Text style={styles.noPermissionText}>
            You don't have permission to view wallet records.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: agentOnly ? 'Agent Wallets' : 'All Wallets',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <FlatList
        data={displayWallets}
        renderItem={renderWallet}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefreshData}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      />

      {/* Wallet Recharge Modal */}
      <WalletRechargeModal
        visible={showRechargeModal}
        onClose={() => {
          setShowRechargeModal(false);
          setSelectedWallet(null);
        }}
        onSuccess={handleRechargeSuccess}
        wallet={selectedWallet}
        formatCurrency={formatCurrency}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerContainer: {
    backgroundColor: colors.backgroundSecondary,
    paddingBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  resultsText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  walletItemContainer: {
    marginBottom: 12,
  },
  walletItem: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border + '40',
  },
  rechargeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.primary,
  },
  rechargeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  walletIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  walletContent: {
    flex: 1,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  walletUserInfo: {
    flex: 1,
  },
  walletUser: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  walletEmail: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  walletFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  balanceContainer: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  walletDate: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    gap: 16,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  noPermissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  noPermissionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.warning + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  noPermissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  noPermissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  modalBody: {
    padding: 20,
  },
  currentBalanceCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  currentBalanceLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
  },
  currentBalanceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
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
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  amountButtonActive: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  amountButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  amountButtonTextActive: {
    color: colors.primary,
  },
  customAmountContainer: {
    marginBottom: 20,
  },
  amountInput: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 10,
  },
  paymentMethodText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  proceedButton: {
    backgroundColor: colors.primary,
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
    color: colors.white,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
} as any);
