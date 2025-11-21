import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useFinanceData } from '@/hooks/useFinanceData';
import WalletDetailCard from '@/components/admin/finance/WalletDetailCard';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react-native';

export default function WalletDetailPage() {
  const { walletId } = useLocalSearchParams<{ walletId: string }>();
  const {
    getWalletById,
    getWalletTransactions,
    getAgentCreditTransactionsByAgent,
    fetchAgentCreditTransactions,
    fetchWalletTransactions,
    agentCreditTransactions,
    walletTransactions,
    formatCurrency,
    formatDate,
    loading,
    handleRefresh,
  } = useFinanceData();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const wallet = getWalletById(walletId);
  const isCreditAccount =
    wallet?.is_credit_account && wallet?.is_wallet === false;

  useEffect(() => {
    if (isCreditAccount) {
      // Fetch agent credit transactions if not already loaded
      if (!agentCreditTransactions || agentCreditTransactions.length === 0) {
        fetchAgentCreditTransactions().catch(error =>
          console.error('Error fetching agent credit transactions:', error)
        );
      }
      // Also fetch wallet transactions for manual payments
      if (!walletTransactions || walletTransactions.length === 0) {
        fetchWalletTransactions().catch(error =>
          console.error('Error fetching wallet transactions:', error)
        );
      }
    }
  }, [
    isCreditAccount,
    agentCreditTransactions,
    walletTransactions,
    fetchAgentCreditTransactions,
    fetchWalletTransactions,
  ]);

  // Map agent credit transactions to WalletTransaction format
  const creditTransactions = useMemo(() => {
    if (!wallet || !isCreditAccount) return [];
    const transactions = getAgentCreditTransactionsByAgent(wallet.user_id);

    // Debug logging to track transaction data
    if (transactions.length > 0) {
    } else {
    }

    return transactions
      .filter(tx => {
        // Defensive check: ensure transaction has required fields
        if (!tx || !tx.id) {
          console.warn('[wallet-detail] Invalid transaction found:', tx);
          return false;
        }
        return true;
      })
      .map(tx => {
        // Explicitly handle transaction types: 'refill' = credit, 'deduction' = debit
        const rawTransactionType = tx.transaction_type;
        let transactionType: 'credit' | 'debit';

        if (rawTransactionType === 'refill') {
          transactionType = 'credit';
        } else if (rawTransactionType === 'deduction') {
          transactionType = 'debit';
        } else {
          // Fallback: if transaction_type is not recognized, default based on amount or type
          console.warn('[wallet-detail] Unknown transaction_type:', {
            transactionId: tx.id,
            transactionType: rawTransactionType,
            defaultingTo: 'debit',
          });
          transactionType = 'debit';
        }

        // Handle amount conversion - amount can be string (e.g., "-12.00") or number
        let amountValue: number;
        if (typeof tx.amount === 'string') {
          // Parse string amount (handles negative values like "-12.00")
          const parsed = parseFloat(tx.amount);
          amountValue = isNaN(parsed) ? 0 : Math.abs(parsed);
        } else if (typeof tx.amount === 'number') {
          amountValue = Math.abs(tx.amount);
        } else {
          console.warn('[wallet-detail] Invalid amount type:', {
            transactionId: tx.id,
            amount: tx.amount,
            amountType: typeof tx.amount,
          });
          amountValue = 0;
        }

        const mappedTransaction = {
          id: tx.id,
          wallet_id: wallet.id,
          user_id: wallet.user_id,
          user_name: wallet.user_name,
          amount: amountValue,
          transaction_type: transactionType,
          status: 'completed' as const,
          description:
            tx.description ||
            `${rawTransactionType || 'transaction'} transaction`,
          reference_id: tx.booking_id || undefined,
          created_at:
            tx.created_at || tx.transaction_date || new Date().toISOString(),
        };

        // Log each mapped transaction for debugging
        // console.log('[wallet-detail] Mapped transaction:', {
        //   original: {
        //     id: tx.id,
        //     transaction_type: rawTransactionType,
        //     amount: tx.amount,
        //     amountType: typeof tx.amount,
        //   },
        //   mapped: {
        //     id: mappedTransaction.id,
        //     transaction_type: mappedTransaction.transaction_type,
        //     amount: mappedTransaction.amount,
        //   },
        // });

        return mappedTransaction;
      });
  }, [
    getAgentCreditTransactionsByAgent,
    isCreditAccount,
    wallet,
    agentCreditTransactions,
  ]);

  // Merge and sort all transactions for credit accounts
  const allTransactions = useMemo(() => {
    if (isCreditAccount) {
      // Sort by created_at descending (most recent first)
      const sorted = [...creditTransactions].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });

      return sorted;
    }
    return getWalletTransactions(walletId);
  }, [isCreditAccount, creditTransactions, getWalletTransactions, walletId]);

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      // Refresh all relevant data
      await handleRefresh();

      // For credit accounts, ensure both transaction types are refreshed
      if (isCreditAccount) {
        await Promise.all([
          fetchAgentCreditTransactions(),
          fetchWalletTransactions(),
        ]);
      }
    } catch (error) {
      console.error('Error refreshing wallet:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loading.wallets && !wallet) {
    return (
      <View style={styles.container}>
        {/* <Stack.Screen
          options={{
            title: 'Wallet Details',
          }}
        /> */}
        <View style={styles.loadingContainer}>
          <RefreshCw size={48} color={colors.primary} />
          <Text style={styles.loadingText}>Loading wallet details...</Text>
        </View>
      </View>
    );
  }

  if (!wallet) {
    return (
      <View style={styles.container}>
        {/* <Stack.Screen
          options={{
            title: 'Wallet Not Found',
          }}
        /> */}
        <View style={styles.notFoundContainer}>
          <View style={styles.notFoundIcon}>
            <AlertCircle size={40} color={colors.warning} />
          </View>
          <Text style={styles.notFoundTitle}>Wallet Not Found</Text>
          <Text style={styles.notFoundText}>
            The wallet you're looking for doesn't exist or has been removed.
          </Text>
          <Pressable
            style={styles.backToListButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color={colors.primary} />
            <Text style={styles.backToListText}>Back to Wallets</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* <Stack.Screen
        options={{
          title: 'Wallet Details',
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      /> */}

      <WalletDetailCard
        wallet={wallet}
        transactions={allTransactions}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        onRefresh={handleRefreshData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  notFoundIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.warning + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  notFoundText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
  },
  backToListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
  },
  backToListText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
} as any);
