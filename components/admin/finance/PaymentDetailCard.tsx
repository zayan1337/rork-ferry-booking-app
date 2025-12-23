import React, { memo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import type { Payment } from '@/types/admin/finance';
import { formatDateInMaldives } from '@/utils/timezoneUtils';
import {
  CreditCard,
  FileText,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  ArrowLeft,
  BarChart3,
} from 'lucide-react-native';

interface PaymentDetailCardProps {
  payment: Payment;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
}

function PaymentDetailCard({
  payment,
  formatCurrency,
  formatDate,
}: PaymentDetailCardProps) {
  const getStatusIcon = () => {
    switch (payment.status) {
      case 'completed':
        return <CheckCircle size={24} color={colors.success} />;
      case 'pending':
        return <Clock size={24} color={colors.warning} />;
      case 'failed':
        return <XCircle size={24} color={colors.danger} />;
      case 'cancelled':
        return <AlertCircle size={24} color={colors.textSecondary} />;
      case 'refunded':
        return <AlertCircle size={24} color={colors.info} />;
      default:
        return <Clock size={24} color={colors.textSecondary} />;
    }
  };

  const getStatusColor = () => {
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
      bml: 'BML',
      mib: 'MIB',
      ooredoo_m_faisa: 'Ooredoo M-Faisaa',
      fahipay: 'FahiPay',
      wallet: 'Wallet',
    };
    return methods[method] || method.toUpperCase();
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleViewBooking = () => {
    if (payment.booking?.id) {
      router.push(
        `/(app)/(admin)/booking-detail?id=${payment.booking.id}` as any
      );
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleGoBack}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Payment Details</Text>
          <Text style={styles.headerSubtitle}>
            {payment.receipt_number || payment.id}
          </Text>
        </View>
      </View>

      {/* Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusIconContainer}>{getStatusIcon()}</View>
        <View style={styles.statusInfo}>
          <Text style={styles.statusLabel}>Payment Status</Text>
          <Text style={[styles.statusValue, { color: getStatusColor() }]}>
            {payment.status.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Amount Card */}
      <View style={styles.amountCard}>
        <DollarSign size={32} color={colors.primary} />
        <Text style={styles.amountLabel}>Total Amount</Text>
        <Text style={styles.amountValue}>{formatCurrency(payment.amount)}</Text>
        <Text style={styles.currency}>{payment.currency}</Text>
      </View>

      {/* Payment Information */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <CreditCard size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Payment Information</Text>
        </View>
        <View style={styles.infoCard}>
          <InfoRow
            label='Payment Method'
            value={getPaymentMethodLabel(payment.payment_method)}
          />
          <InfoRow
            label='Receipt Number'
            value={payment.receipt_number || 'N/A'}
          />
          <InfoRow
            label='Gateway Reference'
            value={payment.gateway_reference || 'N/A'}
          />
          <InfoRow label='Session ID' value={payment.session_id || 'N/A'} />
          <InfoRow
            label='Payment Date'
            value={formatDate(payment.created_at)}
          />
          <InfoRow
            label='Last Updated'
            value={formatDate(payment.updated_at)}
          />
        </View>
      </View>

      {/* Booking Information */}
      {payment.booking && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FileText size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Booking Information</Text>
          </View>
          <Pressable style={styles.infoCard} onPress={handleViewBooking}>
            <InfoRow
              label='Booking Number'
              value={payment.booking.booking_number}
            />
            <InfoRow
              label='Customer Name'
              value={payment.booking.user_name || 'N/A'}
            />
            <InfoRow
              label='Customer Email'
              value={payment.booking.user_email || 'N/A'}
            />
            <InfoRow
              label='Total Fare'
              value={formatCurrency(payment.booking.total_fare)}
            />
            <InfoRow
              label='Booking Status'
              value={payment.booking.status.toUpperCase()}
            />
            <View style={styles.viewBookingButton}>
              <Text style={styles.viewBookingText}>View Booking Details</Text>
              <ArrowLeft
                size={16}
                color={colors.primary}
                style={{ transform: [{ rotate: '180deg' }] }}
              />
            </View>
          </Pressable>
        </View>
      )}

      {/* Additional Details */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <BarChart3 size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Additional Details</Text>
        </View>
        <View style={styles.infoCard}>
          <InfoRow label='Payment ID' value={payment.id} />
          <InfoRow label='Booking ID' value={payment.booking_id} />
          <InfoRow
            label='Created At'
            value={formatDateInMaldives(payment.created_at, 'datetime')}
          />
          <InfoRow
            label='Updated At'
            value={formatDateInMaldives(payment.updated_at, 'datetime')}
          />
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
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 20,
    margin: 16,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.backgroundSecondary,
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
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  amountCard: {
    backgroundColor: colors.primary + '15',
    padding: 24,
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  amountLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
    marginBottom: 8,
  },
  amountValue: {
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
  viewBookingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  viewBookingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
} as any);

export default memo(PaymentDetailCard);
