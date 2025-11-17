import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { AlertTriangle } from 'lucide-react-native';
import { useAgentStore } from '@/store/agent/agentStore';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Card from '@/components/Card';
import Colors from '@/constants/colors';
import { formatCurrency } from '@/utils/agentFormatters';
import { calculateRefundAmount } from '@/utils/paymentUtils';
import { useAlertContext } from '@/components/AlertProvider';
import { useBookingEligibility } from '@/hooks/useBookingEligibility';
import { formatBookingDate } from '@/utils/dateUtils';

interface BankDetails {
  accountNumber: string;
  accountName: string;
  bankName: string;
}

export default function AgentCancelBookingScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const router = useRouter();
  const { showSuccess, showError, showWarning } = useAlertContext();
  const { bookings, agentCancelBooking } = useAgentStore();

  const normalizedId = Array.isArray(id) ? id[0] : id;
  const booking =
    bookings.find(b => String(b.id) === String(normalizedId)) || null;

  const [reason, setReason] = useState('');
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    accountNumber: '',
    accountName: '',
    bankName: '',
  });
  const [errors, setErrors] = useState({
    reason: '',
    accountNumber: '',
    accountName: '',
    bankName: '',
  });
  const [isCancelling, setIsCancelling] = useState(false);

  const eligibilityBooking = booking
    ? {
        status: booking.status,
        departureDate: booking.departureDate,
      }
    : null;

  const { isCancellable, message: eligibilityMessage } = useBookingEligibility({
    booking: eligibilityBooking as any,
  });

  if (!booking) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>Booking not found</Text>
        <Button
          title='Go Back'
          onPress={() => router.back()}
          style={styles.notFoundButton}
        />
      </View>
    );
  }

  const totalAmount = Number(booking.totalAmount) || 0;
  const refundAmount = calculateRefundAmount(totalAmount);
  const isMibPayment = booking.payment?.method === 'mib';
  const requiresBankDetails = !isMibPayment;

  const validateForm = () => {
    let valid = true;
    const nextErrors = { ...errors };

    if (!reason.trim()) {
      nextErrors.reason = 'Please provide a reason for cancellation';
      valid = false;
    } else {
      nextErrors.reason = '';
    }

    if (requiresBankDetails) {
      if (!bankDetails.accountNumber.trim()) {
        nextErrors.accountNumber = 'Account number is required';
        valid = false;
      } else {
        nextErrors.accountNumber = '';
      }

      if (!bankDetails.accountName.trim()) {
        nextErrors.accountName = 'Account name is required';
        valid = false;
      } else {
        nextErrors.accountName = '';
      }

      if (!bankDetails.bankName.trim()) {
        nextErrors.bankName = 'Bank name is required';
        valid = false;
      } else {
        nextErrors.bankName = '';
      }
    } else {
      nextErrors.accountNumber = '';
      nextErrors.accountName = '';
      nextErrors.bankName = '';
    }

    setErrors(nextErrors);
    return valid;
  };

  const handleCancel = async () => {
    if (!isCancellable) {
      showWarning(
        'Cannot Cancel Booking',
        eligibilityMessage ||
          'Bookings can only be cancelled at least 48 hours before departure.'
      );
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setIsCancelling(true);

      const refundMethod = isMibPayment ? 'original_payment' : 'bank_transfer';

      await agentCancelBooking(booking.id, {
        reason,
        refundMethod,
        bankDetails: refundMethod === 'bank_transfer' ? bankDetails : undefined,
      });

      const successMessage = isMibPayment
        ? `Booking has been cancelled. A refund of ${formatCurrency(
            refundAmount
          )} will be processed to the original payment method within 3-5 business days.`
        : `Booking has been cancelled. A refund of ${formatCurrency(
            refundAmount
          )} will be processed to the provided bank account within 5-7 business days.`;

      showSuccess('Booking Cancelled', successMessage, () => router.back());
    } catch (error) {
      console.error('Cancellation error:', error);
      showError(
        'Cancellation Failed',
        error instanceof Error
          ? error.message
          : 'Unable to cancel booking. Please try again.'
      );
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Cancel Booking',
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 80}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps='handled'
          showsVerticalScrollIndicator={false}
        >
          <Card variant='outlined' style={styles.warningCard}>
            <View style={styles.warningHeader}>
              <AlertTriangle size={20} color={Colors.warning} />
              <Text style={styles.warningTitle}>Cancellation Policy</Text>
            </View>
            <Text style={styles.warningText}>
              • Only 50% of the fare will be refunded{'\n'}• Refunds must be
              requested at least 48 hours before departure{'\n'}• Processing
              time: {isMibPayment ? '3-5' : '5-7'} business days{'\n'}• This
              action cannot be undone
            </Text>
          </Card>

          <Card variant='elevated' style={styles.summaryCard}>
            <Text style={styles.cardTitle}>Booking Summary</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Booking Number</Text>
              <Text style={styles.detailValue}>
                {booking.bookingNumber || booking.id}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Route</Text>
              <Text style={styles.detailValue}>
                {booking.origin} → {booking.destination}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Departure Date</Text>
              <Text style={styles.detailValue}>
                {booking.departureDate
                  ? formatBookingDate(booking.departureDate)
                  : '-'}
              </Text>
            </View>
            <View style={[styles.detailRow, styles.refundRow]}>
              <Text style={styles.detailLabel}>Refund Amount (50%)</Text>
              <Text style={[styles.detailValue, styles.refundValue]}>
                {formatCurrency(refundAmount)}
              </Text>
            </View>
          </Card>

          <Card variant='elevated' style={styles.formCard}>
            <Text style={styles.cardTitle}>Cancellation Details</Text>
            <Input
              label='Reason for Cancellation'
              placeholder='Explain why this booking is being cancelled'
              value={reason}
              onChangeText={text => {
                setReason(text);
                if (errors.reason) {
                  setErrors(prev => ({ ...prev, reason: '' }));
                }
              }}
              multiline
              numberOfLines={3}
              error={errors.reason}
              required
            />

            <Text style={[styles.cardTitle, { marginTop: 24 }]}>
              {isMibPayment
                ? 'Refund Bank Details (Backup)'
                : 'Refund Bank Details'}
            </Text>
            {isMibPayment && (
              <Text style={styles.infoText}>
                Refunds for MIB payments are returned to the original payment
                method automatically. Bank details are collected as a backup
                option.
              </Text>
            )}

            <Input
              label='Account Number'
              placeholder='Enter account number'
              value={bankDetails.accountNumber}
              onChangeText={text => {
                setBankDetails(prev => ({ ...prev, accountNumber: text }));
                if (errors.accountNumber) {
                  setErrors(prev => ({ ...prev, accountNumber: '' }));
                }
              }}
              error={errors.accountNumber}
              required={requiresBankDetails}
            />
            <Input
              label='Account Name'
              placeholder='Enter account holder name'
              value={bankDetails.accountName}
              onChangeText={text => {
                setBankDetails(prev => ({ ...prev, accountName: text }));
                if (errors.accountName) {
                  setErrors(prev => ({ ...prev, accountName: '' }));
                }
              }}
              error={errors.accountName}
              required={requiresBankDetails}
            />
            <Input
              label='Bank Name'
              placeholder='Enter bank name'
              value={bankDetails.bankName}
              onChangeText={text => {
                setBankDetails(prev => ({ ...prev, bankName: text }));
                if (errors.bankName) {
                  setErrors(prev => ({ ...prev, bankName: '' }));
                }
              }}
              error={errors.bankName}
              required={requiresBankDetails}
            />
          </Card>

          <View style={styles.buttonRow}>
            <Button
              title='Go Back'
              variant='outline'
              onPress={() => router.back()}
              style={styles.backButton}
            />
            <Button
              title='Confirm Cancellation'
              onPress={handleCancel}
              loading={isCancelling}
              disabled={isCancelling}
              style={styles.cancelButton}
              textStyle={styles.cancelButtonText}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  warningCard: {
    marginBottom: 16,
    borderColor: Colors.warning,
    backgroundColor: '#fff8e1',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.warning,
  },
  warningText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  summaryCard: {
    marginBottom: 16,
  },
  formCard: {
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  refundRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 4,
  },
  refundValue: {
    color: Colors.success,
  },
  infoText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.error,
  },
  cancelButtonText: {
    color: '#fff',
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notFoundText: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  notFoundButton: {
    minWidth: 120,
  },
});
