import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '@/components/Card';
import { formatCurrency } from '@/utils/agentFormatters';
import Colors from '@/constants/colors';

interface Payment {
  status?: string;
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
  const hasDiscount = discountedAmount && discountedAmount !== totalAmount;
  const finalAmount = discountedAmount || totalAmount;

  const getPaymentMethodDisplay = (method?: string) => {
    switch (method) {
      case 'credit':
        return 'Agent Credit';
      case 'free':
        return 'Free Ticket';
      case 'gateway':
        return 'Payment Gateway';
      default:
        return 'Payment Gateway';
    }
  };

  const getPaymentStatusStyle = (status?: string) => {
    switch (status) {
      case 'completed':
        return styles.paymentPaid;
      case 'pending':
        return styles.paymentPending;
      case 'failed':
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
        <Text style={styles.paymentValue}>{formatCurrency(totalAmount)}</Text>
      </View>

      {hasDiscount && (
        <>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Agent Discount</Text>
            <Text style={[styles.paymentValue, { color: Colors.warning }]}>
              {(
                ((totalAmount - discountedAmount!) / totalAmount) *
                100
              ).toFixed(1)}
              %
            </Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Discount Amount</Text>
            <Text style={[styles.paymentValue, { color: Colors.warning }]}>
              -{formatCurrency(totalAmount - discountedAmount!)}
            </Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Final Amount</Text>
            <Text
              style={[
                styles.paymentValue,
                { color: Colors.primary, fontWeight: '700' },
              ]}
            >
              {formatCurrency(discountedAmount!)}
            </Text>
          </View>
        </>
      )}

      <View style={styles.paymentRow}>
        <Text style={styles.paymentLabel}>Payment Method</Text>
        <Text style={styles.paymentValue}>
          {getPaymentMethodDisplay(paymentMethod)}
        </Text>
      </View>

      {payment && (
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Payment Status</Text>
          <Text
            style={[styles.paymentValue, getPaymentStatusStyle(payment.status)]}
          >
            {(payment.status || 'UNKNOWN').toUpperCase()}
          </Text>
        </View>
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
