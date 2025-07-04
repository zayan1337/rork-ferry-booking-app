import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { formatCurrency } from '@/utils/agentFormatters';
import Colors from '@/constants/colors';

type RefundMethod = 'agent_credit' | 'original_payment' | 'bank_transfer';

interface BankDetails {
  accountNumber: string;
  accountName: string;
  bankName: string;
}

interface RefundConfigurationCardProps {
  refundMethod: RefundMethod;
  onRefundMethodChange: (method: RefundMethod) => void;
  refundPercentage: number;
  onRefundPercentageChange: (percentage: number) => void;
  bankDetails: BankDetails;
  onBankDetailsChange: (details: BankDetails) => void;
  refundAmount: number;
  bankDetailsError?: string;
}

const RefundConfigurationCard: React.FC<RefundConfigurationCardProps> = ({
  refundMethod,
  onRefundMethodChange,
  refundPercentage,
  onRefundPercentageChange,
  bankDetails,
  onBankDetailsChange,
  refundAmount,
  bankDetailsError,
}) => {
  return (
    <Card variant="elevated" style={styles.refundCard}>
      <Text style={styles.cardTitle}>Refund Configuration</Text>

      <View style={styles.refundMethodContainer}>
        <Text style={styles.refundMethodLabel}>Refund Method</Text>
        <View style={styles.refundMethods}>
          <Button
            title="Agent Credit"
            onPress={() => onRefundMethodChange('agent_credit')}
            variant={refundMethod === 'agent_credit' ? 'primary' : 'outline'}
            style={styles.refundMethodButton}
            textStyle={styles.refundMethodText}
          />
          <Button
            title="Original Payment"
            onPress={() => onRefundMethodChange('original_payment')}
            variant={refundMethod === 'original_payment' ? 'primary' : 'outline'}
            style={styles.refundMethodButton}
            textStyle={styles.refundMethodText}
          />
          <Button
            title="Bank Transfer"
            onPress={() => onRefundMethodChange('bank_transfer')}
            variant={refundMethod === 'bank_transfer' ? 'primary' : 'outline'}
            style={styles.refundMethodButton}
            textStyle={styles.refundMethodText}
          />
        </View>

        {/* Bank Details Form - shown only for bank transfer */}
        {refundMethod === 'bank_transfer' && (
          <View style={styles.bankDetailsContainer}>
            <Text style={styles.bankDetailsTitle}>Bank Transfer Details</Text>

            <Input
              label="Account Number"
              placeholder="Enter bank account number"
              value={bankDetails.accountNumber}
              onChangeText={(text) => onBankDetailsChange({ ...bankDetails, accountNumber: text })}
              keyboardType="numeric"
              required
            />

            <Input
              label="Account Holder Name"
              placeholder="Enter account holder name"
              value={bankDetails.accountName}
              onChangeText={(text) => onBankDetailsChange({ ...bankDetails, accountName: text })}
              required
            />

            <Input
              label="Bank Name"
              placeholder="Enter bank name"
              value={bankDetails.bankName}
              onChangeText={(text) => onBankDetailsChange({ ...bankDetails, bankName: text })}
              required
            />

            {bankDetailsError ? (
              <Text style={styles.errorText}>{bankDetailsError}</Text>
            ) : null}
          </View>
        )}
      </View>

      <View style={styles.refundPercentageContainer}>
        <Text style={styles.refundPercentageLabel}>Refund Percentage</Text>
        <View style={styles.refundPercentageButtons}>
          <Button
            title="50%"
            onPress={() => onRefundPercentageChange(50)}
            variant={refundPercentage === 50 ? 'primary' : 'outline'}
            style={styles.percentageButton}
          />
          <Button
            title="75%"
            onPress={() => onRefundPercentageChange(75)}
            variant={refundPercentage === 75 ? 'primary' : 'outline'}
            style={styles.percentageButton}
          />
          <Button
            title="100%"
            onPress={() => onRefundPercentageChange(100)}
            variant={refundPercentage === 100 ? 'primary' : 'outline'}
            style={styles.percentageButton}
          />
        </View>
      </View>

      <View style={styles.refundAmountRow}>
        <Text style={styles.refundAmountLabel}>Refund Amount:</Text>
        <Text style={styles.refundAmountValue}>{formatCurrency(refundAmount)}</Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  refundCard: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  refundMethodContainer: {
    marginBottom: 16,
  },
  refundMethodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  refundMethods: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  refundMethodButton: {
    flex: 1,
  },
  refundMethodText: {
    fontSize: 12,
  },
  bankDetailsContainer: {
    marginTop: 16,
  },
  bankDetailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  refundPercentageContainer: {
    marginBottom: 16,
  },
  refundPercentageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  refundPercentageButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  percentageButton: {
    flex: 1,
  },
  refundAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  refundAmountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  refundAmountValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    marginTop: 4,
  },
});

export default RefundConfigurationCard; 