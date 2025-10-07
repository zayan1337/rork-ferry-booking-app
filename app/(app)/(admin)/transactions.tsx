import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  FlatList,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Clock,
} from 'lucide-react-native';
import { useFinanceStore } from '@/store/admin/financeStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import SearchBar from '@/components/admin/SearchBar';
import StatCard from '@/components/admin/StatCard';
import { WalletTransaction } from '@/types/admin/finance';

const { width: screenWidth } = Dimensions.get('window');

export default function TransactionsListingScreen() {
  const {
    walletTransactions,
    stats,
    loading,
    fetchWalletTransactions,
    fetchStats,
    setSearchQuery,
    searchQueries,
  } = useFinanceStore();

  const { canViewWallets } = useAdminPermissions();

  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'credit' | 'debit'>(
    'all'
  );

  const isTablet = screenWidth >= 768;

  useEffect(() => {
    if (canViewWallets()) {
      fetchWalletTransactions();
      fetchStats();
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchWalletTransactions(true);
    await fetchStats();
    setRefreshing(false);
  };

  const handleTransactionPress = (transactionId: string) => {
    router.push(
      `/(app)/(admin)/transaction-detail?transactionId=${transactionId}` as any
    );
  };

  const handleSearch = (query: string) => {
    setSearchQuery('transactions', query);
  };

  const filteredTransactions = walletTransactions.filter(transaction => {
    const matchesSearch =
      transaction.user_name
        .toLowerCase()
        .includes(searchQueries.transactions.toLowerCase()) ||
      (transaction.description &&
        transaction.description
          .toLowerCase()
          .includes(searchQueries.transactions.toLowerCase()));

    const matchesFilter =
      filterType === 'all' || transaction.transaction_type === filterType;

    return matchesSearch && matchesFilter;
  });

  const totalCredits = walletTransactions
    .filter(t => t.transaction_type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDebits = walletTransactions
    .filter(t => t.transaction_type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  const renderTransactionItem = ({ item }: { item: WalletTransaction }) => (
    <TouchableOpacity
      style={styles.transactionCard}
      onPress={() => handleTransactionPress(item.id)}
    >
      <View style={styles.transactionHeader}>
        <View style={styles.transactionIconContainer}>
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
              <ArrowUpRight size={20} color={colors.success} />
            ) : (
              <ArrowDownLeft size={20} color={colors.danger} />
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
        <View style={styles.transactionRight}>
          <Text
            style={[
              styles.transactionAmount,
              {
                color:
                  item.transaction_type === 'credit'
                    ? colors.success
                    : colors.danger,
              },
            ]}
          >
            {item.transaction_type === 'credit' ? '+' : '-'}MVR{' '}
            {item.amount.toFixed(2)}
          </Text>
          <ChevronRight size={16} color={colors.textSecondary} />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (!canViewWallets()) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Transactions',
            headerShown: true,
          }}
        />
        <View style={styles.centerContainer}>
          <Text style={styles.noAccessText}>
            You don't have permission to view transactions
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Wallet Transactions',
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
          },
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            <StatCard
              icon={<Activity size={24} color={colors.primary} />}
              title='Total Transactions'
              value={walletTransactions.length.toString()}
              color={colors.primary}
            />
            <StatCard
              icon={<TrendingUp size={24} color={colors.success} />}
              title='Total Credits'
              value={`MVR ${totalCredits.toFixed(2)}`}
              color={colors.success}
            />
            <StatCard
              icon={<TrendingDown size={24} color={colors.danger} />}
              title='Total Debits'
              value={`MVR ${totalDebits.toFixed(2)}`}
              color={colors.danger}
            />
          </View>
        </View>

        {/* Search and Filter Section */}
        <View style={styles.searchSection}>
          <SearchBar
            placeholder='Search transactions...'
            value={searchQueries.transactions}
            onChangeText={handleSearch}
          />

          <View style={styles.filterChips}>
            {[
              { key: 'all', label: 'All' },
              { key: 'credit', label: 'Credits' },
              { key: 'debit', label: 'Debits' },
            ].map(filter => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterChip,
                  filterType === filter.key && styles.filterChipActive,
                ]}
                onPress={() => setFilterType(filter.key as any)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterType === filter.key && styles.filterChipTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Transactions List */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>All Transactions</Text>
            <Text style={styles.listSubtitle}>
              {filteredTransactions.length} transaction
              {filteredTransactions.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {loading.transactions ? (
            <View style={styles.centerContainer}>
              <Text style={styles.loadingText}>Loading transactions...</Text>
            </View>
          ) : filteredTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Activity size={48} color={colors.textSecondary} />
              <Text style={styles.emptyStateText}>No transactions found</Text>
            </View>
          ) : (
            <FlatList
              data={filteredTransactions}
              renderItem={renderTransactionItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
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
    paddingBottom: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noAccessText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },

  // Stats Section
  statsSection: {
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },

  // Search Section
  searchSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.primary,
  },

  // List Section
  listSection: {
    paddingHorizontal: 16,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  listSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  // Transaction Card
  transactionCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    marginBottom: 6,
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
  transactionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
  },
} as any);
