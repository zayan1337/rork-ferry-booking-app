import React, { memo, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import type { Wallet, WalletTransaction } from '@/types/admin/finance';
import {
  Wallet as WalletIcon,
  User,
  Mail,
  Calendar,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  BarChart3,
} from 'lucide-react-native';

interface WalletDetailCardProps {
  wallet: Wallet;
  transactions: WalletTransaction[];
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
}

function WalletDetailCard({
  wallet,
  transactions,
  formatCurrency,
  formatDate,
}: WalletDetailCardProps) {
  // Calculate transaction statistics
  const transactionStats = useMemo(() => {
    const credits = transactions.filter(t => t.transaction_type === 'credit');
    const debits = transactions.filter(t => t.transaction_type === 'debit');

    const totalCredits = credits.reduce((sum, t) => sum + t.amount, 0);
    const totalDebits = debits.reduce((sum, t) => sum + t.amount, 0);

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
    router.push(`/(app)/(admin)/user-detail?id=${wallet.user_id}` as any);
  };

  const renderTransaction = ({ item }: { item: WalletTransaction }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionIcon}>
        {item.transaction_type === 'credit' ? (
          <TrendingUp size={20} color={colors.success} />
        ) : (
          <TrendingDown size={20} color={colors.danger} />
        )}
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionDescription}>
          {item.description || `${item.transaction_type} Transaction`}
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
              color:
                item.transaction_type === 'credit'
                  ? colors.success
                  : colors.danger,
            },
          ]}
        >
          {item.transaction_type === 'credit' ? '+' : '-'}
          {formatCurrency(item.amount)}
        </Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Wallet Details</Text>
          <Text style={styles.headerSubtitle}>{wallet.user_name}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: wallet.is_active
                ? colors.success + '15'
                : colors.danger + '15',
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: wallet.is_active ? colors.success : colors.danger },
            ]}
          >
            {wallet.is_active ? 'ACTIVE' : 'INACTIVE'}
          </Text>
        </View>
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <WalletIcon size={32} color={colors.primary} />
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <Text style={styles.balanceValue}>
          {formatCurrency(wallet.balance)}
        </Text>
        <Text style={styles.currency}>{wallet.currency}</Text>
      </View>

      {/* User Information */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <User size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>User Information</Text>
        </View>
        <TouchableOpacity
          style={styles.infoCard}
          onPress={handleViewUser}
          activeOpacity={0.7}
        >
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
        </TouchableOpacity>
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
          <InfoRow label='Currency' value={wallet.currency} />
          <InfoRow
            label='Status'
            value={wallet.is_active ? 'Active' : 'Inactive'}
          />
          <InfoRow label='Created At' value={formatDate(wallet.created_at)} />
          <InfoRow label='Last Updated' value={formatDate(wallet.updated_at)} />
        </View>
      </View>
    </ScrollView>
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
} as any);

export default memo(WalletDetailCard);
