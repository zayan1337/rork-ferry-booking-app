import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useFinanceData } from '@/hooks/useFinanceData';
import {
  ArrowLeft,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  FileText,
  Calendar,
  DollarSign,
  BarChart3,
  ExternalLink,
  RefreshCw,
} from 'lucide-react-native';
import { formatDateInMaldives } from '@/utils/timezoneUtils';

export default function PaymentDetailPage() {
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const { getPaymentById, formatCurrency, formatDate, loading, handleRefresh } =
    useFinanceData();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const payment = getPaymentById(paymentId);

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      await handleRefresh();
    } catch (error) {
      console.error('Error refreshing payment:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusIcon = () => {
    if (!payment) return null;
    switch (payment.status) {
      case 'completed':
        return <CheckCircle size={28} color={colors.success} />;
      case 'pending':
        return <Clock size={28} color={colors.warning} />;
      case 'failed':
        return <XCircle size={28} color={colors.danger} />;
      case 'cancelled':
        return <AlertCircle size={28} color={colors.textSecondary} />;
      case 'refunded':
        return <RefreshCw size={28} color={colors.info} />;
      default:
        return <Clock size={28} color={colors.textSecondary} />;
    }
  };

  const getStatusColor = () => {
    if (!payment) return colors.textSecondary;
    switch (payment.status) {
      case 'completed':
        return colors.success;
      case 'pending':
        return colors.warning;
      case 'failed':
        return colors.danger;
      case 'cancelled':
        return colors.textSecondary;
      case 'refunded':
        return colors.info;
      default:
        return colors.textSecondary;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      bank_transfer: 'Bank Transfer',
      bml: 'Bank of Maldives (BML)',
      mib: 'Maldives Islamic Bank (MIB)',
      ooredoo_m_faisa: 'Ooredoo M-Faisaa',
      fahipay: 'FahiPay',
      wallet: 'Wallet',
    };
    return methods[method] || method.toUpperCase();
  };

  if (loading.payments && !payment) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Payment Details',
          }}
        />
        <View style={styles.loadingContainer}>
          <RefreshCw size={48} color={colors.primary} />
          <Text style={styles.loadingText}>Loading payment details...</Text>
        </View>
      </View>
    );
  }

  if (!payment) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Payment Not Found',
          }}
        />
        <View style={styles.notFoundContainer}>
          <View style={styles.notFoundIcon}>
            <AlertCircle size={40} color={colors.warning} />
          </View>
          <Text style={styles.notFoundTitle}>Payment Not Found</Text>
          <Text style={styles.notFoundText}>
            The payment you're looking for doesn't exist or has been removed.
          </Text>
          <Pressable
            style={styles.backToListButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color={colors.primary} />
            <Text style={styles.backToListText}>Back to Payments</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Payment Details',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={colors.primary} />
            </Pressable>
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
              { backgroundColor: getStatusColor() + '15' },
            ]}
          >
            {getStatusIcon()}
          </View>
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>Payment Status</Text>
            <Text style={[styles.statusValue, { color: getStatusColor() }]}>
              {payment.status.replace('_', ' ').toUpperCase()}
            </Text>
            <Text style={styles.statusDate}>
              {formatDateInMaldives(payment.updated_at, 'datetime')}
            </Text>
          </View>
        </View>

        {/* Amount Card */}
        <View style={styles.amountCard}>
          <View style={styles.amountIconContainer}>
            <DollarSign size={40} color={colors.primary} />
          </View>
          <Text style={styles.amountLabel}>Payment Amount</Text>
          <Text style={styles.amountValue}>
            {formatCurrency(payment.amount)}
          </Text>
          <View style={styles.currencyBadge}>
            <Text style={styles.currency}>{payment.currency}</Text>
          </View>
        </View>

        {/* Payment Method Card */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <CreditCard size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Payment Method</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.methodCard}>
              <Text style={styles.methodLabel}>Payment Provider</Text>
              <Text style={styles.methodValue}>
                {getPaymentMethodLabel(payment.payment_method)}
              </Text>
            </View>
            {payment.receipt_number && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Receipt Number</Text>
                <Text style={styles.infoValue}>{payment.receipt_number}</Text>
              </View>
            )}
            {payment.gateway_reference && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Gateway Reference</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {payment.gateway_reference}
                </Text>
              </View>
            )}
            {payment.session_id && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Session ID</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {payment.session_id}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Booking Information */}
        {payment.booking && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <FileText size={20} color={colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>Booking Information</Text>
            </View>
            <Pressable
              style={styles.card}
              onPress={() =>
                router.push(
                  `/(app)/(admin)/booking/${payment.booking!.id}` as any
                )
              }
            >
              <View style={styles.bookingHeader}>
                <View>
                  <Text style={styles.bookingNumber}>
                    {payment.booking.booking_number}
                  </Text>
                  <View
                    style={[
                      styles.bookingStatusBadge,
                      {
                        backgroundColor:
                          payment.booking.status === 'confirmed'
                            ? colors.success + '15'
                            : colors.warning + '15',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.bookingStatusText,
                        {
                          color:
                            payment.booking.status === 'confirmed'
                              ? colors.success
                              : colors.warning,
                        },
                      ]}
                    >
                      {payment.booking.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <ExternalLink size={20} color={colors.primary} />
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Customer Name</Text>
                <Text style={styles.infoValue}>
                  {payment.booking.user_name || 'N/A'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Customer Email</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {payment.booking.user_email || 'N/A'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total Fare</Text>
                <Text style={[styles.infoValue, styles.fareValue]}>
                  {formatCurrency(payment.booking.total_fare)}
                </Text>
              </View>

              <Pressable
                style={styles.viewDetailsButton}
                onPress={() =>
                  router.push(
                    `/(app)/(admin)/booking/${payment.booking!.id}` as any
                  )
                }
              >
                <Text style={styles.viewDetailsText}>View Booking Details</Text>
                <ExternalLink size={16} color={colors.primary} />
              </Pressable>
            </Pressable>
          </View>
        )}

        {/* Transaction Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Calendar size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Transaction Timeline</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Payment Created</Text>
                <Text style={styles.timelineDate}>
                  {formatDateInMaldives(payment.created_at, 'full')} at{' '}
                  {formatDateInMaldives(payment.created_at, 'time')}
                </Text>
              </View>
            </View>

            <View style={styles.timelineItem}>
              <View
                style={[
                  styles.timelineDot,
                  { backgroundColor: getStatusColor() },
                ]}
              />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Last Updated</Text>
                <Text style={styles.timelineDate}>
                  {formatDateInMaldives(payment.updated_at, 'full')} at{' '}
                  {formatDateInMaldives(payment.updated_at, 'time')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Technical Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <BarChart3 size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Technical Information</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Payment ID</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {payment.id}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Booking ID</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {payment.booking_id}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Currency</Text>
              <Text style={styles.infoValue}>{payment.currency}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Payment Method Code</Text>
              <Text style={styles.infoValue}>{payment.payment_method}</Text>
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
  amountCard: {
    backgroundColor: colors.primary + '10',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: colors.primary + '20',
  },
  amountIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  amountValue: {
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
  methodCard: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  methodLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  methodValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
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
  fareValue: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  bookingNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  bookingStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  bookingStatusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
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
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    marginTop: 4,
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
} as any);
