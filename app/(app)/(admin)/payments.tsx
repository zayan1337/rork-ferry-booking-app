import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useFinanceData } from '@/hooks/useFinanceData';
import type { Payment } from '@/types/admin/finance';
import {
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  TrendingUp,
  DollarSign,
} from 'lucide-react-native';
import SearchBar from '@/components/admin/SearchBar';

export default function PaymentsListPage() {
  const {
    filteredPayments,
    formatCurrency,
    canViewPayments,
    handleRefresh,
    paymentStats,
  } = useFinanceData();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Client-side search and filter
  const displayPayments = useMemo(() => {
    let filtered = [...filteredPayments];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Apply search
    if (localSearchQuery.trim()) {
      const query = localSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        payment =>
          payment.booking?.booking_number?.toLowerCase().includes(query) ||
          payment.booking?.user_name?.toLowerCase().includes(query) ||
          payment.receipt_number?.toLowerCase().includes(query) ||
          payment.payment_method.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [filteredPayments, localSearchQuery, statusFilter]);

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      await handleRefresh();
    } catch (error) {
      console.error('Error refreshing payments:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePaymentPress = (paymentId: string) => {
    router.push(`/(app)/(admin)/payment-detail?paymentId=${paymentId}` as any);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={18} color={colors.success} />;
      case 'pending':
        return <Clock size={18} color={colors.warning} />;
      case 'failed':
        return <XCircle size={18} color={colors.danger} />;
      default:
        return <Clock size={18} color={colors.textSecondary} />;
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
      default:
        return colors.textSecondary;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      bank_transfer: 'Bank Transfer',
      bml: 'BML',
      mib: 'MIB',
      ooredoo_m_faisa: 'M-Faisaa',
      fahipay: 'FahiPay',
      wallet: 'Wallet',
    };
    return methods[method] || method.toUpperCase();
  };

  const renderPayment = ({ item }: { item: Payment }) => (
    <TouchableOpacity
      style={styles.paymentItem}
      onPress={() => handlePaymentPress(item.id)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.paymentIcon,
          { backgroundColor: getStatusColor(item.status) + '15' },
        ]}
      >
        {getStatusIcon(item.status)}
      </View>
      <View style={styles.paymentContent}>
        <View style={styles.paymentHeader}>
          <View style={styles.paymentUserInfo}>
            <Text style={styles.paymentUser} numberOfLines={1}>
              {item.booking?.user_name || 'Unknown User'}
            </Text>
            <Text style={styles.paymentEmail} numberOfLines={1}>
              {item.booking?.user_email || 'N/A'}
            </Text>
          </View>
          <Text style={styles.paymentAmount}>
            {formatCurrency(item.amount)}
          </Text>
        </View>

        <View style={styles.paymentDetails}>
          <View style={styles.paymentMethodBadge}>
            <CreditCard size={14} color={colors.primary} />
            <Text style={styles.paymentMethod}>
              {getPaymentMethodLabel(item.payment_method)}
            </Text>
          </View>
          <Text style={styles.paymentSeparator}>•</Text>
          <Text style={styles.paymentBooking}>
            {item.booking?.booking_number || 'N/A'}
          </Text>
        </View>

        <View style={styles.paymentFooter}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + '15' },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(item.status) },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(item.status) },
              ]}
            >
              {item.status.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.paymentDate}>
            {new Date(item.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <CreditCard size={48} color={colors.textSecondary} />
      </View>
      <Text style={styles.emptyStateTitle}>No Payments Found</Text>
      <Text style={styles.emptyStateText}>
        {localSearchQuery || statusFilter !== 'all'
          ? 'Try adjusting your filters or search terms'
          : 'No payment records available yet'}
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Summary Stats */}
      {paymentStats && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <TrendingUp size={20} color={colors.success} />
            </View>
            <Text style={styles.statValue}>
              {paymentStats.successRate.toFixed(1)}%
            </Text>
            <Text style={styles.statLabel}>Success Rate</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <DollarSign size={20} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>
              {formatCurrency(paymentStats.totalAmount)}
            </Text>
            <Text style={styles.statLabel}>Total Amount</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <CreditCard size={20} color={colors.info} />
            </View>
            <Text style={styles.statValue}>{paymentStats.totalPayments}</Text>
            <Text style={styles.statLabel}>Total Payments</Text>
          </View>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          placeholder='Search by booking, user, or receipt...'
          value={localSearchQuery}
          onChangeText={setLocalSearchQuery}
        />
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            statusFilter === 'all' && styles.filterButtonActive,
          ]}
          onPress={() => setStatusFilter('all')}
        >
          <Text
            style={[
              styles.filterButtonText,
              statusFilter === 'all' && styles.filterButtonTextActive,
            ]}
          >
            All ({filteredPayments.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            statusFilter === 'completed' && styles.filterButtonActive,
          ]}
          onPress={() => setStatusFilter('completed')}
        >
          <CheckCircle
            size={16}
            color={statusFilter === 'completed' ? colors.white : colors.success}
          />
          <Text
            style={[
              styles.filterButtonText,
              statusFilter === 'completed' && styles.filterButtonTextActive,
            ]}
          >
            Completed ({paymentStats?.completedPayments || 0})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            statusFilter === 'pending' && styles.filterButtonActive,
          ]}
          onPress={() => setStatusFilter('pending')}
        >
          <Clock
            size={16}
            color={statusFilter === 'pending' ? colors.white : colors.warning}
          />
          <Text
            style={[
              styles.filterButtonText,
              statusFilter === 'pending' && styles.filterButtonTextActive,
            ]}
          >
            Pending ({paymentStats?.pendingPayments || 0})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            statusFilter === 'failed' && styles.filterButtonActive,
          ]}
          onPress={() => setStatusFilter('failed')}
        >
          <XCircle
            size={16}
            color={statusFilter === 'failed' ? colors.white : colors.danger}
          />
          <Text
            style={[
              styles.filterButtonText,
              statusFilter === 'failed' && styles.filterButtonTextActive,
            ]}
          >
            Failed ({paymentStats?.failedPayments || 0})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>
          Showing {displayPayments.length} payment
          {displayPayments.length !== 1 ? 's' : ''}
          {statusFilter !== 'all' && ` · ${statusFilter}`}
        </Text>
      </View>
    </View>
  );

  // Permission check
  if (!canViewPayments) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'All Payments',
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
        <View style={styles.noPermissionContainer}>
          <View style={styles.noPermissionIcon}>
            <AlertTriangle size={40} color={colors.warning} />
          </View>
          <Text style={styles.noPermissionTitle}>Access Denied</Text>
          <Text style={styles.noPermissionText}>
            You don't have permission to view payment records.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'All Payments',
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

      <FlatList
        data={displayPayments}
        renderItem={renderPayment}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefreshData}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerContainer: {
    backgroundColor: colors.backgroundSecondary,
    paddingBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  resultsText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  paymentItem: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border + '40',
  },
  paymentIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  paymentContent: {
    flex: 1,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 12,
  },
  paymentUserInfo: {
    flex: 1,
  },
  paymentUser: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  paymentEmail: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  paymentDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  paymentMethodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  paymentMethod: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  paymentSeparator: {
    fontSize: 14,
    color: colors.textSecondary,
    marginHorizontal: 8,
  },
  paymentBooking: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  paymentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  paymentDate: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    gap: 16,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  noPermissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  noPermissionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.warning + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  noPermissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  noPermissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
} as any);
