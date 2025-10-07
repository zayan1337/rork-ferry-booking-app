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
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
} from 'lucide-react-native';
import { useFinanceStore } from '@/store/admin/financeStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import SearchBar from '@/components/admin/SearchBar';
import StatCard from '@/components/admin/StatCard';
import { Payment } from '@/types/admin/finance';

const { width: screenWidth } = Dimensions.get('window');

export default function PaymentsListingScreen() {
  const {
    payments,
    stats,
    loading,
    fetchPayments,
    fetchStats,
    setSearchQuery,
    searchQueries,
  } = useFinanceStore();

  const { canViewPayments } = useAdminPermissions();

  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'completed' | 'pending' | 'failed'
  >('all');

  const isTablet = screenWidth >= 768;

  useEffect(() => {
    if (canViewPayments()) {
      fetchPayments();
      fetchStats();
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPayments(true);
    await fetchStats();
    setRefreshing(false);
  };

  const handlePaymentPress = (paymentId: string) => {
    router.push(`/(app)/(admin)/payment-detail?paymentId=${paymentId}` as any);
  };

  const handleSearch = (query: string) => {
    setSearchQuery('payments', query);
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch =
      payment.booking?.booking_number
        ?.toLowerCase()
        .includes(searchQueries.payments.toLowerCase()) ||
      payment.booking?.user_name
        ?.toLowerCase()
        .includes(searchQueries.payments.toLowerCase()) ||
      payment.receipt_number
        ?.toLowerCase()
        .includes(searchQueries.payments.toLowerCase());

    const matchesFilter =
      filterStatus === 'all' || payment.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} color={colors.success} />;
      case 'pending':
        return <Clock size={16} color={colors.warning} />;
      case 'failed':
        return <XCircle size={16} color={colors.danger} />;
      case 'cancelled':
        return <AlertTriangle size={16} color={colors.danger} />;
      default:
        return <Clock size={16} color={colors.textSecondary} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return colors.success;
      case 'pending':
        return colors.warning;
      case 'failed':
        return colors.danger;
      case 'cancelled':
        return colors.danger;
      default:
        return colors.textSecondary;
    }
  };

  const renderPaymentItem = ({ item }: { item: Payment }) => (
    <TouchableOpacity
      style={styles.paymentCard}
      onPress={() => handlePaymentPress(item.id)}
    >
      <View style={styles.paymentHeader}>
        <View style={styles.paymentIconContainer}>
          <View
            style={[
              styles.paymentIcon,
              { backgroundColor: colors.primary + '15' },
            ]}
          >
            <CreditCard size={20} color={colors.primary} />
          </View>
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentUser}>
              {item.booking?.user_name || 'Unknown User'}
            </Text>
            <Text style={styles.paymentMethod}>
              {item.payment_method.toUpperCase()}
            </Text>
            <Text style={styles.paymentBooking}>
              {item.booking?.booking_number || 'N/A'}
            </Text>
          </View>
        </View>
        <View style={styles.paymentRight}>
          <Text style={styles.paymentAmount}>MVR {item.amount.toFixed(2)}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + '15' },
            ]}
          >
            {getStatusIcon(item.status)}
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(item.status) },
              ]}
            >
              {item.status.toUpperCase()}
            </Text>
          </View>
          <ChevronRight size={16} color={colors.textSecondary} />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (!canViewPayments()) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Payments',
            headerShown: true,
          }}
        />
        <View style={styles.centerContainer}>
          <Text style={styles.noAccessText}>
            You don't have permission to view payments
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Payments',
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
              icon={<CreditCard size={24} color={colors.primary} />}
              title='Total Payments'
              value={payments.length.toString()}
              color={colors.primary}
            />
            <StatCard
              icon={<CheckCircle size={24} color={colors.success} />}
              title='Completed'
              value={stats.completedPayments.toString()}
              color={colors.success}
            />
            <StatCard
              icon={<Clock size={24} color={colors.warning} />}
              title='Pending'
              value={stats.pendingPayments.toString()}
              color={colors.warning}
            />
            <StatCard
              icon={<TrendingUp size={24} color={colors.primary} />}
              title='Total Revenue'
              value={`MVR ${stats.totalRevenue.toFixed(2)}`}
              color={colors.primary}
            />
          </View>
        </View>

        {/* Search and Filter Section */}
        <View style={styles.searchSection}>
          <SearchBar
            placeholder='Search payments...'
            value={searchQueries.payments}
            onChangeText={handleSearch}
          />

          <View style={styles.filterChips}>
            {[
              { key: 'all', label: 'All' },
              { key: 'completed', label: 'Completed' },
              { key: 'pending', label: 'Pending' },
              { key: 'failed', label: 'Failed' },
            ].map(filter => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterChip,
                  filterStatus === filter.key && styles.filterChipActive,
                ]}
                onPress={() => setFilterStatus(filter.key as any)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterStatus === filter.key && styles.filterChipTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Payments List */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>All Payments</Text>
            <Text style={styles.listSubtitle}>
              {filteredPayments.length} payment
              {filteredPayments.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {loading.payments ? (
            <View style={styles.centerContainer}>
              <Text style={styles.loadingText}>Loading payments...</Text>
            </View>
          ) : filteredPayments.length === 0 ? (
            <View style={styles.emptyState}>
              <CreditCard size={48} color={colors.textSecondary} />
              <Text style={styles.emptyStateText}>No payments found</Text>
            </View>
          ) : (
            <FlatList
              data={filteredPayments}
              renderItem={renderPaymentItem}
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

  // Payment Card
  paymentCard: {
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
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  paymentMethod: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  paymentBooking: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  paymentRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
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
