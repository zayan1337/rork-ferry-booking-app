import React, { useState, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useFinanceData } from '@/hooks/useFinanceData';
import type { Payment } from '@/types/admin/finance';
import {
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
} from 'lucide-react-native';

// Components
import SearchBar from '@/components/admin/SearchBar';
import LoadingSpinner from '@/components/admin/LoadingSpinner';

function PaymentsListPage() {
  const {
    filteredPayments,
    loading,
    formatCurrency,
    formatDate,
    setSearchQuery,
    searchQueries,
    canViewPayments,
    handleRefresh,
  } = useFinanceData();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');

  // Client-side search
  const displayPayments = useMemo(() => {
    if (!localSearchQuery.trim()) return filteredPayments;

    const query = localSearchQuery.toLowerCase().trim();
    return filteredPayments.filter(
      payment =>
        payment.booking?.booking_number?.toLowerCase().includes(query) ||
        payment.booking?.user_name?.toLowerCase().includes(query) ||
        payment.receipt_number?.toLowerCase().includes(query) ||
        payment.payment_method.toLowerCase().includes(query)
    );
  }, [filteredPayments, localSearchQuery]);

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
        return <CheckCircle size={16} color={colors.success} />;
      case 'pending':
        return <Clock size={16} color={colors.warning} />;
      case 'failed':
        return <XCircle size={16} color={colors.danger} />;
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
      default:
        return colors.textSecondary;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      bank_transfer: 'Bank Transfer',
      bml: 'BML',
      mib: 'MIB',
      ooredoo_m_faisa: 'Ooredoo M-Faisaa',
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
      <View style={styles.paymentIcon}>
        <CreditCard size={20} color={colors.primary} />
      </View>
      <View style={styles.paymentContent}>
        <View style={styles.paymentHeader}>
          <Text style={styles.paymentUser}>
            {item.booking?.user_name || 'Unknown User'}
          </Text>
          <Text style={styles.paymentAmount}>
            {formatCurrency(item.amount)}
          </Text>
        </View>
        <View style={styles.paymentDetails}>
          <Text style={styles.paymentMethod}>
            {getPaymentMethodLabel(item.payment_method)}
          </Text>
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
          <Text style={styles.paymentDate}>{formatDate(item.created_at)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <CreditCard size={64} color={colors.textSecondary} />
      <Text style={styles.emptyStateTitle}>No Payments Found</Text>
      <Text style={styles.emptyStateText}>
        {localSearchQuery
          ? 'Try adjusting your search terms'
          : 'No payment records available'}
      </Text>
    </View>
  );

  // Permission check
  if (!canViewPayments) {
    return (
      <View style={styles.noPermissionContainer}>
        <AlertTriangle size={48} color={colors.warning} />
        <Text style={styles.noPermissionText}>
          You don't have permission to view payments.
        </Text>
      </View>
    );
  }

  // Loading state
  if (
    loading.payments &&
    (!filteredPayments || filteredPayments.length === 0)
  ) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Payments</Text>
        <Text style={styles.headerSubtitle}>
          {displayPayments.length} payment
          {displayPayments.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          placeholder='Search by booking, user, or receipt...'
          value={localSearchQuery}
          onChangeText={setLocalSearchQuery}
        />
      </View>

      {/* Payments List */}
      <FlatList
        data={displayPayments}
        renderItem={renderPayment}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  header: {
    padding: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  paymentItem: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentContent: {
    flex: 1,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  paymentUser: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  paymentDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentMethod: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  paymentSeparator: {
    fontSize: 14,
    color: colors.textSecondary,
    marginHorizontal: 8,
  },
  paymentBooking: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  paymentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontSize: 11,
    fontWeight: '600',
  },
  paymentDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  noPermissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  noPermissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
} as any);

export default memo(PaymentsListPage);
