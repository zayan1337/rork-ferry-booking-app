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
import { Stack, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react-native';
import SearchBar from '@/components/admin/SearchBar';

const { width: screenWidth } = Dimensions.get('window');

interface WalletDetail {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  balance: number;
  currency: string;
  is_active: boolean;
  total_credits: number;
  total_debits: number;
  created_at: string;
  updated_at: string;
}

interface WalletTransaction {
  id: string;
  wallet_id: string;
  user_id: string;
  user_name: string;
  amount: number;
  transaction_type: 'credit' | 'debit';
  reference_id?: string;
  description?: string;
  created_at: string;
}

export default function WalletDetailScreen() {
  const { walletId } = useLocalSearchParams<{ walletId: string }>();
  const [wallet, setWallet] = useState<WalletDetail | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'credit' | 'debit'>(
    'all'
  );

  const isTablet = screenWidth >= 768;

  useEffect(() => {
    fetchWalletDetails();
  }, [walletId]);

  const fetchWalletDetails = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockWallet: WalletDetail = {
        id: walletId || '1',
        user_id: 'user_123',
        user_name: 'Ahmed Ali',
        user_email: 'ahmed.ali@example.com',
        balance: 1250.75,
        currency: 'MVR',
        is_active: true,
        total_credits: 2500.0,
        total_debits: 1249.25,
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-20T14:45:00Z',
      };

      const mockTransactions: WalletTransaction[] = [
        {
          id: '1',
          wallet_id: walletId || '1',
          user_id: 'user_123',
          user_name: 'Ahmed Ali',
          amount: 100.0,
          transaction_type: 'credit',
          description: 'Booking payment refund',
          created_at: '2024-01-20T14:45:00Z',
        },
        {
          id: '2',
          wallet_id: walletId || '1',
          user_id: 'user_123',
          user_name: 'Ahmed Ali',
          amount: 50.0,
          transaction_type: 'debit',
          description: 'Ferry booking payment',
          created_at: '2024-01-19T09:30:00Z',
        },
        {
          id: '3',
          wallet_id: walletId || '1',
          user_id: 'user_123',
          user_name: 'Ahmed Ali',
          amount: 200.0,
          transaction_type: 'credit',
          description: 'Wallet top-up',
          created_at: '2024-01-18T16:20:00Z',
        },
      ];

      setWallet(mockWallet);
      setTransactions(mockTransactions);
    } catch (error) {
      console.error('Error fetching wallet details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchWalletDetails();
    setRefreshing(false);
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch =
      transaction.description
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      transaction.user_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterType === 'all' || transaction.transaction_type === filterType;

    return matchesSearch && matchesFilter;
  });

  const renderWalletHeader = () => (
    <View style={styles.walletHeader}>
      <View style={styles.walletInfo}>
        <View style={styles.walletIcon}>
          <Wallet size={32} color={colors.primary} />
        </View>
        <View style={styles.walletDetails}>
          <Text style={styles.walletUserName}>{wallet?.user_name}</Text>
          <Text style={styles.walletUserEmail}>{wallet?.user_email}</Text>
          <View style={styles.walletStatus}>
            <View
              style={[
                styles.statusIndicator,
                {
                  backgroundColor: wallet?.is_active
                    ? colors.success
                    : colors.danger,
                },
              ]}
            />
            <Text style={styles.statusText}>
              {wallet?.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.walletBalance}>
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <Text style={styles.balanceAmount}>
          MVR {wallet?.balance.toFixed(2)}
        </Text>
      </View>
    </View>
  );

  const renderWalletStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View
            style={[
              styles.statIcon,
              { backgroundColor: colors.success + '15' },
            ]}
          >
            <TrendingUp size={20} color={colors.success} />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statValue}>
              MVR {wallet?.total_credits.toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Total Credits</Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <View
            style={[styles.statIcon, { backgroundColor: colors.danger + '15' }]}
          >
            <TrendingDown size={20} color={colors.danger} />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statValue}>
              MVR {wallet?.total_debits.toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Total Debits</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderTransactionItem = ({ item }: { item: WalletTransaction }) => (
    <TouchableOpacity style={styles.transactionItem}>
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
          <TrendingUp size={18} color={colors.success} />
        ) : (
          <TrendingDown size={18} color={colors.danger} />
        )}
      </View>

      <View style={styles.transactionContent}>
        <Text style={styles.transactionDescription}>
          {item.description || `${item.transaction_type} transaction`}
        </Text>
        <Text style={styles.transactionTime}>
          {new Date(item.created_at).toLocaleString()}
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
            item.transaction_type === 'credit'
              ? styles.creditAmount
              : styles.debitAmount,
          ]}
        >
          {item.transaction_type === 'credit' ? '+' : '-'}
          MVR {item.amount.toFixed(2)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
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
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading wallet details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Wallet Details',
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
        {/* Wallet Header */}
        {renderWalletHeader()}

        {/* Wallet Stats */}
        {renderWalletStats()}

        {/* Search and Filters */}
        <View style={styles.searchSection}>
          <SearchBar
            placeholder='Search transactions...'
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {renderFilterButtons()}
        </View>

        {/* Transactions List */}
        <View style={styles.transactionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transaction History</Text>
            <Text style={styles.sectionSubtitle}>
              {filteredTransactions.length} transactions
            </Text>
          </View>

          <FlatList
            data={filteredTransactions}
            renderItem={renderTransactionItem}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },

  // Wallet Header
  walletHeader: {
    backgroundColor: colors.background,
    margin: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  walletIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  walletDetails: {
    flex: 1,
  },
  walletUserName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  walletUserEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  walletStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  walletBalance: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  balanceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
  },

  // Stats
  statsContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Search and Filters
  searchSection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  filterContainer: {
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

  // Transactions
  transactionsSection: {
    marginHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  transactionItem: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  transactionContent: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  transactionTime: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  transactionReference: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    fontSize: 16,
    fontWeight: '700',
  },
  creditAmount: {
    color: colors.success,
  },
  debitAmount: {
    color: colors.danger,
  },
} as any);
