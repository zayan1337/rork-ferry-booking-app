import React, { useState, useMemo, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useFinanceStore } from '@/store/admin/financeStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { Payment } from '@/types/admin/finance';
import {
  Eye,
  AlertTriangle,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react-native';

// Components
import SectionHeader from '@/components/admin/SectionHeader';
import SearchBar from '@/components/admin/SearchBar';

interface PaymentsTabProps {
  isActive: boolean;
  searchQuery?: string;
}

function PaymentsTab({ isActive, searchQuery = '' }: PaymentsTabProps) {
  const { canViewPayments, canManagePayments } = useAdminPermissions();
  const { payments, loading, fetchPayments, setSearchQuery, searchQueries } =
    useFinanceStore();

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Local search state - completely client-side, no store updates
  const [localSearchQuery, setLocalSearchQuery] = useState('');

  // Filter payments based on search query - client-side only
  const filteredPayments = useMemo(() => {
    if (!payments) return [];

    if (!localSearchQuery.trim()) return payments;

    const query = localSearchQuery.toLowerCase().trim();
    return payments.filter(
      payment =>
        payment.booking?.booking_number?.toLowerCase().includes(query) ||
        payment.booking?.user_name?.toLowerCase().includes(query) ||
        payment.receipt_number?.toLowerCase().includes(query)
    );
  }, [payments, localSearchQuery]);

  // Limit payments to 4 for display
  const displayPayments = useMemo(() => {
    return filteredPayments.slice(0, 4);
  }, [filteredPayments]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchPayments(true);
    } catch (error) {
      console.error('Error refreshing payments:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePaymentPress = (paymentId: string) => {
    if (canViewPayments()) {
      router.push(
        `/(app)/(admin)/payment-detail?paymentId=${paymentId}` as any
      );
    }
  };

  const handleViewAllPayments = () => {
    router.push('/(app)/(admin)/payments' as any);
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

  // Permission check
  if (!canViewPayments()) {
    return (
      <View style={styles.noPermissionContainer}>
        <AlertTriangle size={48} color={colors.warning} />
        <Text style={styles.noPermissionText}>
          You don't have permission to view payments.
        </Text>
      </View>
    );
  }

  // Don't show loading spinner - let the page render with empty state instead
  // This prevents the "always loading" issue

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderContent}>
          <SectionHeader
            title='Payment Management'
            subtitle={
              loading.payments
                ? 'Loading payments...'
                : `${payments?.length || 0} total payments`
            }
          />
        </View>
      </View>

      {/* Search Bar */}
      <SearchBar
        placeholder='Search payments...'
        value={localSearchQuery}
        onChangeText={setLocalSearchQuery}
      />

      {/* Payments List */}
      <View style={styles.itemsList}>
        {displayPayments.length > 0 ? (
          displayPayments.map((payment: Payment, index: number) => (
            <TouchableOpacity
              key={`payment-${payment.id}-${index}`}
              style={styles.paymentItem}
              onPress={() => handlePaymentPress(payment.id)}
            >
              <View style={styles.paymentIcon}>
                <CreditCard size={20} color={colors.primary} />
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentUser}>
                  {payment.booking?.user_name || 'Unknown User'}
                </Text>
                <Text style={styles.paymentDetails}>
                  {payment.payment_method.toUpperCase()} •{' '}
                  {payment.booking?.booking_number || 'N/A'}
                </Text>
                <Text style={styles.paymentAmount}>
                  MVR {payment.amount.toFixed(2)}
                </Text>
              </View>
              <View style={styles.paymentStatus}>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(payment.status) + '15' },
                  ]}
                >
                  {getStatusIcon(payment.status)}
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(payment.status) },
                    ]}
                  >
                    {payment.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <CreditCard size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>No payments found</Text>
            <Text style={styles.emptyStateText}>
              {localSearchQuery
                ? 'Try adjusting your search terms'
                : 'No payments available'}
            </Text>
          </View>
        )}
      </View>

      {/* View All Button */}
      <TouchableOpacity
        style={styles.viewAllButton}
        onPress={handleViewAllPayments}
      >
        <Text style={styles.viewAllText}>View All Payments</Text>
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
  paymentItem: {
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
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
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
  paymentDetails: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  paymentStatus: {
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

export default memo(PaymentsTab);
