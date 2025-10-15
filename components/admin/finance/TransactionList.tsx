import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Download,
  TrendingUp,
  TrendingDown,
  CreditCard,
} from 'lucide-react-native';
import { colors } from '@/constants/adminColors';
import { WalletTransaction, Payment } from '@/types/admin/finance';

interface TransactionListProps {
  transactions: WalletTransaction[];
  payments: Payment[];
  totalRevenue: number;
  onTransactionPress: (transaction: WalletTransaction) => void;
  onPaymentPress: (payment: Payment) => void;
  onRefresh: () => void;
  loading: boolean;
  isTablet?: boolean;
}

export default function TransactionList({
  transactions,
  payments,
  totalRevenue,
  onTransactionPress,
  onPaymentPress,
  onRefresh,
  loading,
  isTablet = false,
}: TransactionListProps) {
  const [activeTab, setActiveTab] = useState<
    'all' | 'transactions' | 'payments'
  >('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Calculate statistics
  const totalTransactions = transactions.length;
  const totalPayments = payments.length;
  const totalCredits = transactions
    .filter(t => t.transaction_type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalDebits = transactions
    .filter(t => t.transaction_type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);
  const netRevenue = totalCredits - totalDebits;

  // Combine and sort data
  const combinedData = [
    ...transactions.map(t => ({ ...t, type: 'transaction' as const })),
    ...payments.map(p => ({ ...p, type: 'payment' as const })),
  ].sort((a, b) => {
    const aDate = new Date(a.created_at).getTime();
    const bDate = new Date(b.created_at).getTime();

    if (sortBy === 'date') {
      return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
    } else if (sortBy === 'amount') {
      const aAmount = 'amount' in a ? a.amount : 0;
      const bAmount = 'amount' in b ? b.amount : 0;
      return sortOrder === 'asc' ? aAmount - bAmount : bAmount - aAmount;
    }
    return 0;
  });

  const filteredData =
    activeTab === 'all'
      ? combinedData
      : activeTab === 'transactions'
        ? combinedData.filter(item => item.type === 'transaction')
        : combinedData.filter(item => item.type === 'payment');

  const renderTransactionItem = (item: any, index: number) => {
    if (item.type === 'transaction') {
      return (
        <Pressable
          key={`transaction-${item.id}`}
          style={styles.transactionItem}
          onPress={() => onTransactionPress(item)}
        >
          <View style={styles.transactionHeader}>
            <View style={styles.transactionIconContainer}>
              <View
                style={[
                  styles.transactionIcon,
                  item.transaction_type === 'credit'
                    ? styles.creditIcon
                    : styles.debitIcon,
                ]}
              >
                {item.transaction_type === 'credit' ? (
                  <ArrowUpRight size={16} color={colors.success} />
                ) : (
                  <ArrowDownLeft size={16} color={colors.danger} />
                )}
              </View>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionUser}>{item.user_name}</Text>
                <Text style={styles.transactionDescription}>
                  {item.description || `${item.transaction_type} transaction`}
                </Text>
                <View style={styles.transactionMeta}>
                  <Clock size={12} color={colors.textSecondary} />
                  <Text style={styles.transactionDate}>
                    {new Date(item.created_at).toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.transactionAmountContainer}>
              <Text
                style={[
                  styles.transactionAmount,
                  item.transaction_type === 'credit'
                    ? styles.creditAmount
                    : styles.debitAmount,
                ]}
              >
                {item.transaction_type === 'credit' ? '+' : '-'}MVR{' '}
                {item.amount.toFixed(2)}
              </Text>
              <Text style={styles.transactionType}>
                {item.transaction_type.toUpperCase()}
              </Text>
            </View>
          </View>
        </Pressable>
      );
    } else {
      return (
        <Pressable
          key={`payment-${item.id}`}
          style={styles.paymentItem}
          onPress={() => onPaymentPress(item)}
        >
          <View style={styles.paymentHeader}>
            <View style={styles.paymentIconContainer}>
              <View
                style={[
                  styles.paymentIcon,
                  { backgroundColor: `${colors.primary}20` },
                ]}
              >
                <CreditCard size={16} color={colors.primary} />
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentUser}>
                  {item.booking?.user_name || 'Unknown User'}
                </Text>
                <Text style={styles.paymentDescription}>
                  Payment via {item.payment_method}
                </Text>
                <View style={styles.paymentMeta}>
                  <Clock size={12} color={colors.textSecondary} />
                  <Text style={styles.paymentDate}>
                    {new Date(item.created_at).toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.paymentAmountContainer}>
              <Text style={styles.paymentAmount}>
                MVR {item.amount.toFixed(2)}
              </Text>
              <View
                style={[
                  styles.paymentStatus,
                  item.status === 'completed'
                    ? styles.statusCompleted
                    : item.status === 'pending'
                      ? styles.statusPending
                      : styles.statusFailed,
                ]}
              >
                <Text
                  style={[
                    styles.paymentStatusText,
                    item.status === 'completed'
                      ? styles.statusCompletedText
                      : item.status === 'pending'
                        ? styles.statusPendingText
                        : styles.statusFailedText,
                  ]}
                >
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        </Pressable>
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Revenue Summary */}
      <View style={styles.revenueSummary}>
        <View style={styles.revenueHeader}>
          <Text style={styles.revenueTitle}>Revenue Overview</Text>
          <Pressable style={styles.refreshButton} onPress={onRefresh}>
            <Download size={16} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.revenueStats}>
          <View style={styles.revenueStatItem}>
            <Text style={styles.revenueStatValue}>
              MVR {totalRevenue.toFixed(2)}
            </Text>
            <Text style={styles.revenueStatLabel}>Total Revenue</Text>
          </View>
          <View style={styles.revenueStatItem}>
            <Text style={styles.revenueStatValue}>
              MVR {netRevenue.toFixed(2)}
            </Text>
            <Text style={styles.revenueStatLabel}>Net Revenue</Text>
          </View>
          <View style={styles.revenueStatItem}>
            <Text style={styles.revenueStatValue}>
              {totalTransactions + totalPayments}
            </Text>
            <Text style={styles.revenueStatLabel}>Total Transactions</Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {[
          { key: 'all', label: 'All', count: combinedData.length },
          { key: 'transactions', label: 'Wallet', count: transactions.length },
          { key: 'payments', label: 'Payments', count: payments.length },
        ].map(tab => (
          <Pressable
            key={tab.key}
            style={[
              styles.filterTab,
              activeTab === tab.key && styles.filterTabActive,
            ]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Text
              style={[
                styles.filterTabText,
                activeTab === tab.key && styles.filterTabTextActive,
              ]}
            >
              {tab.label} ({tab.count})
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Sort Controls */}
      <View style={styles.sortControls}>
        <View style={styles.sortButtons}>
          {[
            { key: 'date', label: 'Date' },
            { key: 'amount', label: 'Amount' },
            { key: 'type', label: 'Type' },
          ].map(sort => (
            <Pressable
              key={sort.key}
              style={[
                styles.sortButton,
                sortBy === sort.key && styles.sortButtonActive,
              ]}
              onPress={() => setSortBy(sort.key as any)}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  sortBy === sort.key && styles.sortButtonTextActive,
                ]}
              >
                {sort.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={styles.sortOrderButton}
          onPress={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        >
          {sortOrder === 'asc' ? (
            <TrendingUp size={16} color={colors.primary} />
          ) : (
            <TrendingDown size={16} color={colors.primary} />
          )}
        </Pressable>
      </View>

      {/* Transaction List */}
      <ScrollView
        style={styles.transactionList}
        showsVerticalScrollIndicator={false}
      >
        {filteredData.map((item, index) => renderTransactionItem(item, index))}

        {filteredData.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No transactions found</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  revenueSummary: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  revenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  revenueTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: `${colors.primary}15`,
  },
  revenueStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  revenueStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  revenueStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  revenueStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: colors.card,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  sortControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.background,
  },
  sortButtonActive: {
    backgroundColor: `${colors.primary}15`,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  sortButtonTextActive: {
    color: colors.primary,
  },
  sortOrderButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: `${colors.primary}15`,
  },
  transactionList: {
    flex: 1,
  },
  transactionItem: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  transactionIconContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  transactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  creditIcon: {
    backgroundColor: `${colors.success}20`,
  },
  debitIcon: {
    backgroundColor: `${colors.danger}20`,
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
    marginBottom: 8,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  creditAmount: {
    color: colors.success,
  },
  debitAmount: {
    color: colors.danger,
  },
  transactionType: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  paymentItem: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  paymentIconContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  paymentIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentUser: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  paymentDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  paymentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  paymentAmountContainer: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  paymentStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusCompleted: {
    backgroundColor: `${colors.success}20`,
  },
  statusPending: {
    backgroundColor: `${colors.warning}20`,
  },
  statusFailed: {
    backgroundColor: `${colors.danger}20`,
  },
  paymentStatusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statusCompletedText: {
    color: colors.success,
  },
  statusPendingText: {
    color: colors.warning,
  },
  statusFailedText: {
    color: colors.danger,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});
