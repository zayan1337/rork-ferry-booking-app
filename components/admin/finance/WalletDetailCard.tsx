import React, { memo, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useAlertContext } from '@/components/AlertProvider';
import type { Wallet, WalletTransaction } from '@/types/admin/finance';
import { updateAgentCreditLimit } from '@/utils/admin/financeService';
import { supabase } from '@/utils/supabase';
import {
  Wallet as WalletIcon,
  User,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  BarChart3,
  CreditCard,
  Edit,
  X,
  Check,
} from 'lucide-react-native';

interface WalletDetailCardProps {
  wallet: Wallet;
  transactions: WalletTransaction[];
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
  onRefresh?: () => Promise<void>;
}

function WalletDetailCard({
  wallet,
  transactions,
  formatCurrency,
  formatDate,
  onRefresh,
}: WalletDetailCardProps) {
  const { showError, showSuccess, showConfirmation, showInfo } =
    useAlertContext();
  const [isEditingCreditLimit, setIsEditingCreditLimit] = useState(false);
  const [newCreditLimit, setNewCreditLimit] = useState(
    wallet.credit_ceiling?.toString() || '0'
  );
  const [isUpdating, setIsUpdating] = useState(false);

  const isAgent = wallet.user_role === 'agent';
  const isCreditAccount = !!wallet.credit_ceiling || !!wallet.is_credit_account;
  const isCreditOnlyAccount =
    wallet.is_credit_account && wallet.is_wallet === false;
  const primaryBalanceLabel = isCreditOnlyAccount
    ? 'Available Credit'
    : 'Wallet Balance';
  const primaryBalanceValue = isCreditOnlyAccount
    ? (wallet.credit_balance ?? wallet.balance)
    : wallet.balance;
  const canShowGatewayPayment =
    wallet.balance_to_pay !== undefined && wallet.balance_to_pay > 0;
  const [manualPaymentAmount, setManualPaymentAmount] = useState('');
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [isManualPaymentProcessing, setIsManualPaymentProcessing] =
    useState(false);

  // Calculate transaction statistics
  const transactionStats = useMemo(() => {
    // Defensive check: ensure transactions is an array
    if (!transactions || !Array.isArray(transactions)) {
      console.warn('[WalletDetailCard] Invalid transactions array:', transactions);
      return {
        totalCredits: 0,
        totalDebits: 0,
        creditCount: 0,
        debitCount: 0,
        netFlow: 0,
        transactionCount: 0,
      };
    }

    // Filter and validate transactions
    const credits = transactions.filter(
      t => t && t.transaction_type === 'credit' && typeof t.amount === 'number'
    );
    const debits = transactions.filter(
      t => t && t.transaction_type === 'debit' && typeof t.amount === 'number'
    );

    // Calculate totals with defensive checks
    const totalCredits = credits.reduce((sum, t) => {
      const amount = Number(t.amount) || 0;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    const totalDebits = debits.reduce((sum, t) => {
      const amount = Number(t.amount) || 0;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    // Log for debugging if transactions exist but stats are zero
    if (transactions.length > 0 && totalCredits === 0 && totalDebits === 0) {
      // console.log('[WalletDetailCard] Transactions found but stats are zero:', {
      //   transactionCount: transactions.length,
      //   sampleTransactions: transactions.slice(0, 3).map(t => ({
      //     id: t.id,
      //     type: t.transaction_type,
      //     amount: t.amount,
      //     amountType: typeof t.amount,
      //   })),
      // });
    }

    return {
      totalCredits,
      totalDebits,
      creditCount: credits.length,
      debitCount: debits.length,
      netFlow: totalCredits - totalDebits,
      transactionCount: transactions.length,
    };
  }, [transactions]);

  const handleGoBack = () => {
    router.back();
  };

  const handleViewUser = () => {
    router.push(`/(app)/(admin)/user/${wallet.user_id}` as any);
  };

  const handleEditCreditLimit = () => {
    setNewCreditLimit(wallet.credit_ceiling?.toString() || '0');
    setIsEditingCreditLimit(true);
  };

  const handleSaveCreditLimit = async () => {
    const limitValue = parseFloat(newCreditLimit);

    if (isNaN(limitValue) || limitValue < 0) {
      showError('Invalid Input', 'Please enter a valid credit limit amount.');
      return;
    }

    setIsUpdating(true);
    try {
      await updateAgentCreditLimit(wallet.user_id, limitValue);
      showSuccess(
        'Success',
        'Agent credit limit updated successfully!',
        async () => {
          setIsEditingCreditLimit(false);
          if (onRefresh) {
            await onRefresh();
          }
        }
      );
    } catch (error) {
      console.error('Error updating credit limit:', error);
      showError('Error', 'Failed to update credit limit. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingCreditLimit(false);
    setNewCreditLimit(wallet.credit_ceiling?.toString() || '0');
  };

  const handlePayViaGateway = () => {
    const amountDue = wallet.balance_to_pay || 0;
    if (amountDue <= 0) {
      showInfo('No Outstanding Balance', 'There is no balance due to pay.');
      return;
    }

    const paymentAccountType =
      wallet.is_credit_account || wallet.credit_ceiling !== undefined
        ? 'credit'
        : 'wallet';

    showConfirmation(
      'Pay via Gateway',
      `Pay ${formatCurrency(amountDue)} through MIB payment gateway?`,
      () => {
        router.push({
          pathname: '/(app)/(admin)/wallet-payment' as any,
          params: {
            walletId: wallet.id,
            userId: wallet.user_id,
            amount: amountDue,
            paymentType:
              paymentAccountType === 'credit'
                ? 'credit_repayment'
                : 'wallet_repayment',
            accountType: paymentAccountType,
          },
        });
      }
    );
  };

  const handleManualPayment = () => {
    setManualPaymentAmount('');
    setManualModalVisible(true);
  };

  const handleSubmitManualPayment = async () => {
    const amount = parseFloat(manualPaymentAmount || '0');

    if (isNaN(amount) || amount <= 0) {
      showError('Invalid Amount', 'Please enter a valid payment amount.');
      return;
    }

    if (amount > (wallet.balance_to_pay || 0)) {
      showError(
        'Amount Too High',
        `Payment amount cannot exceed the balance to pay (${formatCurrency(
          wallet.balance_to_pay || 0
        )}).`
      );
      return;
    }

    try {
      setIsManualPaymentProcessing(true);
      // Record the manual payment
      const { error } = await supabase.rpc('record_agent_credit_payment', {
        p_user_id: wallet.user_id,
        p_payment_amount: amount,
        p_payment_method: 'manual',
        p_reference: `MANUAL-${Date.now()}`,
      });

      if (error) throw error;

      setManualModalVisible(false);
      setManualPaymentAmount('');

      if (onRefresh) {
        await onRefresh();
      }

      showSuccess(
        'Payment Recorded',
        `Successfully recorded payment of ${formatCurrency(amount)}`
      );
    } catch (error) {
      console.error('Error recording manual payment:', error);
      showError('Error', 'Failed to record payment. Please try again.');
    } finally {
      setIsManualPaymentProcessing(false);
    }
  };

  const handleCancelManualPayment = () => {
    if (isManualPaymentProcessing) return;
    setManualModalVisible(false);
  };

  const renderTransaction = ({ item }: { item: WalletTransaction }) => {
    // Defensive check: ensure item is valid
    if (!item || !item.id) {
      console.warn('[WalletDetailCard] Invalid transaction item:', item);
      return null;
    }

    // Determine transaction type with fallback
    const isCredit = item.transaction_type === 'credit';
    const isDebit = item.transaction_type === 'debit';
    
    // If transaction type is not recognized, log warning but still render
    if (!isCredit && !isDebit) {
      console.warn('[WalletDetailCard] Unknown transaction type:', {
        transactionId: item.id,
        transactionType: item.transaction_type,
        defaultingToDebit: true,
      });
    }

    const displayType = isCredit ? 'credit' : 'debit';
    const amount = typeof item.amount === 'number' ? item.amount : Number(item.amount) || 0;

    return (
      <View style={styles.transactionItem}>
        <View style={styles.transactionIcon}>
          {isCredit ? (
            <TrendingUp size={20} color={colors.success} />
          ) : (
            <TrendingDown size={20} color={colors.danger} />
          )}
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription}>
            {item.description || `${displayType} Transaction`}
          </Text>
          <Text style={styles.transactionDate}>
            {formatDate(item.created_at)}
          </Text>
          {item.reference_id && (
            <Text style={styles.transactionReference}>
              Ref: {item.reference_id}
            </Text>
          )}
        </View>
        <View style={styles.transactionAmount}>
          <Text
            style={[
              styles.transactionAmountText,
              {
                color: isCredit ? colors.success : colors.danger,
              },
            ]}
          >
            {isCredit ? '+' : '-'}
            {formatCurrency(amount)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <WalletIcon size={32} color={colors.primary} />
        <Text style={styles.balanceLabel}>{primaryBalanceLabel}</Text>
        <Text style={styles.balanceValue}>
          {formatCurrency(primaryBalanceValue)}
        </Text>
        <Text style={styles.currency}>{wallet.currency}</Text>
      </View>

      {/* Agent Credit Information */}
      {isAgent && wallet.credit_ceiling !== undefined && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CreditCard size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Agent Credit Information</Text>
            <Pressable
              onPress={handleEditCreditLimit}
              style={styles.editButton}
            >
              <Edit size={18} color={colors.primary} />
            </Pressable>
          </View>

          <View style={styles.creditInfoCard}>
            {/* Credit Limit */}
            <View style={styles.creditInfoRow}>
              <Text style={styles.creditInfoLabel}>Credit Limit</Text>
              <Text style={styles.creditInfoValue}>
                {formatCurrency(wallet.credit_ceiling)}
              </Text>
            </View>

            {/* Available Credit */}
            <View style={styles.creditInfoRow}>
              <Text style={styles.creditInfoLabel}>Available Credit</Text>
              <Text style={[styles.creditInfoValue, { color: colors.success }]}>
                {formatCurrency(wallet.credit_balance || 0)}
              </Text>
            </View>

            {/* Credit Used */}
            <View style={styles.creditInfoRow}>
              <Text style={styles.creditInfoLabel}>Credit Used</Text>
              <Text style={[styles.creditInfoValue, { color: colors.warning }]}>
                {formatCurrency(wallet.credit_used || 0)}
              </Text>
            </View>

            {/* Balance to Pay */}
            <View style={[styles.creditInfoRow, styles.creditInfoHighlight]}>
              <Text style={[styles.creditInfoLabel, { fontWeight: '700' }]}>
                Balance to Pay
              </Text>
              <Text
                style={[
                  styles.creditInfoValue,
                  { color: colors.danger, fontWeight: '700', fontSize: 18 },
                ]}
              >
                {formatCurrency(wallet.balance_to_pay || 0)}
              </Text>
            </View>

            {/* Credit Utilization Bar */}
            <View style={styles.creditUtilizationContainer}>
              <Text style={styles.creditUtilizationLabel}>
                Credit Utilization
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(
                        ((wallet.credit_used || 0) / wallet.credit_ceiling) *
                          100,
                        100
                      )}%`,
                      backgroundColor:
                        (wallet.credit_used || 0) / wallet.credit_ceiling > 0.8
                          ? colors.danger
                          : (wallet.credit_used || 0) / wallet.credit_ceiling >
                              0.6
                            ? colors.warning
                            : colors.success,
                    },
                  ]}
                />
              </View>
              <Text style={styles.creditUtilizationText}>
                {(
                  ((wallet.credit_used || 0) / wallet.credit_ceiling) *
                  100
                ).toFixed(1)}
                % Used
              </Text>
            </View>

            {/* Payment Options - Only show if there's a balance to pay */}
            {wallet.balance_to_pay && wallet.balance_to_pay > 0 && (
              <View style={styles.paymentOptionsContainer}>
                <Text style={styles.paymentOptionsTitle}>Pay Balance</Text>
                <View style={styles.paymentButtons}>
                  {/* {canShowGatewayPayment && (
                    <Pressable
                      style={[
                        styles.paymentButton,
                        styles.gatewayPaymentButton,
                      ]}
                      onPress={handlePayViaGateway}
                    >
                      <CreditCard size={20} color={colors.white} />
                      <Text style={styles.paymentButtonText}>
                        Pay via Gateway
                      </Text>
                    </Pressable>
                  )} */}
                  <Pressable
                    style={[styles.paymentButton, styles.manualPaymentButton]}
                    onPress={handleManualPayment}
                  >
                    <DollarSign size={20} color={colors.primary} />
                    <Text
                      style={[
                        styles.paymentButtonText,
                        { color: colors.primary },
                      ]}
                    >
                      Manual Payment
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {/* User Information */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <User size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>User Information</Text>
        </View>
        <Pressable style={styles.infoCard} onPress={handleViewUser}>
          <InfoRow label='Full Name' value={wallet.user_name} />
          <InfoRow label='Email' value={wallet.user_email} />
          <InfoRow label='User ID' value={wallet.user_id} />
          <View style={styles.viewUserButton}>
            <Text style={styles.viewUserText}>View User Profile</Text>
            <ArrowLeft
              size={16}
              color={colors.primary}
              style={{ transform: [{ rotate: '180deg' }] }}
            />
          </View>
        </Pressable>
      </View>

      {/* Transaction Statistics */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <BarChart3 size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Transaction Statistics</Text>
        </View>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.successCard]}>
            <TrendingUp size={24} color={colors.success} />
            <Text style={styles.statLabel}>Total Credits</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {formatCurrency(transactionStats.totalCredits)}
            </Text>
            <Text style={styles.statCount}>
              {transactionStats.creditCount} transactions
            </Text>
          </View>
          <View style={[styles.statCard, styles.dangerCard]}>
            <TrendingDown size={24} color={colors.danger} />
            <Text style={styles.statLabel}>Total Debits</Text>
            <Text style={[styles.statValue, { color: colors.danger }]}>
              {formatCurrency(transactionStats.totalDebits)}
            </Text>
            <Text style={styles.statCount}>
              {transactionStats.debitCount} transactions
            </Text>
          </View>
        </View>
        <View style={styles.netFlowCard}>
          <Activity size={20} color={colors.primary} />
          <View style={styles.netFlowInfo}>
            <Text style={styles.netFlowLabel}>Net Flow</Text>
            <Text
              style={[
                styles.netFlowValue,
                {
                  color:
                    transactionStats.netFlow >= 0
                      ? colors.success
                      : colors.danger,
                },
              ]}
            >
              {transactionStats.netFlow >= 0 ? '+' : ''}
              {formatCurrency(Math.abs(transactionStats.netFlow))}
            </Text>
          </View>
        </View>
      </View>

      {/* Recent Transactions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Activity size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>
            Recent Transactions ({transactionStats.transactionCount})
          </Text>
        </View>
        {transactions.length > 0 ? (
          <FlatList
            data={transactions.slice(0, 10)}
            renderItem={renderTransaction}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            style={styles.transactionList}
          />
        ) : (
          <View style={styles.emptyState}>
            <Activity size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>No transactions yet</Text>
          </View>
        )}
      </View>

      {/* Wallet Information */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <DollarSign size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Wallet Information</Text>
        </View>
        <View style={styles.infoCard}>
          <InfoRow label='Wallet ID' value={wallet.id} />
          <InfoRow
            label='User Role'
            value={wallet.user_role?.toUpperCase() || 'N/A'}
          />
          <InfoRow label='Currency' value={wallet.currency} />
          <InfoRow
            label='Status'
            value={wallet.is_active ? 'Active' : 'Inactive'}
          />
          <InfoRow label='Created At' value={formatDate(wallet.created_at)} />
          <InfoRow label='Last Updated' value={formatDate(wallet.updated_at)} />
        </View>
      </View>

      {/* Edit Credit Limit Modal */}
      <Modal
        visible={isEditingCreditLimit}
        transparent
        animationType='fade'
        onRequestClose={handleCancelEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Credit Limit</Text>
              <Pressable onPress={handleCancelEdit}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>
                New Credit Limit ({wallet.currency})
              </Text>
              <TextInput
                style={styles.modalInput}
                value={newCreditLimit}
                onChangeText={setNewCreditLimit}
                keyboardType='numeric'
                placeholder='Enter credit limit'
                editable={!isUpdating}
              />

              <View style={styles.currentLimitInfo}>
                <Text style={styles.currentLimitLabel}>Current Limit:</Text>
                <Text style={styles.currentLimitValue}>
                  {formatCurrency(wallet.credit_ceiling || 0)}
                </Text>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={handleCancelEdit}
                disabled={isUpdating}
              >
                <X size={18} color={colors.textSecondary} />
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.modalButton,
                  styles.modalSaveButton,
                  isUpdating && styles.modalButtonDisabled,
                ]}
                onPress={handleSaveCreditLimit}
                disabled={isUpdating}
              >
                <Check size={18} color={colors.white} />
                <Text style={styles.modalSaveText}>
                  {isUpdating ? 'Saving...' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={manualModalVisible}
        transparent
        animationType='fade'
        onRequestClose={handleCancelManualPayment}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manual Payment</Text>
              <Pressable
                onPress={handleCancelManualPayment}
                disabled={isManualPaymentProcessing}
                style={styles.modalCloseButton}
              >
                <X
                  size={20}
                  color={
                    isManualPaymentProcessing
                      ? colors.textSecondary
                      : colors.text
                  }
                />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.manualBalanceSummary}>
                <Text style={styles.manualBalanceLabel}>Balance to Pay</Text>
                <Text style={styles.manualBalanceValue}>
                  {formatCurrency(wallet.balance_to_pay || 0)}
                </Text>
              </View>

              <Text style={styles.modalLabel}>
                Payment Amount ({wallet.currency})
              </Text>
              <TextInput
                style={[styles.modalInput, styles.manualAmountInput]}
                placeholder='Enter payment amount'
                keyboardType='decimal-pad'
                value={manualPaymentAmount}
                onChangeText={setManualPaymentAmount}
                editable={!isManualPaymentProcessing}
              />
              <Text style={styles.manualHelperText}>
                Add the exact amount received from the agent.
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={handleCancelManualPayment}
                disabled={isManualPaymentProcessing}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalButton,
                  styles.modalConfirmButton,
                  isManualPaymentProcessing && styles.modalButtonDisabled,
                ]}
                onPress={handleSubmitManualPayment}
                disabled={isManualPaymentProcessing}
              >
                <View style={styles.modalButtonContent}>
                  {isManualPaymentProcessing && (
                    <ActivityIndicator size='small' color={colors.white} />
                  )}
                  <Text style={styles.modalConfirmText}>
                    {isManualPaymentProcessing ? 'Payment processing...' : 'Manual Payment'}
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
      {isManualPaymentProcessing && (
        <View style={styles.globalLoadingOverlay}>
          <View style={styles.globalLoadingContent}>
            <ActivityIndicator size='large' color={colors.primary} />
            <Text style={styles.globalLoadingText}>Payment processing...</Text>
          </View>
        </View>
      )}
    </>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  balanceCard: {
    backgroundColor: colors.primary + '15',
    padding: 24,
    margin: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  balanceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  currency: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  section: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.primary + '15',
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
  viewUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  viewUserText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  successCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  dangerCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statCount: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  netFlowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  netFlowInfo: {
    flex: 1,
    marginLeft: 12,
  },
  netFlowLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  netFlowValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  transactionList: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  transactionReference: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  creditInfoCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  creditInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  creditInfoHighlight: {
    backgroundColor: colors.danger + '10',
    paddingHorizontal: 12,
    marginHorizontal: -12,
    borderRadius: 8,
    borderBottomWidth: 0,
    marginTop: 8,
  },
  creditInfoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  creditInfoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  creditUtilizationContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  creditUtilizationLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  progressBar: {
    height: 12,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  creditUtilizationText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: 'right',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currentLimitInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
  },
  currentLimitLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  currentLimitValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  modalCancelButton: {
    backgroundColor: colors.backgroundSecondary,
  },
  modalSaveButton: {
    backgroundColor: colors.primary,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  modalButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 8,
  },
  manualBalanceSummary: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  manualBalanceLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
  },
  manualBalanceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.danger,
  },
  manualAmountInput: {
    marginTop: 8,
    marginBottom: 12,
  },
  manualHelperText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  globalLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  globalLoadingContent: {
    backgroundColor: colors.card,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  globalLoadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },

  // Payment Options Styles
  paymentOptionsContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  paymentOptionsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  paymentButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  gatewayPaymentButton: {
    backgroundColor: colors.primary,
  },
  manualPaymentButton: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  paymentButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
} as any);

export default memo(WalletDetailCard);
