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
import {
  TrendingUp,
  TrendingDown,
  User,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');

interface TransactionDetail {
  id: string;
  wallet_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  amount: number;
  transaction_type: 'credit' | 'debit';
  status: 'completed' | 'pending' | 'failed';
  reference_id?: string;
  description?: string;
  created_at: string;
  wallet_balance_before: number;
  wallet_balance_after: number;
}

interface RelatedTransaction {
  id: string;
  amount: number;
  transaction_type: 'credit' | 'debit';
  description: string;
  created_at: string;
}

export default function TransactionDetailScreen() {
  const { transactionId } = useLocalSearchParams<{ transactionId: string }>();
  const [transaction, setTransaction] = useState<TransactionDetail | null>(
    null
  );
  const [relatedTransactions, setRelatedTransactions] = useState<
    RelatedTransaction[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isTablet = screenWidth >= 768;

  useEffect(() => {
    fetchTransactionDetails();
  }, [transactionId]);

  const fetchTransactionDetails = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockTransaction: TransactionDetail = {
        id: transactionId || '1',
        wallet_id: 'wallet_123',
        user_id: 'user_123',
        user_name: 'Ahmed Ali',
        user_email: 'ahmed.ali@example.com',
        amount: 150.0,
        transaction_type: 'debit',
        status: 'completed',
        reference_id: 'REF-2024-001234',
        description: 'Ferry booking payment',
        created_at: '2024-01-20T14:45:00Z',
        wallet_balance_before: 300.0,
        wallet_balance_after: 150.0,
      };

      const mockRelated: RelatedTransaction[] = [
        {
          id: '2',
          amount: 200.0,
          transaction_type: 'credit',
          description: 'Wallet top-up',
          created_at: '2024-01-19T10:30:00Z',
        },
        {
          id: '3',
          amount: 50.0,
          transaction_type: 'debit',
          description: 'Service fee',
          created_at: '2024-01-18T16:20:00Z',
        },
      ];

      setTransaction(mockTransaction);
      setRelatedTransactions(mockRelated);
    } catch (error) {
      console.error('Error fetching transaction details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTransactionDetails();
    setRefreshing(false);
  };

  const renderTransactionHeader = () => (
    <View style={styles.transactionHeader}>
      <View style={styles.transactionInfo}>
        <View
          style={[
            styles.transactionIcon,
            {
              backgroundColor:
                transaction?.transaction_type === 'credit'
                  ? colors.success + '15'
                  : colors.danger + '15',
            },
          ]}
        >
          {transaction?.transaction_type === 'credit' ? (
            <TrendingUp size={32} color={colors.success} />
          ) : (
            <TrendingDown size={32} color={colors.danger} />
          )}
        </View>
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionId}>
            Transaction #{transaction?.id}
          </Text>
          <Text style={styles.transactionType}>
            {transaction?.transaction_type.toUpperCase()}
          </Text>
          <View style={styles.transactionStatus}>
            <View
              style={[
                styles.statusIndicator,
                {
                  backgroundColor:
                    transaction?.status === 'completed'
                      ? colors.success
                      : transaction?.status === 'pending'
                        ? colors.warning
                        : colors.danger,
                },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    transaction?.status === 'completed'
                      ? colors.success
                      : transaction?.status === 'pending'
                        ? colors.warning
                        : colors.danger,
                },
              ]}
            >
              {transaction?.status.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.transactionAmount}>
        <Text style={styles.amountLabel}>Transaction Amount</Text>
        <Text
          style={[
            styles.amountValue,
            {
              color:
                transaction?.transaction_type === 'credit'
                  ? colors.success
                  : colors.danger,
            },
          ]}
        >
          {transaction?.transaction_type === 'credit' ? '+' : '-'}
          MVR {transaction?.amount.toFixed(2)}
        </Text>
      </View>
    </View>
  );

  const renderTransactionDetails = () => (
    <View style={styles.detailsContainer}>
      <Text style={styles.detailsTitle}>Transaction Information</Text>

      <View style={styles.detailsGrid}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Status</Text>
          <View style={styles.detailStatusBadge}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    transaction?.status === 'completed'
                      ? colors.success
                      : transaction?.status === 'pending'
                        ? colors.warning
                        : colors.danger,
                },
              ]}
            />
            <Text
              style={[
                styles.detailStatusText,
                {
                  color:
                    transaction?.status === 'completed'
                      ? colors.success
                      : transaction?.status === 'pending'
                        ? colors.warning
                        : colors.danger,
                },
              ]}
            >
              {transaction?.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Transaction Type</Text>
          <Text style={[styles.detailValue, { textTransform: 'capitalize' }]}>
            {transaction?.transaction_type}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Description</Text>
          <Text style={styles.detailValue}>{transaction?.description}</Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Reference ID</Text>
          <Text style={styles.detailValue}>{transaction?.reference_id || 'N/A'}</Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Transaction Date</Text>
          <Text style={styles.detailValue}>
            {new Date(transaction?.created_at || '').toLocaleString()}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Wallet ID</Text>
          <Text style={styles.detailValue}>{transaction?.wallet_id}</Text>
        </View>
      </View>
    </View>
  );

  const renderBalanceInfo = () => (
    <View style={styles.balanceContainer}>
      <Text style={styles.balanceTitle}>Wallet Balance Impact</Text>

      <View style={styles.balanceGrid}>
        <View style={styles.balanceItem}>
          <Text style={styles.balanceLabel}>Balance Before</Text>
          <Text style={styles.balanceValue}>
            MVR {transaction?.wallet_balance_before.toFixed(2)}
          </Text>
        </View>

        <View style={styles.balanceItem}>
          <Text style={styles.balanceLabel}>Transaction Amount</Text>
          <Text
            style={[
              styles.balanceValue,
              {
                color:
                  transaction?.transaction_type === 'credit'
                    ? colors.success
                    : colors.danger,
              },
            ]}
          >
            {transaction?.transaction_type === 'credit' ? '+' : '-'}
            MVR {transaction?.amount.toFixed(2)}
          </Text>
        </View>

        <View style={styles.balanceItem}>
          <Text style={styles.balanceLabel}>Balance After</Text>
          <Text style={styles.balanceValue}>
            MVR {transaction?.wallet_balance_after.toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderUserInfo = () => (
    <View style={styles.userContainer}>
      <Text style={styles.userTitle}>User Information</Text>

      <View style={styles.userInfo}>
        <View style={styles.userIcon}>
          <User size={20} color={colors.primary} />
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{transaction?.user_name}</Text>
          <Text style={styles.userEmail}>{transaction?.user_email}</Text>
        </View>
      </View>
    </View>
  );

  const renderRelatedTransaction = ({ item }: { item: RelatedTransaction }) => (
    <TouchableOpacity style={styles.relatedItem}>
      <View
        style={[
          styles.relatedIcon,
          {
            backgroundColor:
              item.transaction_type === 'credit'
                ? colors.success + '15'
                : colors.danger + '15',
          },
        ]}
      >
        {item.transaction_type === 'credit' ? (
          <ArrowUpRight size={18} color={colors.success} />
        ) : (
          <ArrowDownLeft size={18} color={colors.danger} />
        )}
      </View>

      <View style={styles.relatedContent}>
        <Text style={styles.relatedDescription}>{item.description}</Text>
        <Text style={styles.relatedTime}>
          {new Date(item.created_at).toLocaleString()}
        </Text>
      </View>

      <View style={styles.relatedAmount}>
        <Text
          style={[
            styles.relatedAmountText,
            {
              color:
                item.transaction_type === 'credit'
                  ? colors.success
                  : colors.danger,
            },
          ]}
        >
          {item.transaction_type === 'credit' ? '+' : '-'}
          MVR {item.amount.toFixed(2)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading transaction details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Transaction Details',
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
        {/* Transaction Header */}
        {renderTransactionHeader()}

        {/* Transaction Details */}
        {renderTransactionDetails()}

        {/* Balance Information */}
        {renderBalanceInfo()}

        {/* User Information */}
        {renderUserInfo()}

        {/* Related Transactions */}
        <View style={styles.relatedSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Related Transactions</Text>
            <Text style={styles.sectionSubtitle}>
              {relatedTransactions.length} transactions
            </Text>
          </View>

          <FlatList
            data={relatedTransactions}
            renderItem={renderRelatedTransaction}
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

  // Transaction Header
  transactionHeader: {
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
  transactionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  transactionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionId: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  transactionType: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  transactionStatus: {
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
    fontWeight: '600',
  },
  transactionAmount: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  amountLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '700',
  },

  // Details
  detailsContainer: {
    backgroundColor: colors.background,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  detailsGrid: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  detailStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  detailStatusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Balance Info
  balanceContainer: {
    backgroundColor: colors.background,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  balanceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  balanceGrid: {
    gap: 12,
  },
  balanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },

  // User Info
  userContainer: {
    backgroundColor: colors.background,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  // Related Transactions
  relatedSection: {
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
  relatedItem: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  relatedIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  relatedContent: {
    flex: 1,
  },
  relatedDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  relatedTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  relatedAmount: {
    alignItems: 'flex-end',
  },
  relatedAmountText: {
    fontSize: 16,
    fontWeight: '700',
  },
} as any);
