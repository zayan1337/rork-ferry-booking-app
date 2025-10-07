import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useFinanceStore } from '@/store/admin/financeStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { WalletTransaction } from '@/types/admin/finance';
import {
  Eye,
  AlertTriangle,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react-native';

// Components
import SectionHeader from '@/components/admin/SectionHeader';
import SearchBar from '@/components/admin/SearchBar';
import LoadingSpinner from '@/components/admin/LoadingSpinner';

interface TransactionsTabProps {
  isActive: boolean;
  searchQuery?: string;
}

export default function TransactionsTab({
  isActive,
  searchQuery = '',
}: TransactionsTabProps) {
  const { canViewWallets } = useAdminPermissions();
  const {
    walletTransactions,
    loading,
    fetchWalletTransactions,
    setSearchQuery,
    searchQueries,
  } = useFinanceStore();

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize transactions data when tab becomes active
  useEffect(() => {
    if (
      isActive &&
      canViewWallets() &&
      (!walletTransactions || walletTransactions.length === 0)
    ) {
      fetchWalletTransactions();
    }
  }, [isActive, walletTransactions?.length]);

  // Filter transactions based on search query
  const filteredTransactions = useMemo(() => {
    if (!walletTransactions) return [];

    let filtered = walletTransactions;
    const query = searchQuery || searchQueries.transactions || '';

    if (query) {
      filtered = walletTransactions.filter(
        transaction =>
          transaction.user_name.toLowerCase().includes(query.toLowerCase()) ||
          (transaction.description &&
            transaction.description.toLowerCase().includes(query.toLowerCase()))
      );
    }

    return filtered;
  }, [walletTransactions, searchQuery, searchQueries.transactions]);

  // Limit transactions to 4 for display
  const displayTransactions = useMemo(() => {
    return filteredTransactions.slice(0, 4);
  }, [filteredTransactions]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchWalletTransactions(true);
    } catch (error) {
      console.error('Error refreshing transactions:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTransactionPress = (transactionId: string) => {
    if (canViewWallets()) {
      router.push(
        `/(app)/(admin)/transaction-detail?transactionId=${transactionId}` as any
      );
    }
  };

  const handleViewAllTransactions = () => {
    router.push('/(app)/(admin)/transactions' as any);
  };

  // Permission check
  if (!canViewWallets()) {
    return (
      <View style={styles.noPermissionContainer}>
        <AlertTriangle size={48} color={colors.warning} />
        <Text style={styles.noPermissionText}>
          You don't have permission to view transactions.
        </Text>
      </View>
    );
  }

  // Loading state - only show loading if we're actively loading and haven't received any data yet
  if (loading.transactions && walletTransactions === undefined) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderContent}>
          <SectionHeader
            title='Transaction History'
            subtitle={`${walletTransactions?.length || 0} total transactions`}
          />
        </View>
      </View>

      {/* Search Bar */}
      <SearchBar
        placeholder='Search transactions...'
        value={searchQuery || searchQueries.transactions || ''}
        onChangeText={text => setSearchQuery('transactions', text)}
      />

      {/* Transactions List */}
      <View style={styles.itemsList}>
        {displayTransactions.length > 0 ? (
          displayTransactions.map(
            (transaction: WalletTransaction, index: number) => (
              <TouchableOpacity
                key={`transaction-${transaction.id}-${index}`}
                style={styles.transactionItem}
                onPress={() => handleTransactionPress(transaction.id)}
              >
                <View style={styles.transactionIcon}>
                  {transaction.transaction_type === 'credit' ? (
                    <ArrowUpRight size={20} color={colors.success} />
                  ) : (
                    <ArrowDownLeft size={20} color={colors.danger} />
                  )}
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionUser}>
                    {transaction.user_name}
                  </Text>
                  <Text style={styles.transactionDescription}>
                    {transaction.description ||
                      `${transaction.transaction_type} transaction`}
                  </Text>
                  <Text
                    style={[
                      styles.transactionAmount,
                      {
                        color:
                          transaction.transaction_type === 'credit'
                            ? colors.success
                            : colors.danger,
                      },
                    ]}
                  >
                    {transaction.transaction_type === 'credit' ? '+' : '-'}MVR{' '}
                    {transaction.amount.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.transactionStatus}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          transaction.transaction_type === 'credit'
                            ? colors.success + '15'
                            : colors.danger + '15',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            transaction.transaction_type === 'credit'
                              ? colors.success
                              : colors.danger,
                        },
                      ]}
                    >
                      {transaction.transaction_type.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )
          )
        ) : (
          <View style={styles.emptyState}>
            <Activity size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>No transactions found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery || searchQueries.transactions
                ? 'Try adjusting your search terms'
                : 'No transactions available'}
            </Text>
          </View>
        )}
      </View>

      {/* View All Button */}
      <TouchableOpacity
        style={styles.viewAllButton}
        onPress={handleViewAllTransactions}
      >
        <Text style={styles.viewAllText}>View All Transactions</Text>
        <Eye size={16} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    minHeight: 44,
    paddingHorizontal: 4,
  },
  sectionHeaderContent: {
    flex: 1,
    paddingRight: 8,
  },
  sectionHeaderButton: {
    flexShrink: 0,
    maxWidth: '40%',
  },
  itemsList: {
    gap: 12,
    marginTop: 16,
  },
  transactionItem: {
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
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionUser: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  transactionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  transactionStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '10',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  noPermissionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  noPermissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
} as any);
