import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '@/components/Card';
import { formatCurrency } from '@/utils/agentFormatters';
import Colors from '@/constants/colors';

interface Payment {
  status?: string;
  method?: string;
  payment_method?: string;
  receipt_number?: string | null;
}

interface PaymentDetailsCardProps {
  totalAmount: number;
  discountedAmount?: number;
  paymentMethod?: string;
  payment?: Payment;
  commission?: number;
}

const PaymentDetailsCard: React.FC<PaymentDetailsCardProps> = ({
  totalAmount,
  discountedAmount,
  paymentMethod,
  payment,
  commission,
}) => {
  // Based on agentBookingsStore.ts:
  // - totalAmount = originalFare (calculated from trip base_fare × multiplier × passengers)
  // - discountedAmount = discountedFare (booking.total_fare from database - what was actually paid)
  // The final amount is what was actually paid (discountedAmount if available, otherwise totalAmount)
  const finalAmount = discountedAmount || totalAmount;

  // totalAmount is always the original fare (before discount)
  const originalAmount = totalAmount;

  // Only show discount if discountedAmount exists, is less than originalAmount (actual discount), and is different
  const hasDiscount =
    discountedAmount &&
    discountedAmount < originalAmount &&
    discountedAmount !== originalAmount &&
    originalAmount > 0;

  const discountAmount = hasDiscount ? originalAmount - discountedAmount : 0;
  const discountPercentage =
    hasDiscount && originalAmount > 0
      ? (discountAmount / originalAmount) * 100
      : 0;

  const getPaymentMethodDisplay = (method?: string) => {
    if (!method) return 'Not Specified';

    switch (method.toLowerCase()) {
      case 'credit':
        return 'Agent Credit';
      case 'mib':
        return 'MIB';
      case 'free':
        return 'Free Ticket';
      case 'gateway':
        return 'Payment Gateway';
      case 'cash':
        return 'Cash';
      case 'bank_transfer':
        return 'Bank Transfer';
      default:
        // Return formatted version of the method name
        return method
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
    }
  };

  // Determine the actual payment method used
  // Priority: 1) paymentMethod prop (booking's payment_method_type - most accurate for agent credit),
  //           2) payment.method or payment.payment_method (actual payment record)
  // For agent credit bookings, payment record may show 'wallet' but booking's payment_method_type is 'credit'
  // So we prioritize booking's payment_method_type, especially for 'credit'
  const actualPaymentMethod =
    paymentMethod === 'credit'
      ? 'credit' // Always use 'credit' if booking's payment_method_type is 'credit'
      : paymentMethod || payment?.method || payment?.payment_method;

  const getPaymentStatusStyle = (status?: string) => {
    switch (status) {
      case 'completed':
        return styles.paymentPaid;
      case 'pending':
        return styles.paymentPending;
      case 'failed':
      case 'cancelled':
        return styles.paymentFailed;
      default:
        return {};
    }
  };

  return (
    <Card variant='elevated' style={styles.paymentCard}>
      <Text style={styles.cardTitle}>Payment Details</Text>

      <View style={styles.paymentRow}>
        <Text style={styles.paymentLabel}>Original Amount</Text>
        <Text style={styles.paymentValue}>
          {formatCurrency(originalAmount)}
        </Text>
      </View>

      {/* Always show discount/adjustment details if discountedAmount exists and is different from totalAmount */}
      {discountedAmount && discountedAmount !== totalAmount && (
        <>
          {hasDiscount && discountPercentage > 0 ? (
            <>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Agent Discount</Text>
                <Text style={[styles.paymentValue, { color: Colors.success }]}>
                  {discountPercentage.toFixed(1)}%
                </Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Discount Amount</Text>
                <Text style={[styles.paymentValue, { color: Colors.success }]}>
                  -{formatCurrency(discountAmount)}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Price Adjustment</Text>
              <Text style={[styles.paymentValue, { color: Colors.warning }]}>
                {discountedAmount > originalAmount ? '+' : ''}
                {formatCurrency(discountedAmount - originalAmount)}
              </Text>
            </View>
          )}
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Final Amount</Text>
            <Text
              style={[
                styles.paymentValue,
                { color: Colors.primary, fontWeight: '700' },
              ]}
            >
              {formatCurrency(discountedAmount)}
            </Text>
          </View>
        </>
      )}

      <View style={styles.paymentRow}>
        <Text style={styles.paymentLabel}>Payment Method</Text>
        <Text style={styles.paymentValue}>
          {getPaymentMethodDisplay(actualPaymentMethod)}
        </Text>
      </View>

      {payment && (
        <>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Payment Status</Text>
            <Text
              style={[
                styles.paymentValue,
                getPaymentStatusStyle(payment.status),
              ]}
            >
              {(payment.status || 'UNKNOWN').toUpperCase()}
            </Text>
          </View>
          {payment.receipt_number && (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Receipt Number</Text>
              <Text style={styles.paymentValue}>{payment.receipt_number}</Text>
            </View>
          )}
        </>
      )}

      {commission && commission > 0 && (
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Agent Commission</Text>
          <Text
            style={[
              styles.paymentValue,
              { color: Colors.secondary, fontWeight: '700' },
            ]}
          >
            {formatCurrency(commission)}
          </Text>
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.paymentRow}>
        <Text
          style={[styles.paymentLabel, { fontSize: 16, fontWeight: '600' }]}
        >
          Total Paid
        </Text>
        <Text
          style={[
            styles.paymentValue,
            { fontSize: 18, fontWeight: '700', color: Colors.primary },
          ]}
        >
          {formatCurrency(finalAmount)}
        </Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  paymentCard: {
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  paymentPaid: {
    color: Colors.success,
  },
  paymentPending: {
    color: Colors.warning,
  },
  paymentFailed: {
    color: Colors.error,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
});

export default PaymentDetailsCard;
