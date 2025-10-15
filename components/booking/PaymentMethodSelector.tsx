import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Card from '@/components/Card';
import Input from '@/components/Input';
import Colors from '@/constants/colors';

type PaymentMethod = 'agent_credit' | 'bank_transfer' | 'mib';

interface BankDetails {
  accountNumber: string;
  accountName: string;
  bankName: string;
}

interface PaymentMethodSelectorProps {
  fareDifference: number;
  selectedPaymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  bankAccountDetails: BankDetails;
  onBankDetailsChange: (details: BankDetails) => void;
  errors: {
    accountNumber?: string;
    accountName?: string;
    bankName?: string;
  };
  onErrorClear: (field: string) => void;
  onFocus?: (field: string) => void;
  inputRefs?: React.MutableRefObject<any>;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  fareDifference,
  selectedPaymentMethod,
  onPaymentMethodChange,
  bankAccountDetails,
  onBankDetailsChange,
  errors,
  onErrorClear,
  onFocus,
  inputRefs,
}) => {
  if (fareDifference === 0) return null;

  const isRefund = fareDifference < 0;
  const title = isRefund ? 'Refund Method' : 'Payment Method';

  return (
    <Card variant='elevated' style={styles.paymentMethodCard}>
      <View style={styles.paymentMethodContainer}>
        <Text style={styles.paymentMethodTitle}>{title}</Text>

        <View style={styles.paymentOptions}>
          {/* Agent Credit Option */}
          <Pressable
            style={[
              styles.paymentOption,
              selectedPaymentMethod === 'agent_credit' &&
                styles.paymentOptionSelected,
            ]}
            onPress={() => onPaymentMethodChange('agent_credit')}
          >
            <Text
              style={[
                styles.paymentOptionText,
                selectedPaymentMethod === 'agent_credit' &&
                  styles.paymentOptionTextSelected,
              ]}
            >
              💳 Agent Credit
            </Text>
          </Pressable>

          {/* Bank Transfer Option */}
          <Pressable
            style={[
              styles.paymentOption,
              selectedPaymentMethod === 'bank_transfer' &&
                styles.paymentOptionSelected,
            ]}
            onPress={() => onPaymentMethodChange('bank_transfer')}
          >
            <Text
              style={[
                styles.paymentOptionText,
                selectedPaymentMethod === 'bank_transfer' &&
                  styles.paymentOptionTextSelected,
              ]}
            >
              🏦 Bank Transfer
            </Text>
          </Pressable>

          {/* MIB Payment Option */}
          <Pressable
            style={[
              styles.paymentOption,
              selectedPaymentMethod === 'mib' && styles.paymentOptionSelected,
            ]}
            onPress={() => onPaymentMethodChange('mib')}
          >
            <Text
              style={[
                styles.paymentOptionText,
                selectedPaymentMethod === 'mib' &&
                  styles.paymentOptionTextSelected,
              ]}
            >
              💳 MIB Gateway
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Bank Account Details for Bank Transfers */}
      {selectedPaymentMethod === 'bank_transfer' && (
        <View style={styles.bankDetailsContainer}>
          <Text style={styles.bankDetailsTitle}>
            Bank Account Details {isRefund ? 'for Refund' : 'for Payment'}
          </Text>

          <View
            ref={ref => {
              if (inputRefs) inputRefs.current.accountNumber = ref;
            }}
          >
            <Input
              label='Account Number'
              placeholder="Enter client's bank account number"
              value={bankAccountDetails.accountNumber}
              onChangeText={text => {
                onBankDetailsChange({
                  ...bankAccountDetails,
                  accountNumber: text,
                });
                if (errors.accountNumber) onErrorClear('accountNumber');
              }}
              onFocus={() => onFocus?.('accountNumber')}
              error={errors.accountNumber}
              required
            />
          </View>

          <View
            ref={ref => {
              if (inputRefs) inputRefs.current.accountName = ref;
            }}
          >
            <Input
              label='Account Holder Name'
              placeholder='Enter account holder name'
              value={bankAccountDetails.accountName}
              onChangeText={text => {
                onBankDetailsChange({
                  ...bankAccountDetails,
                  accountName: text,
                });
                if (errors.accountName) onErrorClear('accountName');
              }}
              onFocus={() => onFocus?.('accountName')}
              error={errors.accountName}
              required
            />
          </View>

          <View
            ref={ref => {
              if (inputRefs) inputRefs.current.bankName = ref;
            }}
          >
            <Input
              label='Bank Name'
              placeholder='Enter bank name'
              value={bankAccountDetails.bankName}
              onChangeText={text => {
                onBankDetailsChange({ ...bankAccountDetails, bankName: text });
                if (errors.bankName) onErrorClear('bankName');
              }}
              onFocus={() => onFocus?.('bankName')}
              error={errors.bankName}
              required
            />
          </View>
        </View>
      )}

      <Text style={styles.fareNote}>
        {selectedPaymentMethod === 'mib'
          ? 'Payment will be processed securely through MIB Gateway'
          : isRefund
            ? 'Refund will be processed within 72 hours'
            : 'Additional payment will be required from client'}
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
  paymentOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentOption: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  paymentOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#f0f8ff',
  },
  paymentOptionText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  paymentOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  bankDetailsContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  bankDetailsTitle: {
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
