import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/adminColors';
import { AdminBooking } from '@/types/admin/management';
import { CreditCard, Calendar, Receipt } from 'lucide-react-native';
import StatusBadge from '@/components/admin/StatusBadge';
import { formatCurrency } from '@/utils/admin/bookingManagementUtils';

interface BookingPaymentDetailsProps {
  booking: AdminBooking;
  actualPaymentAmount?: number | null; // For cancelled bookings, actual payment from payments table
  cancellationData?: {
    refund_amount: number;
    cancellation_fee: number;
    refund_status?: string;
  } | null;
  originalPaymentAmount?: number | null; // Original payment amount before refund
  paymentRefundStatus?: string | null; // Payment status: 'refunded' or 'partially_refunded'
  receiptNumber?: string | null; // Receipt number from payments table
}

export default function BookingPaymentDetails({
  booking,
  actualPaymentAmount,
  cancellationData,
  originalPaymentAmount,
  paymentRefundStatus,
  receiptNumber,
}: BookingPaymentDetailsProps) {
  const isCancelled = booking.status === 'cancelled';
  const totalFare = booking.total_fare || 0;
  const baseFare = booking.trip_base_fare || totalFare;
  const isRefunded =
    paymentRefundStatus === 'refunded' ||
    paymentRefundStatus === 'partially_refunded';

  // Get actual payment amount
  // For cancelled bookings: use actualPaymentAmount if provided (from payments table)
  // Otherwise use payment_amount from view (which only counts 'completed' payments)
  const paidAmount =
    actualPaymentAmount !== null && actualPaymentAmount !== undefined
      ? actualPaymentAmount
      : booking.payment_amount
        ? Number(booking.payment_amount)
        : 0;

  // For refunded payments, use original payment amount
  const originalPaid =
    originalPaymentAmount !== null && originalPaymentAmount !== undefined
      ? originalPaymentAmount
      : paidAmount;

  // For cancelled bookings, show refund/cancellation info instead of outstanding
  // Outstanding doesn't make sense for cancelled bookings
  const outstanding = isCancelled ? 0 : Math.max(0, totalFare - paidAmount);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Receipt size={20} color={colors.primary} />
        <Text style={styles.title}>Payment Details</Text>
      </View>

      {/* Payment Amount */}
      <View style={styles.fareSection}>
        {isCancelled ? (
          <>
            {/* For cancelled bookings, show booking total and refund info */}
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Booking Total</Text>
              <Text style={styles.fareValue}>{formatCurrency(totalFare)}</Text>
            </View>
            {/* Show original payment amount if payment was refunded */}
            {isRefunded && originalPaid > 0 ? (
              <>
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Original Payment</Text>
                  <Text style={styles.fareValue}>
                    {formatCurrency(originalPaid)}
                  </Text>
                </View>
                <View style={styles.fareRow}>
                  <Text style={[styles.fareLabel, { color: colors.success }]}>
                    Payment Status:{' '}
                    {paymentRefundStatus === 'refunded'
                      ? 'Fully Refunded'
                      : 'Partially Refunded'}
                  </Text>
                </View>
              </>
            ) : paidAmount > 0 ? (
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Amount Paid</Text>
                <Text style={styles.fareValue}>
                  {formatCurrency(paidAmount)}
                </Text>
              </View>
            ) : null}
            {cancellationData && cancellationData.cancellation_fee > 0 && (
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Cancellation Fee</Text>
                <Text style={[styles.fareValue, { color: colors.warning }]}>
                  {formatCurrency(cancellationData.cancellation_fee)}
                </Text>
              </View>
            )}
            {cancellationData && cancellationData.refund_amount > 0 && (
              <View style={[styles.fareRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Refund Amount</Text>
                <Text style={[styles.totalValue, { color: colors.success }]}>
                  {formatCurrency(cancellationData.refund_amount)}
                </Text>
              </View>
            )}
            {paidAmount === 0 && originalPaid === 0 && !cancellationData && (
              <View style={styles.fareRow}>
                <Text style={[styles.fareLabel, { fontStyle: 'italic' }]}>
                  No payment was made for this booking
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            {/* For active bookings, show amount paid and outstanding */}
            <View style={[styles.fareRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Amount Paid</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(paidAmount)}
              </Text>
            </View>
            {outstanding > 0 && (
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Outstanding</Text>
                <Text style={[styles.fareValue, { color: colors.warning }]}>
                  {formatCurrency(outstanding)}
                </Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* Payment Info */}
      <View style={styles.section}>
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
                  // For refunded payments, show refunded status
                  paymentRefundStatus === 'refunded' ||
                  paymentRefundStatus === 'partially_refunded'
                    ? (paymentRefundStatus as any)
                    : booking.payment_status
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

        {receiptNumber && (
          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <Receipt size={20} color={colors.primary} />
            </View>
            <View style={styles.content}>
              <Text style={styles.label}>Receipt Number</Text>
              <Text style={styles.value}>{receiptNumber}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Additional Info */}
      {(booking.agent_id || booking.round_trip_group_id) && (
        <View style={styles.additionalInfo}>
          <Text style={styles.infoTitle}>Additional Information</Text>

          {booking.agent_id && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Booked by Agent:</Text>
                <Text style={styles.infoValue}>
                  {booking.agent_name || 'Unknown'}
                </Text>
              </View>
              {booking.agent_email && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Agent Email:</Text>
                  <Text style={styles.infoValue}>{booking.agent_email}</Text>
                </View>
              )}
            </>
          )}

          {booking.round_trip_group_id && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Round Trip Group:</Text>
              <Text style={styles.infoValue}>
                #{booking.round_trip_group_id}
              </Text>
            </View>
          )}
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
  fareSection: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  fareLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  fareValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: `${colors.border}40`,
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: '700',
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
  value: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  statusContainer: {
    marginTop: 4,
  },
  additionalInfo: {
    borderTopWidth: 1,
    borderTopColor: `${colors.border}40`,
    paddingTop: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    flexShrink: 1,
    marginRight: 8,
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    flexShrink: 1,
    flex: 1,
    textAlign: 'right',
  },
});
