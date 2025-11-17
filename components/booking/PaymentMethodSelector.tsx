import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '@/components/Card';
import Dropdown from '@/components/Dropdown';
import Colors from '@/constants/colors';

type PaymentMethod = 'agent_credit' | 'mib';

interface PaymentMethodSelectorProps {
  fareDifference: number;
  selectedPaymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  error?: string;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  fareDifference,
  selectedPaymentMethod,
  onPaymentMethodChange,
  error,
}) => {
  if (fareDifference === 0) return null;

  const isRefund = fareDifference < 0;
  const title = isRefund ? 'Refund Method' : 'Payment Method';
  const paymentOptions = isRefund
    ? [{ label: '💳 Agent Credit', value: 'agent_credit' }]
    : [
        { label: '💳 Agent Credit', value: 'agent_credit' },
        { label: '🌐 MIB Gateway', value: 'mib' },
      ];

  return (
    <Card variant='elevated' style={styles.paymentMethodCard}>
      <View style={styles.paymentMethodContainer}>
        <Text style={styles.paymentMethodTitle}>{title}</Text>
        <Dropdown
          label={title}
          items={paymentOptions}
          value={selectedPaymentMethod}
          onChange={value => onPaymentMethodChange(value as PaymentMethod)}
          placeholder={`Select ${isRefund ? 'refund' : 'payment'} method`}
          error={error}
          required
        />
      </View>

      <Text style={styles.fareNote}>
        {selectedPaymentMethod === 'mib'
          ? 'Payment will be processed securely through MIB Gateway.'
          : isRefund
            ? 'Refund will be credited to your agent account.'
            : 'Amount will be deducted from your agent credit balance.'}
      </Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  paymentMethodCard: {
    marginBottom: 16,
  },
  paymentMethodContainer: {
    marginBottom: 16,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  fareNote: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default PaymentMethodSelector;
