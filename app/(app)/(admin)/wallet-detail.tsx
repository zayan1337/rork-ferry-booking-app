import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useFinanceData } from '@/hooks/useFinanceData';
import type { WalletTransaction } from '@/types/admin/finance';
import {
  Wallet as WalletIcon,
  User,
  DollarSign,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react-native';

export default function WalletDetailPage() {
  const { walletId } = useLocalSearchParams<{ walletId: string }>();
  const {
    getWalletById,
    getWalletTransactions,
    formatCurrency,
    formatDate,
    loading,
    handleRefresh,
  } = useFinanceData();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const wallet = getWalletById(walletId);
  const allTransactions = getWalletTransactions(walletId);

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      await handleRefresh();
    } catch (error) {
      console.error('Error refreshing wallet:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Calculate transaction statistics
  const transactionStats = useMemo(() => {
    const credits = allTransactions.filter(
      t => t.transaction_type === 'credit'
    );
    const debits = allTransactions.filter(t => t.transaction_type === 'debit');

    const totalCredits = credits.reduce((sum, t) => sum + t.amount, 0);
    const totalDebits = debits.reduce((sum, t) => sum + t.amount, 0);

    return {
      totalCredits,
      totalDebits,
      creditCount: credits.length,
      debitCount: debits.length,
      netFlow: totalCredits - totalDebits,
      transactionCount: allTransactions.length,
    };
  }, [allTransactions]);

  const renderTransaction = ({ item }: { item: WalletTransaction }) => (
    <View style={styles.transactionItem}>
      <View
        style={[
          styles.transactionIcon,
          {
            backgroundColor:
              item.transaction_type === 'credit'
                ? colors.success + '15'
                : colors.danger + '15',
          },
        ]}
      >
        {item.transaction_type === 'credit' ? (
          <TrendingUp size={20} color={colors.success} />
        ) : (
          <TrendingDown size={20} color={colors.danger} />
        )}
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionDescription} numberOfLines={2}>
          {item.description ||
            `${item.transaction_type === 'credit' ? 'Credit' : 'Debit'} Transaction`}
        </Text>
        <Text style={styles.transactionDate}>
          {new Date(item.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
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

  if (loading.wallets && !wallet) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Wallet Details',
          }}
        />
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
        <Stack.Screen
          options={{
            title: 'Wallet Not Found',
          }}
        />
        <View style={styles.notFoundContainer}>
          <View style={styles.notFoundIcon}>
            <AlertCircle size={40} color={colors.warning} />
          </View>
          <Text style={styles.notFoundTitle}>Wallet Not Found</Text>
          <Text style={styles.notFoundText}>
            The wallet you're looking for doesn't exist or has been removed.
          </Text>
          <TouchableOpacity
            style={styles.backToListButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color={colors.primary} />
            <Text style={styles.backToListText}>Back to Wallets</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Wallet Details',
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefreshData}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View
            style={[
              styles.statusIconContainer,
              {
                backgroundColor: wallet.is_active
                  ? colors.success + '15'
                  : colors.danger + '15',
              },
            ]}
          >
            <WalletIcon
              size={32}
              color={wallet.is_active ? colors.success : colors.danger}
            />
          </View>
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>Wallet Status</Text>
            <Text
              style={[
                styles.statusValue,
                { color: wallet.is_active ? colors.success : colors.danger },
              ]}
            >
              {wallet.is_active ? 'ACTIVE' : 'INACTIVE'}
            </Text>
            <Text style={styles.statusDate}>
              Updated {new Date(wallet.updated_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceIconContainer}>
            <DollarSign size={40} color={colors.primary} />
          </View>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceValue}>
            {formatCurrency(wallet.balance)}
          </Text>
          <View style={styles.currencyBadge}>
            <Text style={styles.currency}>{wallet.currency}</Text>
          </View>
        </View>

        {/* User Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <User size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>User Information</Text>
          </View>
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              router.push(`/(app)/(admin)/user/${wallet.user_id}` as any)
            }
            activeOpacity={0.7}
          >
            <View style={styles.userHeader}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{wallet.user_name}</Text>
                <Text style={styles.userEmail}>{wallet.user_email}</Text>
              </View>
              <ExternalLink size={20} color={colors.primary} />
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>User ID</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {wallet.user_id}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.viewDetailsButton}
              onPress={() =>
                router.push(`/(app)/(admin)/user/${wallet.user_id}` as any)
              }
            >
              <Text style={styles.viewDetailsText}>View User Profile</Text>
              <ExternalLink size={16} color={colors.primary} />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>

        {/* Transaction Statistics */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <BarChart3 size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Transaction Summary</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, styles.successCard]}>
              <View style={styles.statCardIcon}>
                <TrendingUp size={24} color={colors.success} />
              </View>
              <Text style={styles.statCardLabel}>Total Credits</Text>
              <Text style={[styles.statCardValue, { color: colors.success }]}>
                {formatCurrency(transactionStats.totalCredits)}
              </Text>
              <Text style={styles.statCardCount}>
                {transactionStats.creditCount} transaction
                {transactionStats.creditCount !== 1 ? 's' : ''}
              </Text>
            </View>

            <View style={[styles.statCard, styles.dangerCard]}>
              <View style={styles.statCardIcon}>
                <TrendingDown size={24} color={colors.danger} />
              </View>
              <Text style={styles.statCardLabel}>Total Debits</Text>
              <Text style={[styles.statCardValue, { color: colors.danger }]}>
                {formatCurrency(transactionStats.totalDebits)}
              </Text>
              <Text style={styles.statCardCount}>
                {transactionStats.debitCount} transaction
                {transactionStats.debitCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          <View style={styles.netFlowCard}>
            <View style={styles.netFlowIcon}>
              <Activity size={24} color={colors.primary} />
            </View>
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
            <View style={styles.sectionIconContainer}>
              <Activity size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>
              Recent Transactions ({transactionStats.transactionCount})
            </Text>
          </View>
          {allTransactions.length > 0 ? (
            <View style={styles.transactionList}>
              <FlatList
                data={allTransactions.slice(0, 20)}
                renderItem={renderTransaction}
                keyExtractor={item => item.id}
                scrollEnabled={false}
              />
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.emptyTransactions}>
                <Activity size={48} color={colors.textSecondary} />
                <Text style={styles.emptyTransactionsText}>
                  No transactions yet
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Wallet Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <DollarSign size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Wallet Information</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Wallet ID</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {wallet.id}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Currency</Text>
              <Text style={styles.infoValue}>{wallet.currency}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Created At</Text>
              <Text style={styles.infoValue}>
                {new Date(wallet.created_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Updated</Text>
              <Text style={styles.infoValue}>
                {new Date(wallet.updated_at).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 40,
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
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusDate: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  balanceCard: {
    backgroundColor: colors.primary + '10',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: colors.primary + '20',
  },
  balanceIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balanceValue: {
    fontSize: 42,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  currencyBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: colors.primary + '15',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  currency: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  viewDetailsText: {
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
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  successCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  dangerCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  statCardIcon: {
    marginBottom: 10,
  },
  statCardLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statCardCount: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  netFlowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  netFlowIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  netFlowInfo: {
    flex: 1,
  },
  netFlowLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
  },
  netFlowValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  transactionList: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  emptyTransactions: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyTransactionsText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
} as any);
