import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/adminColors';
import { AdminBooking } from '@/types/admin/management';
import { CreditCard, Calendar, Receipt } from 'lucide-react-native';
import StatusBadge from '@/components/admin/StatusBadge';
import { formatCurrency } from '@/utils/admin/bookingManagementUtils';

interface BookingPaymentDetailsProps {
  booking: AdminBooking;
}

export default function BookingPaymentDetails({
  booking,
}: BookingPaymentDetailsProps) {
  const baseFare = booking.trip_base_fare || booking.total_fare || 0;
  const paidAmount = booking.payment_amount || 0;
  const outstanding = Math.max(0, baseFare - paidAmount);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Receipt size={20} color={colors.primary} />
        <Text style={styles.title}>Payment Details</Text>
      </View>

      {/* Payment Amount */}
      <View style={styles.fareSection}>
        <View style={[styles.fareRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Amount Paid</Text>
          <Text style={styles.totalValue}>{formatCurrency(paidAmount)}</Text>
        </View>
        {outstanding > 0 && (
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Outstanding</Text>
            <Text style={[styles.fareValue, { color: colors.warning }]}>
              {formatCurrency(outstanding)}
            </Text>
          </View>
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
});
