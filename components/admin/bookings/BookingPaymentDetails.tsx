import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/adminColors';
import { AdminBooking } from '@/types/admin/management';
import {
  CreditCard,
  DollarSign,
  Calendar,
  Percent,
  Receipt,
} from 'lucide-react-native';
import StatusBadge from '@/components/admin/StatusBadge';
import { formatCurrency } from '@/utils/admin/bookingManagementUtils';

interface BookingPaymentDetailsProps {
  booking: AdminBooking;
}

export default function BookingPaymentDetails({
  booking,
}: BookingPaymentDetailsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Receipt size={20} color={colors.primary} />
        <Text style={styles.title}>Payment Details</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.row}>
          <View style={styles.iconContainer}>
            <DollarSign size={20} color={colors.primary} />
          </View>
          <View style={styles.content}>
            <Text style={styles.label}>Total Amount</Text>
            <Text style={styles.amount}>
              {formatCurrency(booking.trip_base_fare || 0)}
            </Text>
          </View>
        </View>

        {/* Show paid amount */}
        <View style={styles.row}>
          <View style={styles.iconContainer}>
            <CreditCard size={20} color={colors.primary} />
          </View>
          <View style={styles.content}>
            <Text style={styles.label}>Paid Amount</Text>
            <Text style={styles.value}>
              {formatCurrency(booking.payment_amount || 0)}
            </Text>
          </View>
        </View>

        {/* Show agent discount if applicable */}
        {booking.agent_id && booking.payment_amount && booking.total_fare && (
          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <Percent size={20} color={colors.success} />
            </View>
            <View style={styles.content}>
              <Text style={styles.label}>Agent Discount</Text>
              <Text style={styles.discountValue}>
                -
                {formatCurrency(
                  (booking.trip_base_fare || 0) - (booking.payment_amount || 0)
                )}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.row}>
          <View style={styles.iconContainer}>
            <CreditCard size={20} color={colors.primary} />
          </View>
          <View style={styles.content}>
            <Text style={styles.label}>Payment Method</Text>
            <Text style={styles.value}>
              {booking.payment_method ||
                booking.payment_method_type ||
                (booking.status === 'confirmed' ? 'Paid' : 'Not specified')}
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.iconContainer}>
            <Calendar size={20} color={colors.primary} />
          </View>
          <View style={styles.content}>
            <Text style={styles.label}>Payment Status</Text>
            <View style={styles.statusContainer}>
              <StatusBadge
                status={
                  booking.payment_status
                    ? (booking.payment_status as any)
                    : booking.status === 'confirmed'
                      ? 'paid'
                      : booking.status === 'pending_payment'
                        ? 'pending_payment'
                        : 'pending'
                }
                variant='payment'
              />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.paymentInfo}>
        <View style={styles.infoHeader}>
          <Receipt size={16} color={colors.textSecondary} />
          <Text style={styles.infoTitle}>Payment Information</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Base Fare:</Text>
          <Text style={styles.infoValue}>
            {formatCurrency(booking.trip_base_fare || 0)}
          </Text>
        </View>

        {booking.agent_id && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Agent:</Text>
            <Text style={styles.infoValue}>
              {booking.agent_name || 'Unknown Agent'}
            </Text>
          </View>
        )}

        {booking.agent_id && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Agent Email:</Text>
            <Text style={styles.infoValue}>{booking.agent_email || 'N/A'}</Text>
          </View>
        )}

        {booking.agent_client_id && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Agent Client:</Text>
            <Text style={styles.infoValue}>#{booking.agent_client_id}</Text>
          </View>
        )}

        {booking.round_trip_group_id && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Round Trip Group:</Text>
            <Text style={styles.infoValue}>#{booking.round_trip_group_id}</Text>
          </View>
        )}
      </View>

      {/* Payment Summary */}
      {booking.agent_id && booking.payment_amount && booking.total_fare && (
        <View style={styles.paymentSummary}>
          <View style={styles.summaryHeader}>
            <DollarSign size={16} color={colors.textSecondary} />
            <Text style={styles.summaryTitle}>Payment Summary</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Original Fare:</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(booking.trip_base_fare || 0)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Agent Discount:</Text>
            <Text style={styles.summaryDiscount}>
              -
              {formatCurrency(
                (booking.trip_base_fare || 0) - (booking.payment_amount || 0)
              )}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.finalRow]}>
            <Text style={styles.summaryLabel}>Final Amount:</Text>
            <Text style={styles.summaryFinal}>
              {formatCurrency(booking.payment_amount)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  section: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  amount: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: '700',
  },
  value: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  discountValue: {
    fontSize: 16,
    color: colors.success,
    fontWeight: '600',
  },
  statusContainer: {
    marginTop: 4,
  },
  paymentInfo: {
    borderTopWidth: 1,
    borderTopColor: `${colors.border}40`,
    paddingTop: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  paymentSummary: {
    borderTopWidth: 1,
    borderTopColor: `${colors.border}40`,
    paddingTop: 16,
    marginTop: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  summaryDiscount: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '600',
  },
  finalRow: {
    borderTopWidth: 1,
    borderTopColor: `${colors.border}40`,
    paddingTop: 8,
    marginTop: 8,
  },
  summaryFinal: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
  },
});
